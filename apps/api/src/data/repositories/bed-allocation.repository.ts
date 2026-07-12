import type {
  AllocationStatus,
  AllocationType,
  Prisma,
  PrismaClient,
} from '../../generated/prisma/client.js';

export interface CreateBedAllocationInput {
  id: string;
  bedId: string;
  depositId?: string;
  contractId?: string;
  allocationType: AllocationType;
  status: AllocationStatus;
  startedAt: Date;
  expiresAt?: Date;
}

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class BedAllocationRepository {
  constructor(private readonly db: PrismaExecutor) {}

  create(input: CreateBedAllocationInput) {
    return this.db.bedAllocation.create({ data: input });
  }

  endActiveAllocationsByDeposit(depositId: string, endedAt: Date) {
    return this.db.bedAllocation.updateMany({
      where: { depositId, status: 'ACTIVE' },
      data: { status: 'ENDED', endedAt },
    });
  }
}
