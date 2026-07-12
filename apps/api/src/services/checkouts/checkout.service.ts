import { randomBytes } from 'node:crypto';

import { Prisma } from '../../generated/prisma/client.js';
import { CheckoutRepository } from '../../data/repositories/checkout.repository.js';
import { withTransaction } from '../../data/prisma/transaction.js';
import {
  assertBranchAccess,
  type BranchScopedUser,
} from '../authorization/branch-access.js';
import { AppError } from '../../shared/app-error.js';
import type {
  createCheckoutSchema,
  createInspectionSchema,
  inspectionItemsSchema,
  inspectionUpdateSchema,
  listCheckoutsSchema,
  updateCheckoutSchema,
} from '../../presentation/validators/checkout.validator.js';
import type { z } from 'zod';

type CreateInput = z.infer<typeof createCheckoutSchema>;
type UpdateInput = z.infer<typeof updateCheckoutSchema>;
type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
type InspectionUpdateInput = z.infer<typeof inspectionUpdateSchema>;
type InspectionItemsInput = z.infer<typeof inspectionItemsSchema>;
type ListInput = z.infer<typeof listCheckoutsSchema>;

type CheckoutRecord = NonNullable<
  Awaited<ReturnType<CheckoutRepository['findById']>>
>;

export class CheckoutService {
  constructor(private readonly repository = new CheckoutRepository()) {}

  async list(user: BranchScopedUser, input: ListInput) {
    const branchId = this.getBranchId(user);
    const where: Prisma.CheckoutRequestWhereInput = {
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
                      { fullName: { contains: input.customerName, mode: 'insensitive' } },
                      { organizationName: { contains: input.customerName, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
          }
        : {}),
    };
    const [items, totalItems] = await this.repository.findMany(where, input.page, input.pageSize);
    return {
      items: items.map((item) => this.serialize(item, user.role)),
      totalItems,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async get(user: BranchScopedUser, id: string) {
    const checkout = await this.repository.findById(id);
    if (!checkout) throw new AppError(404, 'NOT_FOUND', 'Checkout request was not found.');
    this.getBranchId(user);
    assertBranchAccess(user, checkout.deposit.rentalRequest.branchId);
    return this.serialize(checkout, user.role);
  }

  async create(user: BranchScopedUser, input: CreateInput) {
    this.requireRole(user, 'SALE');
    return withTransaction(async (tx) => {
      let depositId = input.depositId ?? null;
      let contractId = input.contractId ?? null;
      let branchId: string;

      if (contractId) {
        const contract = await this.repository.findContract(contractId, tx);
        if (!contract) throw new AppError(404, 'NOT_FOUND', 'Contract was not found.');
        if (contract.status !== 'ACTIVE') {
          throw new AppError(422, 'CONTRACT_NOT_ACTIVE', 'Only an active contract can be returned.');
        }
        depositId = contract.depositId;
        branchId = contract.deposit.rentalRequest.branchId;
      } else {
        const deposit = await this.repository.findDeposit(depositId!, tx);
        if (!deposit) throw new AppError(404, 'NOT_FOUND', 'Deposit was not found.');
        if (deposit.status !== 'DEPOSITED') {
          throw new AppError(422, 'DEPOSIT_NOT_ACTIVE', 'Only a confirmed deposit can be returned.');
        }
        contractId = deposit.contract?.id ?? null;
        branchId = deposit.rentalRequest.branchId;
      }
      assertBranchAccess(user, branchId);

      const active = await this.repository.countActiveForDeposit(depositId!, tx);
      if (active > 0) {
        throw new AppError(
          409,
          'ACTIVE_CHECKOUT_EXISTS',
          'An active checkout request already exists.',
        );
      }
      const checkout = await this.repository.createCheckout(
        {
          id: this.createId('CKO'),
          depositId: depositId!,
          contractId,
          saleEmployeeId: user.id,
          requestedAt: new Date(),
          expectedCheckoutAt: input.expectedCheckoutAt ? new Date(input.expectedCheckoutAt) : null,
          reason: input.reason ?? null,
          status: 'DRAFT',
          note: input.note ?? null,
        },
        tx,
      );
      return this.serialize(checkout, user.role);
    });
  }

  async update(user: BranchScopedUser, id: string, input: UpdateInput) {
    this.requireRole(user, 'SALE');
    return this.mutate(user, id, ['DRAFT'], (tx) =>
      this.repository.updateCheckout(
        id,
        {
          expectedCheckoutAt:
            input.expectedCheckoutAt === undefined
              ? undefined
              : input.expectedCheckoutAt
                ? new Date(input.expectedCheckoutAt)
                : null,
          reason: input.reason,
          note: input.note,
        },
        tx,
      ),
    );
  }

  async submit(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'SALE');
    return this.mutate(user, id, ['DRAFT'], (tx, checkout) => {
      if (!checkout.contract) {
        throw new AppError(
          422,
          'NO_CONTRACT_TO_INSPECT',
          'A deposit-only checkout goes straight to settlement without inspection.',
        );
      }
      return this.repository.updateCheckout(id, { status: 'WAITING_INSPECTION' }, tx);
    });
  }

  async cancel(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'SALE');
    return this.mutate(user, id, ['DRAFT'], (tx) =>
      this.repository.updateCheckout(id, { status: 'CANCELLED' }, tx),
    );
  }

