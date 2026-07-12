import { randomBytes } from 'node:crypto';

import { Prisma } from '../../generated/prisma/client.js';
import { ContractRepository } from '../../data/repositories/contract.repository.js';
import { withTransaction } from '../../data/prisma/transaction.js';
import {
  assertBranchAccess,
  type BranchScopedUser,
} from '../authorization/branch-access.js';
import { AppError } from '../../shared/app-error.js';
import type {
  confirmArrivalSchema,
  createInitialPaymentSchema,
  listContractsSchema,
  recordInitialPaymentSchema,
  recordPaperContractSchema,
  rejectResidentSchema,
  residentsSchema,
} from '../../presentation/validators/contract.validator.js';
import type { z } from 'zod';

type ConfirmArrivalInput = z.infer<typeof confirmArrivalSchema>;
type ResidentsInput = z.infer<typeof residentsSchema>;
type RejectResidentInput = z.infer<typeof rejectResidentSchema>;
type RecordPaperContractInput = z.infer<typeof recordPaperContractSchema>;
type CreateInitialPaymentInput = z.infer<typeof createInitialPaymentSchema>;
type RecordInitialPaymentInput = z.infer<typeof recordInitialPaymentSchema>;
type ListInput = z.infer<typeof listContractsSchema>;

type ContractRecord = NonNullable<
  Awaited<ReturnType<ContractRepository['findById']>>
