import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { prisma } from '../prisma/client.js';
import type { TransactionClient } from '../prisma/transaction.js';

type DatabaseClient = PrismaClient | TransactionClient;

export const handoverInclude = {
  contract: {
    select: {
      id: true,
      status: true,
      depositId: true,
      deposit: {
        select: {
          rentalRequest: {
            select: {
              branchId: true,
              representative: {
                select: { id: true, fullName: true, organizationName: true },
              },
            },
          },
          details: {
            select: { bed: { select: { roomId: true } } },
          },
        },
      },
    },
  },
  manager: { select: { id: true, fullName: true } },
  assets: {
    include: { roomAsset: { include: { assetType: true } } },
    orderBy: { roomAssetId: 'asc' },
  },
} satisfies Prisma.HandoverInclude;

export class HandoverRepository {
  findById(id: string, client: DatabaseClient = prisma) {
    return client.handover.findUnique({ where: { id }, include: handoverInclude });
  }

  findByContractId(contractId: string, client: DatabaseClient = prisma) {
    return client.handover.findUnique({
      where: { contractId },
      include: handoverInclude,
    });
  }

  findContract(contractId: string, client: DatabaseClient = prisma) {
    return client.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        status: true,
        depositId: true,
        deposit: {
          select: {
            details: { select: { bed: { select: { roomId: true } } } },
            rentalRequest: { select: { branchId: true } },
          },
        },
      },
    });
  }

  create(data: Prisma.HandoverUncheckedCreateInput, client: DatabaseClient) {
    return client.handover.create({ data, include: handoverInclude });
  }

  update(id: string, data: Prisma.HandoverUncheckedUpdateInput, client: DatabaseClient) {
    return client.handover.update({ where: { id }, data, include: handoverInclude });
  }

  findRoomAssetsByIds(ids: string[], roomIds: string[], client: DatabaseClient = prisma) {
    return client.roomAsset.findMany({
      where: { id: { in: ids }, roomId: { in: roomIds } },
      select: { id: true },
    });
  }

  async replaceAssets(
    handoverId: string,
    rows: Prisma.HandoverAssetUncheckedCreateInput[],
    client: TransactionClient,
  ) {
    await client.handoverAsset.deleteMany({ where: { handoverId } });
    if (rows.length) await client.handoverAsset.createMany({ data: rows });
  }

  updateContractStatus(
    id: string,
    status: Prisma.ContractUpdateInput['status'],
    client: DatabaseClient,
  ) {
    return client.contract.update({ where: { id }, data: { status } });
  }

  occupyAllocations(depositId: string, contractId: string, client: DatabaseClient) {
    return client.bedAllocation.updateMany({
      where: { depositId, status: 'ACTIVE', allocationType: 'DEPOSITED' },
      data: { allocationType: 'OCCUPIED', contractId },
    });
  }
}
