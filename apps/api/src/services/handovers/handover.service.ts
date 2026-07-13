import { HandoverRepository } from '../../data/repositories/handover.repository.js';
import { withTransaction } from '../../data/prisma/transaction.js';
import {
  assertBranchAccess,
  type BranchScopedUser,
} from '../authorization/branch-access.js';
import { AppError } from '../../shared/app-error.js';
import { nextId } from '../../shared/id.js';
import type {
  createHandoverSchema,
  handoverAssetsSchema,
  updateHandoverSchema,
} from '../../presentation/validators/handover.validator.js';
import type { z } from 'zod';

type CreateInput = z.infer<typeof createHandoverSchema>;
type UpdateInput = z.infer<typeof updateHandoverSchema>;
type AssetsInput = z.infer<typeof handoverAssetsSchema>;

type HandoverRecord = NonNullable<
  Awaited<ReturnType<HandoverRepository['findById']>>
>;

export class HandoverService {
  constructor(private readonly repository = new HandoverRepository()) {}

  async get(user: BranchScopedUser, id: string) {
    const handover = await this.repository.findById(id);
    if (!handover) throw new AppError(404, 'NOT_FOUND', 'Handover was not found.');
    this.requireManager(user);
    assertBranchAccess(
      user,
      handover.contract.deposit.rentalRequest.branchId,
    );
    return this.serialize(handover);
  }

  async createForContract(
    user: BranchScopedUser,
    contractId: string,
    input: CreateInput,
  ) {
    this.requireManager(user);
    return withTransaction(async (tx) => {
      const contract = await this.repository.findContract(contractId, tx);
      if (!contract) throw new AppError(404, 'NOT_FOUND', 'Contract was not found.');
      assertBranchAccess(user, contract.deposit.rentalRequest.branchId);
      if (contract.status !== 'READY_FOR_HANDOVER') {
        throw new AppError(
          422,
          'CONTRACT_NOT_READY_FOR_HANDOVER',
          'The contract is not ready for handover.',
        );
      }
      const existing = await this.repository.findByContractId(contractId, tx);
      if (existing) {
        throw new AppError(
          409,
          'HANDOVER_ALREADY_EXISTS',
          'A handover record already exists for this contract.',
        );
      }
      const handover = await this.repository.create(
        {
          id: await nextId(tx, 'handover', 'H'),
          contractId,
          managerId: user.id,
          areaCondition: input.areaCondition ?? null,
          note: input.note ?? null,
          status: 'DRAFT',
        },
        tx,
      );
      return this.serialize(handover);
    });
  }

  async update(user: BranchScopedUser, id: string, input: UpdateInput) {
    this.requireManager(user);
    return this.mutate(user, id, (tx) =>
      this.repository.update(
        id,
        {
          areaCondition: input.areaCondition,
          utilitiesGuided: input.utilitiesGuided,
          safetyGuided: input.safetyGuided,
          paperRecordSigned: input.paperHandoverSigned,
          note: input.note,
        },
        tx,
      ),
    );
  }

  async replaceAssets(user: BranchScopedUser, id: string, input: AssetsInput) {
    this.requireManager(user);
    return this.mutate(user, id, async (tx, handover) => {
      const roomIds = [
        ...new Set(
          handover.contract.deposit.details.map((detail) => detail.bed.roomId),
        ),
      ];
      const ids = input.assets.map((asset) => asset.roomAssetId);
      if (new Set(ids).size !== ids.length) {
        throw new AppError(422, 'DUPLICATE_ASSET', 'Duplicate assets are not allowed.');
      }
      if (ids.length) {
        const found = await this.repository.findRoomAssetsByIds(ids, roomIds, tx);
        if (found.length !== ids.length) {
          throw new AppError(
            422,
            'ROOM_ASSET_NOT_FOUND',
            'One or more assets do not belong to the handover room.',
          );
        }
      }
      await this.repository.replaceAssets(
        id,
        input.assets.map((asset) => ({
          handoverId: id,
          roomAssetId: asset.roomAssetId,
          deliveredQuantity: asset.deliveredQuantity,
          conditionAtHandover: asset.conditionAtHandover ?? null,
          note: asset.note ?? null,
        })),
        tx,
      );
      return this.repository.update(id, {}, tx);
    });
  }

  async complete(user: BranchScopedUser, id: string) {
    this.requireManager(user);
    return this.mutate(user, id, async (tx, handover) => {
      if (handover.status !== 'DRAFT') {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          'Only a draft handover can be completed.',
        );
      }
      if (
        !handover.utilitiesGuided ||
        !handover.safetyGuided ||
        !handover.paperRecordSigned
      ) {
        throw new AppError(
          422,
          'HANDOVER_CHECKLIST_INCOMPLETE',
          'Confirm utilities guidance, safety guidance and the signed paper record.',
        );
      }
      if (handover.contract.status !== 'READY_FOR_HANDOVER') {
        throw new AppError(
          422,
          'CONTRACT_NOT_READY_FOR_HANDOVER',
          'The contract is not ready for handover.',
        );
      }
      await this.repository.updateContractStatus(
        handover.contract.id,
        'ACTIVE',
        tx,
      );
      await this.repository.occupyAllocations(
        handover.contract.depositId,
        handover.contract.id,
        tx,
      );
      return this.repository.update(
        id,
        { status: 'COMPLETED', handedOverAt: new Date() },
        tx,
      );
    });
  }

  private async mutate(
    user: BranchScopedUser,
    id: string,
    action: (
      tx: Parameters<HandoverRepository['update']>[2],
      handover: HandoverRecord,
    ) => Promise<unknown>,
  ) {
    return withTransaction(async (tx) => {
      const handover = await this.repository.findById(id, tx);
      if (!handover) throw new AppError(404, 'NOT_FOUND', 'Handover was not found.');
      assertBranchAccess(user, handover.contract.deposit.rentalRequest.branchId);
      if (handover.status !== 'DRAFT') {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          'The handover has already been completed.',
        );
      }
      await action(tx, handover);
      const updated = await this.repository.findById(id, tx);
      return this.serialize(updated!);
    });
  }

  private requireManager(user: BranchScopedUser) {
    if (user.role !== 'MANAGER') {
      throw new AppError(403, 'FORBIDDEN', 'Only MANAGER can manage handovers.');
    }
    if (!user.branchId) {
      throw new AppError(403, 'BRANCH_ACCESS_DENIED', 'MANAGER must belong to a branch.');
    }
  }

  private serialize(handover: HandoverRecord) {
    const roomIds = [
      ...new Set(
        handover.contract.deposit.details.map((detail) => detail.bed.roomId),
      ),
    ];
    return {
      id: handover.id,
      contractId: handover.contract.id,
      contractStatus: handover.contract.status,
      status: handover.status,
      roomIds,
      manager: handover.manager,
      customer: handover.contract.deposit.rentalRequest.representative,
      areaCondition: handover.areaCondition,
      utilitiesGuided: handover.utilitiesGuided,
      safetyGuided: handover.safetyGuided,
      paperRecordSigned: handover.paperRecordSigned,
      handedOverAt: handover.handedOverAt,
      note: handover.note,
      assets: handover.assets.map((asset) => ({
        roomAssetId: asset.roomAssetId,
        assetTypeName: asset.roomAsset.assetType.name,
        standardQuantity: asset.roomAsset.quantity,
        deliveredQuantity: asset.deliveredQuantity,
        conditionAtHandover: asset.conditionAtHandover,
        note: asset.note,
      })),
    };
  }

}
