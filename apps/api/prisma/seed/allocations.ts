import type { AllocationStatus, AllocationType, ContractStatus, DepositStatus } from '../../src/generated/prisma/client.js';
import { addDays, addHours, type AllocationSeed, type DbClient, type SeedContext, pad } from './helpers.js';

export async function seedAllocations(db: DbClient, ctx: SeedContext): Promise<void> {
  buildFinalAllocations(ctx);

  await db.bedAllocation.createMany({
    data: ctx.allocations,
    skipDuplicates: true,
  });
}

function buildFinalAllocations(ctx: SeedContext): void {
  ctx.allocations = [];

  for (const deposit of ctx.deposits) {
    const contract = ctx.contracts.find((item) => item.depositId === deposit.id);
    const checkout = ctx.checkouts.find((item) => item.depositId === deposit.id);

    if (contract) {
      const endedByCheckout = checkout?.status === 'COMPLETED';
      const allocationType = allocationTypeForContract(contract.status);
      const status: AllocationStatus = endedByCheckout || contract.status === 'LIQUIDATED' ? 'ENDED' : 'ACTIVE';

      for (const bedId of contract.bedIds) {
        pushAllocation(ctx, {
          bedId,
          depositId: deposit.id,
          contractId: contract.id,
          allocationType,
          status,
          startedAt: addDays(contract.startsOn, -3),
          expiresAt: null,
          endedAt: status === 'ENDED' ? addDays(ctx.now, -1) : null,
        });
      }

      continue;
    }

    const depositAllocation = allocationForDeposit(deposit.status, checkout?.status === 'COMPLETED');
    if (!depositAllocation) {
      continue;
    }

    for (const bedId of deposit.selectedBedIds) {
      pushAllocation(ctx, {
        bedId,
        depositId: deposit.id,
        contractId: null,
        allocationType: depositAllocation.allocationType,
        status: depositAllocation.status,
        startedAt: addHours(ctx.now, -12),
        expiresAt: depositAllocation.allocationType === 'HELD' ? addHours(ctx.now, 12) : null,
        endedAt: depositAllocation.status === 'ENDED' ? addHours(ctx.now, -1) : null,
      });
    }
  }
}

function pushAllocation(ctx: SeedContext, allocation: Omit<AllocationSeed, 'id'>): void {
  ctx.allocations.push({
    id: `A${pad(ctx.allocations.length + 1)}`,
    ...allocation,
  });
}

function allocationForDeposit(
  status: DepositStatus,
  checkoutCompleted: boolean,
): { allocationType: AllocationType; status: AllocationStatus } | null {
  if (['DRAFT', 'WAITING_ROOM_CHECK', 'ROOM_APPROVED', 'ROOM_REJECTED'].includes(status)) {
    return null;
  }

  if (['PAYMENT_REJECTED', 'EXPIRED', 'CANCELLED'].includes(status)) {
    return { allocationType: 'HELD', status: 'ENDED' };
  }

  if (status === 'DEPOSITED') {
    return { allocationType: 'DEPOSITED', status: checkoutCompleted ? 'ENDED' : 'ACTIVE' };
  }

  return { allocationType: 'HELD', status: 'ACTIVE' };
}

function allocationTypeForContract(status: ContractStatus): AllocationType {
  if (status === 'ACTIVE' || status === 'LIQUIDATED') {
    return 'OCCUPIED';
  }

  return 'DEPOSITED';
}