>;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export class ContractService {
  constructor(private readonly repository = new ContractRepository()) {}

  async list(user: BranchScopedUser, input: ListInput) {
    const branchId = this.getBranchId(user);
    const where: Prisma.ContractWhereInput = {
      deposit: { rentalRequest: { branchId } },
      ...(input.status ? { status: input.status as never } : {}),
      ...(input.customerName
        ? {
            deposit: {
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
      items: items.map((contract) => this.serialize(contract, user.role)),
      totalItems,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async get(user: BranchScopedUser, id: string) {
    const contract = await this.repository.findById(id);
    if (!contract)
      throw new AppError(404, 'NOT_FOUND', 'Contract was not found.');
    this.getBranchId(user);
    assertBranchAccess(user, contract.deposit.rentalRequest.branchId);
    return this.serialize(contract, user.role);
  }

  async createFromDeposit(user: BranchScopedUser, depositId: string) {
    this.requireRole(user, 'SALE');
    return withTransaction(async (tx) => {
      const deposit = await this.repository.findDepositForContract(
        depositId,
        tx,
      );
      if (!deposit)
        throw new AppError(404, 'NOT_FOUND', 'Deposit was not found.');
      assertBranchAccess(user, deposit.rentalRequest.branchId);
      if (deposit.status !== 'DEPOSITED') {
        throw new AppError(
          422,
          'DEPOSIT_NOT_CONFIRMED',
          'A contract can only be created from a confirmed deposit.',
        );
      }
      const existing = await this.repository.findByDepositId(depositId, tx);
      if (existing) {
        throw new AppError(
          409,
          'CONTRACT_ALREADY_EXISTS',
          'A contract already exists for this deposit.',
        );
      }
      const startsOn = deposit.scheduledCheckInAt
        ? new Date(deposit.scheduledCheckInAt)
        : new Date(deposit.rentalRequest.expectedCheckInDate);
      const endsOn = addMonths(
        startsOn,
        deposit.rentalRequest.rentalDurationMonths,
      );
      const totalMonthlyRent = deposit.details.reduce(
        (sum, detail) =>
          sum.add(new Prisma.Decimal(detail.monthlyRentSnapshot)),
        new Prisma.Decimal(0),
      );
      const contract = await this.repository.createContract(
        {
          id: this.createId('CTR'),
          depositId,
          saleEmployeeId: user.id,
          startsOn,
          endsOn,
          totalMonthlyRent,
          status: 'CHECKIN_DRAFT',
        },
        tx,
      );
      return this.serialize(contract, user.role);
    });
  }

  async confirmArrival(
    user: BranchScopedUser,
    id: string,
    input: ConfirmArrivalInput,
  ) {
    this.requireRole(user, 'SALE');
    return this.mutate(user, id, ['CHECKIN_DRAFT'], (tx) =>
      this.repository.updateContract(
        id,
        {
          status: 'ARRIVED',
          customerArrived: true,
          customerArrivedAt: input.arrivedAt
            ? new Date(input.arrivedAt)
            : new Date(),
        },
        tx,
      ),
    );
  }

  async updateResidents(
    user: BranchScopedUser,
    id: string,
    input: ResidentsInput,
  ) {
    this.requireRole(user, 'SALE');
    return this.mutate(user, id, ['ARRIVED'], async (tx, contract) => {
      const depositedBedIds = new Set(
        contract.deposit.details.map((detail) => detail.bedId),
      );
      if (input.residents.length > depositedBedIds.size) {
        throw new AppError(
          422,
          'TOO_MANY_RESIDENTS',
          'The number of residents cannot exceed the deposited beds.',
        );
      }
      const usedBeds = new Set<string>();
      const memberIds = new Set(
        contract.deposit.rentalRequest.members.map(
          (member) => member.customerId,
        ),
      );
      for (const resident of input.residents) {
        if (!memberIds.has(resident.customerId)) {
          throw new AppError(
            422,
            'RESIDENT_NOT_MEMBER',
            'A resident must be a member of the rental request.',
          );
        }
        if (!depositedBedIds.has(resident.bedId)) {
          throw new AppError(
            422,
            'BED_NOT_DEPOSITED',
            'Residents can only be assigned to deposited beds.',
          );
        }
        if (usedBeds.has(resident.bedId)) {
          throw new AppError(
            422,
            'BED_ASSIGNED_TWICE',
            'A bed cannot be assigned to two residents.',
          );
        }
        usedBeds.add(resident.bedId);
      }
      const assigned = new Map(
        input.residents.map((resident) => [resident.customerId, resident]),
      );
      for (const member of contract.deposit.rentalRequest.members) {
        const resident = assigned.get(member.customerId);
        await this.repository.updateMember(
          contract.deposit.rentalRequest.id,
          member.customerId,
          resident
            ? {
                plannedBedId: resident.bedId,
                identityChecked: resident.identityChecked,
              }
            : { plannedBedId: null },
          tx,
        );
      }
      return this.repository.updateContract(id, {}, tx);
    });
  }

  async submitEligibilityReview(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'SALE');
    return this.mutate(user, id, ['ARRIVED'], (tx, contract) => {
      const assigned = contract.deposit.rentalRequest.members.filter(
        (member) => member.plannedBedId,
      );
      if (assigned.length === 0) {
        throw new AppError(
          422,
          'NO_RESIDENTS_ASSIGNED',
          'Assign at least one resident before requesting review.',
        );
      }
      if (assigned.some((member) => !member.identityChecked)) {
        throw new AppError(
          422,
          'IDENTITY_NOT_CHECKED',
          'All residents must have their identity documents checked.',
        );
      }
      return this.repository.updateContract(
        id,
        { status: 'WAITING_ELIGIBILITY' },
        tx,
      );
    });
  }

  async approveResident(
    user: BranchScopedUser,
    id: string,
    customerId: string,
  ) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(
      user,
      id,
      ['WAITING_ELIGIBILITY'],
      async (tx, contract) => {
        await this.reviewResident(
          contract,
          customerId,
          'ELIGIBLE',
          null,
          user.id,
          tx,
        );
        return this.repository.updateContract(id, {}, tx);
      },
    );
  }

  async rejectResident(
    user: BranchScopedUser,
    id: string,
    customerId: string,
    input: RejectResidentInput,
  ) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(
      user,
      id,
      ['WAITING_ELIGIBILITY'],
      async (tx, contract) => {
        await this.reviewResident(
          contract,
          customerId,
          'INELIGIBLE',
          input.reason,
          user.id,
          tx,
        );
        return this.repository.updateContract(id, {}, tx);
      },
    );
  }

  async approveEligibility(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(user, id, ['WAITING_ELIGIBILITY'], (tx, contract) => {
      const assigned = contract.deposit.rentalRequest.members.filter(
        (member) => member.plannedBedId,
      );
      if (
        assigned.some((member) => member.eligibilityResult === 'NOT_REVIEWED')
      ) {
        throw new AppError(
          422,
          'RESIDENTS_NOT_REVIEWED',
          'Review every assigned resident before approving eligibility.',
        );
      }
      const eligible = assigned.filter(
        (member) => member.eligibilityResult === 'ELIGIBLE',
      );
      if (eligible.length === 0) {
        throw new AppError(
          422,
          'NO_ELIGIBLE_RESIDENT',
          'At least one resident must be eligible.',
        );
      }
      const depositedBeds = contract.deposit.details.length;
      if (eligible.length > depositedBeds) {
        throw new AppError(
          422,
          'TOO_MANY_ELIGIBLE_RESIDENTS',
          'Eligible residents cannot exceed the deposited beds.',
        );
      }
      return this.repository.updateContract(
        id,
        { status: 'ELIGIBILITY_APPROVED' },
        tx,
      );
    });
  }

  async stopCheckIn(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(user, id, ['WAITING_ELIGIBILITY'], (tx) =>
      this.repository.updateContract(id, { status: 'CHECKIN_STOPPED' }, tx),
    );
  }

  async recordPaperContract(
    user: BranchScopedUser,
    id: string,
    input: RecordPaperContractInput,
  ) {
    this.requireRole(user, 'SALE');
    return this.mutate(
      user,
      id,
      ['ELIGIBILITY_APPROVED', 'PAPER_SIGNED'],
      async (tx, contract) => {
        const eligible = contract.deposit.rentalRequest.members.filter(
          (member) =>
            member.plannedBedId && member.eligibilityResult === 'ELIGIBLE',
        );
        const bedToResident = new Map(
          eligible.map((member) => [member.plannedBedId!, member.customerId]),
        );
        if (input.services && input.services.length) {
          const ids = input.services.map((service) => service.serviceId);
          if (new Set(ids).size !== ids.length) {
            throw new AppError(
              422,
              'DUPLICATE_SERVICE',
              'Duplicate services are not allowed.',
            );
          }
          const found = await this.repository.findServicesByIds(ids, tx);
          if (found.length !== ids.length) {
            throw new AppError(
              422,
              'SERVICE_NOT_FOUND',
              'One or more services do not exist.',
            );
          }
        }
        await this.repository.deleteContractBeds(id, tx);
        await this.repository.createContractBeds(
          contract.deposit.details.map((detail) => ({
            contractId: id,
            bedId: detail.bedId,
            residentCustomerId: bedToResident.get(detail.bedId) ?? null,
            monthlyRentSnapshot: new Prisma.Decimal(detail.monthlyRentSnapshot),
            status: 'ACTIVE',
          })),
          tx,
        );
        await this.repository.replaceContractServices(
          id,
          (input.services ?? []).map((service) => ({
            contractId: id,
            serviceId: service.serviceId,
            unitPriceSnapshot: new Prisma.Decimal(service.price),
            calculationMethod: service.calculationMethod ?? null,
            note: service.note ?? null,
          })),
          tx,
        );
        const totalMonthlyRent = contract.deposit.details.reduce(
          (sum, detail) =>
            sum.add(new Prisma.Decimal(detail.monthlyRentSnapshot)),
          new Prisma.Decimal(0),
        );
        return this.repository.updateContract(
          id,
          {
            paperContractNumber: input.paperContractNumber,
            signedDate: new Date(input.signedDate),
            startsOn: new Date(input.startDate),
            endsOn: new Date(input.endDate),
            paymentCycle: input.paymentCycle ?? null,
            specialTerms: input.specialTerms ?? null,
            totalMonthlyRent,
          },
          tx,
        );
      },
    );
  }

  async confirmPaperSigning(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'SALE');
    return this.mutate(
      user,
      id,
      ['ELIGIBILITY_APPROVED', 'PAPER_SIGNED'],
      (tx, contract) => {
        if (!contract.paperContractNumber) {
          throw new AppError(
            422,
            'PAPER_CONTRACT_NOT_RECORDED',
            'Record the paper contract details before confirming the signature.',
          );
        }
        return this.repository.updateContract(
          id,
          {
            paperContractSigned: true,
            paperSigningConfirmedAt: new Date(),
            status: 'PAPER_SIGNED',
          },
          tx,
        );
      },
    );
  }

  async createInitialPayment(
    user: BranchScopedUser,
    id: string,
    input: CreateInitialPaymentInput,
  ) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(user, id, ['PAPER_SIGNED'], async (tx, contract) => {
      if (!contract.paperContractSigned) {
        throw new AppError(
          422,
          'PAPER_CONTRACT_NOT_SIGNED',
          'The paper contract must be signed before creating the initial payment.',
        );
      }
      const items = input.items.map((item) => {
        const amount = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
        return { ...item, amount };
      });
      const total = items.reduce(
        (sum, item) => sum.add(item.amount),
        new Prisma.Decimal(0),
      );
      const paymentId = this.createId('PAY');
      await this.repository.createPayment(
        {
          id: paymentId,
          paymentType: 'INITIAL_PAYMENT',
          direction: 'INBOUND',
          amountDue: total,
          issuedAt: new Date(),
          recordedById: user.id,
          contractId: id,
          status: 'WAITING_PAYMENT',
        },
        tx,
      );
      await this.repository.createPaymentDetails(
        items.map((item) => ({
          id: this.createId('PYD'),
          paymentId,
          itemType: item.type,
          description: item.description ?? null,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          amount: item.amount,
        })),
        tx,
      );
      return this.repository.updateContract(
        id,
        { status: 'WAITING_INITIAL_PAYMENT' },
        tx,
      );
    });
  }

  async recordInitialPayment(
    user: BranchScopedUser,
    id: string,
    input: RecordInitialPaymentInput,
  ) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(user, id, ['WAITING_INITIAL_PAYMENT'], async (tx) => {
      const payment = await this.repository.findInitialPayment(id, tx);
      if (!payment) {
        throw new AppError(
          422,
          'PAYMENT_NOT_ISSUED',
          'Create the initial payment request first.',
        );
      }
      if (!input.externalEvidenceChecked) {
        throw new AppError(
          422,
          'EVIDENCE_NOT_CHECKED',
          'External evidence must be checked.',
        );
      }
      if (new Prisma.Decimal(input.amount).lessThan(payment.amountDue)) {
        throw new AppError(
          422,
          'PAYMENT_INSUFFICIENT',
          'The recorded amount must be at least the amount due.',
        );
      }
      await this.repository.updatePayment(
        payment.id,
        {
          amountPaid: new Prisma.Decimal(input.amount),
          paidAt: new Date(input.paidAt),
          method: input.method,
          transactionReference: input.transactionReference ?? null,
          receiptNumber: input.receiptNumber ?? null,
          externalEvidenceChecked: input.externalEvidenceChecked,
          recordedById: user.id,
          status: 'PAID',
          note: input.note ?? null,
        },
        tx,
      );
      return this.repository.updateContract(id, {}, tx);
    });
  }

  async confirmInitialPayment(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(user, id, ['WAITING_INITIAL_PAYMENT'], async (tx) => {
      const payment = await this.repository.findInitialPayment(id, tx);
      if (
        !payment ||
        !payment.amountPaid ||
        new Prisma.Decimal(payment.amountPaid).lessThan(payment.amountDue)
      ) {
        throw new AppError(
          422,
          'PAYMENT_NOT_FULLY_PAID',
          'The initial payment has not been fully collected.',
        );
      }
      await this.repository.updatePayment(
        payment.id,
        { status: 'CONFIRMED' },
        tx,
      );
      return this.repository.updateContract(id, {}, tx);
    });
  }

  async submitHandover(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'ACCOUNTANT');
    return this.mutate(
      user,
      id,
      ['WAITING_INITIAL_PAYMENT'],
      async (tx, contract) => {
        if (!contract.paperContractSigned) {
          throw new AppError(
            422,
            'PAPER_CONTRACT_NOT_SIGNED',
            'The paper contract is not signed.',
          );
        }
        const payment = await this.repository.findInitialPayment(id, tx);
        if (!payment || payment.status !== 'CONFIRMED') {
          throw new AppError(
            422,
            'INITIAL_PAYMENT_NOT_CONFIRMED',
            'The initial payment must be confirmed before handover.',
          );
        }
        return this.repository.updateContract(
          id,
          { status: 'READY_FOR_HANDOVER' },
          tx,
        );
      },
    );
  }

  private async reviewResident(
    contract: ContractRecord,
    customerId: string,
    result: 'ELIGIBLE' | 'INELIGIBLE',
    reason: string | null,
    managerId: string,
    tx: Parameters<ContractRepository['updateMember']>[3],
  ) {
    const member = contract.deposit.rentalRequest.members.find(
      (item) => item.customerId === customerId,
    );
    if (!member || !member.plannedBedId) {
      throw new AppError(
        404,
        'RESIDENT_NOT_FOUND',
        'The resident is not assigned to this contract.',
      );
    }
    await this.repository.updateMember(
      contract.deposit.rentalRequest.id,
      customerId,
      {
        eligibilityResult: result,
        rejectionReason: reason,
        approvedById: managerId,
        approvedAt: new Date(),
        participationStatus: result === 'ELIGIBLE' ? 'APPROVED' : 'REJECTED',
      },
      tx,
    );
  }

  private async mutate(
    user: BranchScopedUser,
    id: string,
    from: string[],
    action: (
      tx: Parameters<ContractRepository['updateContract']>[2],
      contract: ContractRecord,
    ) => Promise<unknown>,
  ) {
    return withTransaction(async (tx) => {
      const contract = await this.repository.findById(id, tx);
      if (!contract)
        throw new AppError(404, 'NOT_FOUND', 'Contract was not found.');
      assertBranchAccess(user, contract.deposit.rentalRequest.branchId);
      if (!from.includes(contract.status)) {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          `This action is not allowed from status ${contract.status}.`,
        );
      }
      await action(tx, contract);
      const updated = await this.repository.findById(id, tx);
      return this.serialize(updated!, user.role);
    });
  }

  private getBranchId(user: BranchScopedUser): string {
    if (!['SALE', 'ACCOUNTANT', 'MANAGER'].includes(user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You cannot access contracts.');
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

  private serialize(contract: ContractRecord, role: string) {
    const payment = contract.payments[0] ?? null;
    return {
      id: contract.id,
      status: contract.status,
      depositId: contract.depositId,
      branch: contract.deposit.rentalRequest.branch,
      customer: contract.deposit.rentalRequest.representative,
      saleEmployee: contract.saleEmployee,
      paperContractNumber: contract.paperContractNumber,
      customerArrived: contract.customerArrived,
      customerArrivedAt: contract.customerArrivedAt,
      signedDate: contract.signedDate,
      startsOn: contract.startsOn,
      endsOn: contract.endsOn,
      paymentCycle: contract.paymentCycle,
      totalMonthlyRent: contract.totalMonthlyRent.toFixed(2),
      paperContractSigned: contract.paperContractSigned,
      specialTerms: contract.specialTerms,
      scheduledCheckInAt: contract.deposit.scheduledCheckInAt,
      depositedBeds: contract.deposit.details.map((detail) => ({
        bedId: detail.bedId,
        bedName: detail.bed.name,
        roomId: detail.bed.roomId,
        roomName: detail.bed.room.name,
        monthlyRent: detail.monthlyRentSnapshot.toFixed(2),
      })),
      members: contract.deposit.rentalRequest.members.map((member) => ({
        customerId: member.customerId,
        fullName: member.customer.fullName,
        gender: member.customer.gender,
        identityDocumentNumber: member.customer.identityDocumentNumber,
        plannedBedId: member.plannedBedId,
        plannedBedName: member.plannedBed?.name ?? null,
        identityChecked: member.identityChecked,
        eligibilityResult: member.eligibilityResult,
        rejectionReason: member.rejectionReason,
        participationStatus: member.participationStatus,
      })),
      contractBeds: contract.beds.map((bed) => ({
        bedId: bed.bedId,
        bedName: bed.bed.name,
        residentCustomerId: bed.residentCustomerId,
        residentName: bed.residentCustomer?.fullName ?? null,
        monthlyRent: bed.monthlyRentSnapshot.toFixed(2),
      })),
      services: contract.services.map((service) => ({
        serviceId: service.serviceId,
        name: service.service.name,
        unitPrice: service.unitPriceSnapshot.toFixed(2),
        calculationMethod: service.calculationMethod,
      })),
      handover: contract.handover,
      initialPayment: payment
        ? {
            id: payment.id,
            amountDue: payment.amountDue.toFixed(2),
            amountPaid: payment.amountPaid
              ? payment.amountPaid.toFixed(2)
              : null,
            status: payment.status,
            method: payment.method,
            items: payment.details.map((detail) => ({
              itemType: detail.itemType,
              description: detail.description,
              quantity: detail.quantity.toString(),
              unitPrice: detail.unitPrice.toFixed(2),
              amount: detail.amount.toFixed(2),
            })),
          }
        : null,
      availableActions: this.availableActions(contract, role),
    };
  }

  private availableActions(contract: ContractRecord, role: string): string[] {
    const status = contract.status;
    const map: Record<string, Record<string, string[]>> = {
      CHECKIN_DRAFT: { SALE: ['confirm-arrival'] },
      ARRIVED: { SALE: ['update-residents', 'submit-eligibility-review'] },
      WAITING_ELIGIBILITY: {
        MANAGER: [
          'approve-resident',
          'reject-resident',
          'approve-eligibility',
          'stop-check-in',
        ],
      },
      ELIGIBILITY_APPROVED: {
        SALE: ['record-paper-contract', 'confirm-paper-signing'],
      },
      PAPER_SIGNED: {
        SALE: ['record-paper-contract'],
        ACCOUNTANT: ['create-initial-payment'],
      },
      WAITING_INITIAL_PAYMENT: {
        ACCOUNTANT: [
          'record-initial-payment',
          'confirm-initial-payment',
          'submit-handover',
        ],
      },
      READY_FOR_HANDOVER: { MANAGER: ['open-handover'] },
    };
    return map[status]?.[role] ?? [];
  }

  private createId(prefix: string): string {
    return `${prefix}-${randomBytes(8).toString('hex')}`;
  }
}
