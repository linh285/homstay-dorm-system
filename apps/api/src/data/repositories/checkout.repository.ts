import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { prisma } from '../prisma/client.js';
import type { TransactionClient } from '../prisma/transaction.js';

type DatabaseClient = PrismaClient | TransactionClient;

export const checkoutInclude = {
  saleEmployee: { select: { id: true, fullName: true } },
  deposit: {
    select: {
      id: true,
      totalDepositAmount: true,
      rentalRequest: {
        select: {
          branchId: true,
          branch: { select: { id: true, name: true } },
          representative: {
            select: { id: true, fullName: true, organizationName: true },
          },
        },
      },
      details: {
        select: {
          bed: {
            select: {
              id: true,
              name: true,
              roomId: true,
              room: { select: { name: true } },
            },
          },
        },
      },
    },
  },
  contract: {
    select: { id: true, status: true, startsOn: true, endsOn: true },
  },
  inspection: {
    include: {
      manager: { select: { id: true, fullName: true } },
      items: {
        include: {
          roomAsset: {
            select: { id: true, assetType: { select: { name: true } } },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  },
  settlement: {
    include: {
      accountant: { select: { id: true, fullName: true } },
      customerConfirmedBy: { select: { id: true, fullName: true } },
      deductions: { orderBy: { id: 'asc' } },
      payments: { orderBy: { issuedAt: 'asc' } },
    },
  },
} satisfies Prisma.CheckoutRequestInclude;

export class CheckoutRepository {
  findMany(
    where: Prisma.CheckoutRequestWhereInput,
    page: number,
    pageSize: number,
  ) {
    return prisma.$transaction([
      prisma.checkoutRequest.findMany({
        where,
        include: checkoutInclude,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.checkoutRequest.count({ where }),
    ]);
  }

  findById(id: string, client: DatabaseClient = prisma) {
    return client.checkoutRequest.findUnique({
      where: { id },
      include: checkoutInclude,
    });
  }

  findBySettlementId(settlementId: string, client: DatabaseClient = prisma) {
    return client.checkoutRequest.findFirst({
      where: { settlement: { id: settlementId } },
      include: checkoutInclude,
    });
  }

  findByInspectionId(inspectionId: string, client: DatabaseClient = prisma) {
    return client.checkoutRequest.findFirst({
      where: { inspection: { id: inspectionId } },
      include: checkoutInclude,
    });
  }

  findContract(contractId: string, client: DatabaseClient = prisma) {
    return client.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        status: true,
        depositId: true,
        startsOn: true,
        endsOn: true,
        deposit: { select: { rentalRequest: { select: { branchId: true } } } },
      },
    });
  }

  findDeposit(depositId: string, client: DatabaseClient = prisma) {
    return client.deposit.findUnique({
      where: { id: depositId },
      select: {
        id: true,
        status: true,
        contract: { select: { id: true } },
        rentalRequest: { select: { branchId: true } },
      },
    });
  }

  countActiveForDeposit(depositId: string, client: DatabaseClient = prisma) {
    return client.checkoutRequest.count({
      where: { depositId, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
    });
  }

  createCheckout(
    data: Prisma.CheckoutRequestUncheckedCreateInput,
    client: DatabaseClient,
  ) {
    return client.checkoutRequest.create({ data, include: checkoutInclude });
  }

  updateCheckout(
    id: string,
    data: Prisma.CheckoutRequestUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.checkoutRequest.update({
      where: { id },
      data,
      include: checkoutInclude,
    });
  }

  // Inspection
  createInspection(
    data: Prisma.CheckoutInspectionUncheckedCreateInput,
    client: DatabaseClient,
  ) {
    return client.checkoutInspection.create({ data });
  }

  findInspection(id: string, client: DatabaseClient = prisma) {
    return client.checkoutInspection.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, fullName: true } },
        checkoutRequest: {
          select: {
            id: true,
            status: true,
            deposit: {
              select: { rentalRequest: { select: { branchId: true } } },
            },
          },
        },
        items: { orderBy: { id: 'asc' } },
      },
    });
  }

  updateInspection(
    id: string,
    data: Prisma.CheckoutInspectionUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.checkoutInspection.update({ where: { id }, data });
  }

  async replaceInspectionItems(
    inspectionId: string,
    rows: Prisma.CheckoutInspectionItemUncheckedCreateInput[],
    client: TransactionClient,
  ) {
    await client.checkoutInspectionItem.deleteMany({ where: { inspectionId } });
    if (rows.length)
      await client.checkoutInspectionItem.createMany({ data: rows });
  }

  findRoomAssetsByIds(
    ids: string[],
    roomIds: string[],
    client: DatabaseClient = prisma,
  ) {
    return client.roomAsset.findMany({
      where: { id: { in: ids }, roomId: { in: roomIds } },
      select: { id: true },
    });
  }
}