  async createInspection(user: BranchScopedUser, checkoutId: string, input: CreateInspectionInput) {
    this.requireRole(user, 'MANAGER');
    return this.mutate(user, checkoutId, ['WAITING_INSPECTION'], async (tx, checkout) => {
      if (checkout.inspection) {
        throw new AppError(409, 'INSPECTION_ALREADY_EXISTS', 'An inspection already exists.');
      }
      await this.repository.createInspection(
        {
          id: this.createId('INS'),
          checkoutRequestId: checkoutId,
          managerId: user.id,
          sanitationCondition: input.sanitationCondition ?? null,
          areaCondition: input.areaCondition ?? null,
          status: 'DRAFT',
          note: input.note ?? null,
        },
        tx,
      );
      return this.repository.updateCheckout(checkoutId, {}, tx);
    });
  }

  async getInspection(user: BranchScopedUser, id: string) {
    const inspection = await this.repository.findInspection(id);
    if (!inspection) throw new AppError(404, 'NOT_FOUND', 'Inspection was not found.');
    if (!['MANAGER', 'ACCOUNTANT'].includes(user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You cannot view this inspection.');
    }
    assertBranchAccess(user, inspection.checkoutRequest.deposit.rentalRequest.branchId);
    return this.serializeInspection(inspection);
  }

  async updateInspection(user: BranchScopedUser, id: string, input: InspectionUpdateInput) {
    this.requireRole(user, 'MANAGER');
    return this.mutateInspection(user, id, async (tx) => {
      await this.repository.updateInspection(
        id,
        {
          sanitationCondition: input.sanitationCondition,
          areaCondition: input.areaCondition,
          note: input.note,
        },
        tx,
      );
    });
  }

  async replaceInspectionItems(user: BranchScopedUser, id: string, input: InspectionItemsInput) {
    this.requireRole(user, 'MANAGER');
    return this.mutateInspection(user, id, async (tx, inspection) => {
      const checkout = await this.repository.findById(inspection.checkoutRequest.id, tx);
      const roomIds = [
        ...new Set(checkout!.deposit.details.map((detail) => detail.bed.roomId)),
      ];
      const assetIds = input.items
        .map((item) => item.roomAssetId)
        .filter((value): value is string => Boolean(value));
      if (assetIds.length) {
        const found = await this.repository.findRoomAssetsByIds(assetIds, roomIds, tx);
        if (found.length !== new Set(assetIds).size) {
          throw new AppError(422, 'ROOM_ASSET_NOT_FOUND', 'One or more assets do not belong to the room.');
        }
      }
      await this.repository.replaceInspectionItems(
        id,
        input.items.map((item) => ({
          id: this.createId('ICI'),
          inspectionId: id,
          roomAssetId: item.roomAssetId ?? null,
          result: item.result,
          quantity: item.quantity ?? null,
          description: item.description ?? null,
          estimatedCost: item.estimatedCost ? new Prisma.Decimal(item.estimatedCost) : null,
          note: item.note ?? null,
        })),
        tx,
      );
    });
  }

  async completeInspection(user: BranchScopedUser, id: string) {
    this.requireRole(user, 'MANAGER');
    return this.mutateInspection(user, id, async (tx, inspection) => {
      if (inspection.checkoutRequest.status !== 'WAITING_INSPECTION') {
        throw new AppError(409, 'INVALID_STATE_TRANSITION', 'The checkout is not awaiting inspection.');
      }
      await this.repository.updateInspection(
        id,
        { status: 'COMPLETED', inspectedAt: new Date() },
        tx,
      );
      await this.repository.updateCheckout(inspection.checkoutRequest.id, { status: 'INSPECTED' }, tx);
    });
  }

  private async mutate(
    user: BranchScopedUser,
    id: string,
    from: string[],
    action: (
      tx: Parameters<CheckoutRepository['updateCheckout']>[2],
      checkout: CheckoutRecord,
    ) => Promise<unknown>,
  ) {
    return withTransaction(async (tx) => {
      const checkout = await this.repository.findById(id, tx);
      if (!checkout) throw new AppError(404, 'NOT_FOUND', 'Checkout request was not found.');
      assertBranchAccess(user, checkout.deposit.rentalRequest.branchId);
      if (!from.includes(checkout.status)) {
        throw new AppError(409, 'INVALID_STATE_TRANSITION', `This action is not allowed from status ${checkout.status}.`);
      }
      await action(tx, checkout);
      const updated = await this.repository.findById(id, tx);
      return this.serialize(updated!, user.role);
    });
  }

  private async mutateInspection(
    user: BranchScopedUser,
    id: string,
    action: (
      tx: Parameters<CheckoutRepository['updateInspection']>[2],
      inspection: NonNullable<Awaited<ReturnType<CheckoutRepository['findInspection']>>>,
    ) => Promise<unknown>,
  ) {
    return withTransaction(async (tx) => {
      const inspection = await this.repository.findInspection(id, tx);
      if (!inspection) throw new AppError(404, 'NOT_FOUND', 'Inspection was not found.');
      assertBranchAccess(user, inspection.checkoutRequest.deposit.rentalRequest.branchId);
      if (inspection.status === 'COMPLETED') {
        throw new AppError(409, 'INVALID_STATE_TRANSITION', 'The inspection has already been completed.');
      }
      await action(tx, inspection);
      const updated = await this.repository.findInspection(id, tx);
      return this.serializeInspection(updated!);
    });
  }

  private getBranchId(user: BranchScopedUser): string {
    if (!['SALE', 'ACCOUNTANT', 'MANAGER'].includes(user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You cannot access checkout requests.');
    }
    if (!user.branchId) throw new AppError(403, 'BRANCH_ACCESS_DENIED', 'You must belong to a branch.');
    return user.branchId;
  }

  private requireRole(user: BranchScopedUser, role: string) {
    this.getBranchId(user);
    if (user.role !== role) {
      throw new AppError(403, 'FORBIDDEN', `Only ${role} can perform this action.`);
    }
  }

  private serialize(checkout: CheckoutRecord, role: string) {
    return {
      id: checkout.id,
      status: checkout.status,
      depositId: checkout.depositId,
      contractId: checkout.contractId,
      hasContract: Boolean(checkout.contractId),
      branch: checkout.deposit.rentalRequest.branch,
      customer: checkout.deposit.rentalRequest.representative,
      saleEmployee: checkout.saleEmployee,
      requestedAt: checkout.requestedAt,
      expectedCheckoutAt: checkout.expectedCheckoutAt,
      actualCheckoutAt: checkout.actualCheckoutAt,
      reason: checkout.reason,
      note: checkout.note,
      beds: checkout.deposit.details.map((detail) => ({
        bedId: detail.bed.id,
        bedName: detail.bed.name,
        roomName: detail.bed.room.name,
      })),
      inspection: checkout.inspection
        ? {
            id: checkout.inspection.id,
            status: checkout.inspection.status,
            sanitationCondition: checkout.inspection.sanitationCondition,
            areaCondition: checkout.inspection.areaCondition,
          }
        : null,
      settlement: checkout.settlement
        ? { id: checkout.settlement.id, status: checkout.settlement.status }
        : null,
      availableActions: this.availableActions(checkout, role),
    };
  }

  private serializeInspection(
    inspection: NonNullable<Awaited<ReturnType<CheckoutRepository['findInspection']>>>,
  ) {
    return {
      id: inspection.id,
      checkoutRequestId: inspection.checkoutRequestId,
      status: inspection.status,
      manager: inspection.manager,
      sanitationCondition: inspection.sanitationCondition,
      areaCondition: inspection.areaCondition,
      inspectedAt: inspection.inspectedAt,
      note: inspection.note,
      items: inspection.items.map((item) => ({
        id: item.id,
        roomAssetId: item.roomAssetId,
        result: item.result,
        quantity: item.quantity,
        description: item.description,
        estimatedCost: item.estimatedCost ? item.estimatedCost.toFixed(2) : null,
        note: item.note,
      })),
    };
  }

  private availableActions(checkout: CheckoutRecord, role: string): string[] {
    const status = checkout.status;
    const map: Record<string, Record<string, string[]>> = {
      DRAFT: {
        SALE: checkout.contractId ? ['update', 'submit', 'cancel'] : ['update', 'cancel'],
        ACCOUNTANT: checkout.contractId ? [] : ['create-settlement'],
      },
      WAITING_INSPECTION: { MANAGER: ['create-inspection'] },
      INSPECTED: { ACCOUNTANT: ['create-settlement'] },
    };
    return map[status]?.[role] ?? [];
  }

  private createId(prefix: string): string {
    return `${prefix}-${randomBytes(8).toString('hex')}`;
  }
}
