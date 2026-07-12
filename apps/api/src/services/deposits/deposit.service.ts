import { randomBytes } from 'node:crypto';

import { Prisma } from '../../generated/prisma/client.js';
import { DepositRepository } from '../../data/repositories/deposit.repository.js';
import { withTransaction } from '../../data/prisma/transaction.js';
import {
  assertBranchAccess,
  type BranchScopedUser,
} from '../authorization/branch-access.js';
import { AppError } from '../../shared/app-error.js';
import type {
  confirmCustomerRulesSchema,
  createDepositSchema,
  listDepositsSchema,
  recordPaymentSchema,
  reasonSchema,
  scheduleCheckInSchema,
} from '../../presentation/validators/deposit.validator.js';
import type { z } from 'zod';

type CreateInput = z.infer<typeof createDepositSchema>;
type ConfirmRulesInput = z.infer<typeof confirmCustomerRulesSchema>;
type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
type ReasonInput = z.infer<typeof reasonSchema>;
type ScheduleCheckInInput = z.infer<typeof scheduleCheckInSchema>;
type ListInput = z.infer<typeof listDepositsSchema>;

const DEPOSIT_MONTHS = 2;
const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export class DepositService {
  constructor(private readonly repository = new DepositRepository()) {}

  async list(user: BranchScopedUser, input: ListInput) {
    const branchId = this.getBranchId(user);
    const where: Prisma.DepositWhereInput = {
      rentalRequest: { branchId },
      ...(input.status ? { status: input.status } : {}),
      ...(input.depositCode
        ? { id: { contains: input.depositCode, mode: 'insensitive' } }
        : {}),
      ...(input.customerName
        ? {
            rentalRequest: {
              branchId,
              representative: {
                is: {
                  OR: [
                    {
                      fullName: {
                        contains: input.customerName,
                        mode: 'insensitive',
                      },
                    },
                    {
                      organizationName: {
                        contains: input.customerName,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            },
          }
        : {}),
      ...(input.fromDate || input.toDate
        ? {
            createdAt: {
              ...(input.fromDate ? { gte: new Date(input.fromDate) } : {}),
              ...(input.toDate
                ? { lte: new Date(`${input.toDate}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
    };
    const [items, totalItems] = await this.repository.findMany(
      where,
      input.page,
      input.pageSize,
    );
    return {
      items: items.map((deposit) => this.serialize(deposit, user.role)),
      totalItems,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async get(user: BranchScopedUser, id: string) {
    const deposit = await this.getAccessibleDeposit(user, id);
    return this.serialize(deposit, user.role);
  }

  async createFromViewing(
    user: BranchScopedUser,
    viewingId: string,
    input: CreateInput,
  ) {
    this.requireRole(user, 'SALE');
    return withTransaction(async (tx) => {
      const viewing = await this.repository.findViewingForDeposit(viewingId, tx);
      if (!viewing)
        throw new AppError(404, 'NOT_FOUND', 'Viewing was not found.');
      assertBranchAccess(user, viewing.rentalRequest.branchId);
      if (
        viewing.status !== 'RESULT_RECORDED' ||
        viewing.finalResult !== 'CUSTOMER_WANTS_DEPOSIT'
      ) {
        throw new AppError(
          422,
          'VIEWING_NOT_READY_FOR_DEPOSIT',
          'A deposit can only be created from a viewing where the customer chose to deposit.',
        );
      }
      const active = await this.repository.countActiveForRequest(
        viewing.rentalRequest.id,
        tx,
      );
      if (active > 0) {
        throw new AppError(
          409,
          'ACTIVE_DEPOSIT_EXISTS',
          'An active deposit already exists for this rental request.',
        );
      }

      const bedIds = [...new Set(input.selectedBedIds)];
      const beds = await this.repository.findBedsWithAllocations(bedIds, tx);
      if (beds.length !== bedIds.length) {
        throw new AppError(422, 'BED_NOT_FOUND', 'One or more beds do not exist.');
      }
      for (const bed of beds) {
        if (bed.room.branchId !== viewing.rentalRequest.branchId) {
          throw new AppError(
            422,
            'BED_NOT_IN_BRANCH',
            'Beds must belong to your branch.',
          );
        }
        if (bed.operationalStatus !== 'ACTIVE') {
          throw new AppError(
            422,
            'BED_NOT_AVAILABLE',
            `Bed ${bed.name} is not operational.`,
          );
        }
        if (bed.allocations.length > 0) {
          throw new AppError(
            409,
            'BED_ALREADY_ALLOCATED',
            `Bed ${bed.name} is already allocated.`,
          );
        }
      }

      const roomIds = [...new Set(beds.map((bed) => bed.roomId))];
      const interestedRoomIds = new Set(
        viewing.details
          .filter((detail) => detail.customerInterested)
          .map((detail) => detail.roomId),
      );
      for (const roomId of roomIds) {
        if (!interestedRoomIds.has(roomId)) {
          throw new AppError(
            422,
            'BED_NOT_IN_SELECTED_ROOM',
            'Beds must belong to a room the customer selected.',
          );
        }
      }

      if (viewing.rentalRequest.rentalMode === 'WHOLE_ROOM') {
        for (const roomId of roomIds) {
          const roomBeds = await this.repository.findRoomBedIds(roomId, tx);
          const selectedInRoom = new Set(
            beds.filter((bed) => bed.roomId === roomId).map((bed) => bed.id),
          );
          if (
            roomBeds.length !== selectedInRoom.size ||
            !roomBeds.every((bed) => selectedInRoom.has(bed.id))
          ) {
            throw new AppError(
              422,
              'WHOLE_ROOM_REQUIRES_ALL_BEDS',
              'Whole-room rental must include every bed in the room.',
            );
          }
        }
      }

      const details = beds.map((bed) => {
        const rent = new Prisma.Decimal(bed.monthlyRent);
        return {
          bedId: bed.id,
          monthlyRentSnapshot: rent,
          depositMonths: DEPOSIT_MONTHS,
          depositAmount: rent.mul(DEPOSIT_MONTHS),
        };
      });
      const total = details.reduce(
        (sum, detail) => sum.add(detail.depositAmount),
        new Prisma.Decimal(0),
      );

      const deposit = await this.repository.createDeposit(
        {
          id: this.createId('DEP'),
          rentalRequestId: viewing.rentalRequest.id,
          saleEmployeeId: user.id,
          createdAt: new Date(),
          rentalModeSnapshot: viewing.rentalRequest.rentalMode,
          totalDepositAmount: total,
          status: 'DRAFT',
        },
        details,
        tx,
      );
      return this.serialize(deposit, user.role);
    });
  }

  async confirmCustomerRules(
    user: BranchScopedUser,
    id: string,
    input: ConfirmRulesInput,
  ) {
    this.requireRole(user, 'SALE');
    return this.mutate(user, id, ['DRAFT'], (tx) =>
      this.repository.updateDeposit(
        id,
        {
          customerAgreedToRules: true,
          customerAgreedAt: input.confirmedAt
            ? new Date(input.confirmedAt)
            : new Date(),
          note: input.note ?? undefined,
        },
        tx,
      ),
    );
  }

  async submitRoomCheck(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'SALE');
    return this.mutate(user, id, ['DRAFT'], (tx, deposit) => {
      if (!deposit.customerAgreedToRules) {
        throw new AppError(
          422,
          'CUSTOMER_RULES_NOT_CONFIRMED',
          'Confirm that the customer agreed to the rules first.',
        );
      }
      return this.repository.updateDeposit(
        id,
        { status: 'WAITING_ROOM_CHECK' },
        tx,
      );
    });
  }

  async approveRoom(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(user, id, ['WAITING_ROOM_CHECK'], async (tx, deposit) => {
      await this.assertBedsAvailable(deposit, tx);
      return this.repository.updateDeposit(
        id,
        {
          status: 'ROOM_APPROVED',
          roomConfirmedById: user.id,
          roomConfirmedAt: new Date(),
          roomRejectionReason: null,
        },
        tx,
      );
    });
  }

  async rejectRoom(user: BranchScopedUser, id: string, input: ReasonInput) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(user, id, ['WAITING_ROOM_CHECK'], (tx) =>
      this.repository.updateDeposit(
        id,
        {
          status: 'ROOM_REJECTED',
          roomConfirmedById: user.id,
          roomConfirmedAt: new Date(),
          roomRejectionReason: input.reason,
        },
        tx,
      ),
    );
  }

  async issuePaymentRequest(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(user, id, ['ROOM_APPROVED'], async (tx, deposit) => {
      const beds = await this.assertBedsAvailable(deposit, tx);
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + PAYMENT_WINDOW_MS);
      const total = new Prisma.Decimal(deposit.totalDepositAmount);

      await this.repository.createPayment(
        {
          id: this.createId('PAY'),
          paymentType: 'DEPOSIT',
          direction: 'INBOUND',
          amountDue: total,
          issuedAt,
          expiresAt,
          recordedById: user.id,
          depositId: deposit.id,
          status: 'WAITING_PAYMENT',
        },
        tx,
      );
      for (const bed of beds) {
        await this.repository.createAllocation(
          {
            id: this.createId('ALC'),
            bedId: bed.id,
            depositId: deposit.id,
            allocationType: 'HELD',
            status: 'ACTIVE',
            startedAt: issuedAt,
            expiresAt,
          },
          tx,
        );
      }
      return this.repository.updateDeposit(
        id,
        { status: 'WAITING_PAYMENT' },
        tx,
      );
    });
  }

  async recordPayment(
    user: BranchScopedUser,
    id: string,
    input: RecordPaymentInput,
  ) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(
      user,
      id,
      ['WAITING_PAYMENT', 'PAYMENT_RECHECK'],
      async (tx, deposit) => {
        const payment = await this.repository.findDepositPayment(id, tx);
        if (!payment || !payment.expiresAt) {
          throw new AppError(
            422,
            'PAYMENT_REQUEST_MISSING',
            'No payment request has been issued.',
          );
        }
        const now = new Date();
        const paidAt = new Date(input.paidAt);
        if (deposit.status === 'WAITING_PAYMENT' && now > payment.expiresAt) {
          throw new AppError(
            422,
            'DEPOSIT_PAYMENT_EXPIRED',
            'The deposit payment request has expired.',
          );
        }
        if (paidAt > payment.expiresAt) {
          throw new AppError(
            422,
            'PAYMENT_AFTER_DEADLINE',
            'The payment time is after the deadline.',
          );
        }
        if (!input.externalEvidenceChecked) {
          throw new AppError(
            422,
            'EVIDENCE_NOT_CHECKED',
            'External evidence must be checked before recording the payment.',
          );
        }
        if (!new Prisma.Decimal(input.amount).equals(payment.amountDue)) {
          throw new AppError(
            422,
            'PAYMENT_AMOUNT_MISMATCH',
            'The recorded amount must equal the amount due.',
          );
        }
        await this.repository.updatePayment(
          payment.id,
          {
            amountPaid: new Prisma.Decimal(input.amount),
            paidAt,
            method: input.method,
            transactionReference: input.transactionReference ?? null,
            receiptNumber: input.receiptNumber ?? null,
            externalEvidenceChecked: input.externalEvidenceChecked,
            recordedById: user.id,
            rejectionReason: null,
            status: 'WAITING_MANAGER_CONFIRMATION',
            note: input.note ?? null,
          },
          tx,
        );
        return this.repository.updateDeposit(
          id,
          { status: 'WAITING_MANAGER_CONFIRMATION' },
          tx,
        );
      },
    );
  }

  async approvePayment(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(
      user,
      id,
      ['WAITING_MANAGER_CONFIRMATION'],
      async (tx) => {
        const payment = await this.repository.findDepositPayment(id, tx);
        if (!payment || !payment.expiresAt || !payment.paidAt) {
          throw new AppError(
            422,
            'PAYMENT_NOT_RECORDED',
            'The payment has not been recorded yet.',
          );
        }
        if (payment.paidAt > payment.expiresAt) {
          throw new AppError(
            422,
            'PAYMENT_AFTER_DEADLINE',
            'The payment was made after the deadline.',
          );
        }
        if (
          !payment.amountPaid ||
          !new Prisma.Decimal(payment.amountPaid).equals(payment.amountDue)
        ) {
          throw new AppError(
            422,
            'PAYMENT_AMOUNT_MISMATCH',
            'The recorded amount does not match the amount due.',
          );
        }
        await this.repository.updatePayment(
          payment.id,
          {
            status: 'CONFIRMED',
            confirmedById: user.id,
            confirmedAt: new Date(),
          },
          tx,
        );
        await this.repository.promoteHeldAllocations(id, tx);
        return this.repository.updateDeposit(id, { status: 'DEPOSITED' }, tx);
      },
    );
  }

  async requestPaymentRecheck(
    user: BranchScopedUser,
    id: string,
    input: ReasonInput,
  ) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(
      user,
      id,
      ['WAITING_MANAGER_CONFIRMATION'],
      async (tx) => {
        const payment = await this.repository.findDepositPayment(id, tx);
        if (payment) {
          await this.repository.updatePayment(
            payment.id,
            { status: 'PAYMENT_RECHECK', rejectionReason: input.reason },
            tx,
          );
        }
        return this.repository.updateDeposit(
          id,
          { status: 'PAYMENT_RECHECK' },
          tx,
        );
      },
    );
  }

  async rejectPayment(user: BranchScopedUser, id: string, input: ReasonInput) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(
      user,
      id,
      ['WAITING_MANAGER_CONFIRMATION'],
      async (tx) => {
        const payment = await this.repository.findDepositPayment(id, tx);
        if (payment) {
          await this.repository.updatePayment(
            payment.id,
            { status: 'PAYMENT_REJECTED', rejectionReason: input.reason },
            tx,
          );
        }
        await this.repository.endActiveAllocationsByDeposit(id, new Date(), tx);
        return this.repository.updateDeposit(
          id,
          { status: 'PAYMENT_REJECTED' },
          tx,
        );
      },
    );
  }

  async scheduleCheckIn(
    user: BranchScopedUser,
    id: string,
    input: ScheduleCheckInInput,
  ) {
    this.requireRole(user, 'SALE');
    return this.mutate(user, id, ['DEPOSITED'], (tx) =>
      this.repository.updateDeposit(
        id,
        {
          scheduledCheckInAt: new Date(input.checkInAt),
          note: input.note ?? undefined,
        },
        tx,
      ),
    );
  }

  async cancel(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'SALE');
    return this.mutate(
      user,
      id,
      ['DRAFT', 'ROOM_APPROVED', 'WAITING_PAYMENT'],
      async (tx) => {
        const payment = await this.repository.findDepositPayment(id, tx);
        if (payment && payment.status === 'WAITING_PAYMENT') {
          await this.repository.updatePayment(
            payment.id,
            { status: 'CANCELLED' },
            tx,
          );
        }
        await this.repository.endActiveAllocationsByDeposit(id, new Date(), tx);
        return this.repository.updateDeposit(id, { status: 'CANCELLED' }, tx);
      },
    );
  }

  private async assertBedsAvailable(
    deposit: NonNullable<Awaited<ReturnType<DepositRepository['findById']>>>,
    tx: Parameters<DepositRepository['findBedsWithAllocations']>[1],
  ) {
    const bedIds = deposit.details.map((detail) => detail.bedId);
    const beds = await this.repository.findBedsWithAllocations(bedIds, tx);
    for (const bed of beds) {
      if (bed.operationalStatus !== 'ACTIVE') {
        throw new AppError(
          422,
          'BED_NOT_AVAILABLE',
          `Bed ${bed.name} is no longer operational.`,
        );
      }
      // No HELD allocation exists for this deposit before issue-payment-request,
      // so any active allocation belongs to another deposit and blocks progress.
      if (bed.allocations.length > 0) {
        throw new AppError(
          409,
          'BED_ALREADY_ALLOCATED',
          `Bed ${bed.name} is already allocated to another deposit.`,
        );
      }
    }
    return beds;
  }

  private async mutate(
    user: BranchScopedUser,
    id: string,
    from: string[],
    action: (
      tx: Parameters<DepositRepository['updateDeposit']>[2],
      deposit: NonNullable<Awaited<ReturnType<DepositRepository['findById']>>>,
    ) => Promise<unknown>,
  ) {
    return withTransaction(async (tx) => {
      const deposit = await this.repository.findById(id, tx);
      if (!deposit)
        throw new AppError(404, 'NOT_FOUND', 'Deposit was not found.');
      assertBranchAccess(user, deposit.rentalRequest.branchId);
      if (!from.includes(deposit.status)) {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          `This action is not allowed from status ${deposit.status}.`,
        );
      }
      await action(tx, deposit);
      const updated = await this.repository.findById(id, tx);
      return this.serialize(updated!, user.role);
    });
  }

  private async getAccessibleDeposit(user: BranchScopedUser, id: string) {
    const deposit = await this.repository.findById(id);
    if (!deposit)
      throw new AppError(404, 'NOT_FOUND', 'Deposit was not found.');
    this.getBranchId(user);
    assertBranchAccess(user, deposit.rentalRequest.branchId);
    return deposit;
  }

  private getBranchId(user: BranchScopedUser): string {
    if (!['SALE', 'ACCOUNTANT', 'MANAGER'].includes(user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You cannot access deposits.');
    }
    if (!user.branchId) {
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'You must belong to a branch.',
      );
    }
    return user.branchId;
  }

  private requireRole(user: BranchScopedUser, role: string) {
    this.getBranchId(user);
    if (user.role !== role) {
      throw new AppError(
        403,
        'FORBIDDEN',
        `Only ${role} can perform this action.`,
      );
    }
  }

  private serialize(
    deposit: NonNullable<Awaited<ReturnType<DepositRepository['findById']>>>,
    role: string,
  ) {
    const payment = deposit.payments.find(
      (item) => item.paymentType === 'DEPOSIT',
    );
    return {
      id: deposit.id,
      status: deposit.status,
      rentalRequestId: deposit.rentalRequestId,
      rentalModeSnapshot: deposit.rentalModeSnapshot,
      branch: deposit.rentalRequest.branch,
      customer: deposit.rentalRequest.representative,
      saleEmployee: deposit.saleEmployee,
      roomConfirmedBy: deposit.roomConfirmedBy,
      customerAgreedToRules: deposit.customerAgreedToRules,
      customerAgreedAt: deposit.customerAgreedAt,
      roomRejectionReason: deposit.roomRejectionReason,
      totalDepositAmount: deposit.totalDepositAmount.toFixed(2),
      scheduledCheckInAt: deposit.scheduledCheckInAt,
      note: deposit.note,
      createdAt: deposit.createdAt,
      details: deposit.details.map((detail) => ({
        bedId: detail.bedId,
        bedName: detail.bed.name,
        roomId: detail.bed.roomId,
        roomName: detail.bed.room.name,
        monthlyRentSnapshot: detail.monthlyRentSnapshot.toFixed(2),
        depositMonths: detail.depositMonths,
        depositAmount: detail.depositAmount.toFixed(2),
      })),
      payment: payment
        ? {
            id: payment.id,
            amountDue: payment.amountDue.toFixed(2),
            amountPaid: payment.amountPaid
              ? payment.amountPaid.toFixed(2)
              : null,
            issuedAt: payment.issuedAt,
            expiresAt: payment.expiresAt,
            paidAt: payment.paidAt,
            method: payment.method,
            transactionReference: payment.transactionReference,
            receiptNumber: payment.receiptNumber,
            externalEvidenceChecked: payment.externalEvidenceChecked,
            status: payment.status,
            rejectionReason: payment.rejectionReason,
          }
        : null,
      allocations: deposit.allocations.map((allocation) => ({
        id: allocation.id,
        bedId: allocation.bedId,
        allocationType: allocation.allocationType,
        status: allocation.status,
        expiresAt: allocation.expiresAt,
      })),
      availableActions: this.availableActions(deposit.status, role),
    };
  }

  private availableActions(status: string, role: string): string[] {
    const map: Record<string, Record<string, string[]>> = {
      DRAFT: {
        SALE: ['confirm-customer-rules', 'submit-room-check', 'cancel'],
      },
      WAITING_ROOM_CHECK: { MANAGER: ['approve-room', 'reject-room'] },
      ROOM_APPROVED: {
        ACCOUNTANT: ['issue-payment-request'],
        SALE: ['cancel'],
      },
      WAITING_PAYMENT: {
        ACCOUNTANT: ['record-payment'],
        SALE: ['cancel'],
      },
      WAITING_MANAGER_CONFIRMATION: {
        MANAGER: ['approve-payment', 'request-payment-recheck', 'reject-payment'],
      },
      PAYMENT_RECHECK: { ACCOUNTANT: ['record-payment'] },
      DEPOSITED: { SALE: ['schedule-check-in'] },
    };
    return map[status]?.[role] ?? [];
  }

  private createId(prefix: string): string {
    return `${prefix}-${randomBytes(8).toString('hex')}`;
  }
}
