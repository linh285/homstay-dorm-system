import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { prisma } from '../prisma/client.js';
import type { TransactionClient } from '../prisma/transaction.js';

type DatabaseClient = PrismaClient | TransactionClient;

export const depositDetailInclude = {
  rentalRequest: {
    select: {
      id: true,
      branchId: true,
      rentalMode: true,
      representative: {
        select: { id: true, fullName: true, organizationName: true },
      },
      branch: { select: { id: true, name: true } },
    },
  },
  saleEmployee: { select: { id: true, fullName: true } },
  roomConfirmedBy: { select: { id: true, fullName: true } },
  details: {
    include: {
      bed: {
        select: {
          id: true,
          name: true,
          roomId: true,
          room: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { bedId: 'asc' },
  },
  payments: { orderBy: { issuedAt: 'asc' } },
  allocations: { orderBy: { startedAt: 'asc' } },
} satisfies Prisma.DepositInclude;

export class DepositRepository {
  findMany(where: Prisma.DepositWhereInput, page: number, pageSize: number) {
    return prisma.$transaction([
      prisma.deposit.findMany({
        where,
        include: depositDetailInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.deposit.count({ where }),
    ]);
  }

  findById(id: string, client: DatabaseClient = prisma) {
    return client.deposit.findUnique({
      where: { id },
      include: depositDetailInclude,
    });
  }

  countActiveForRequest(
    rentalRequestId: string,
    client: DatabaseClient = prisma,
  ) {
    return client.deposit.count({
      where: {
        rentalRequestId,
        status: {
          notIn: ['CANCELLED', 'EXPIRED', 'ROOM_REJECTED', 'PAYMENT_REJECTED'],
        },
      },
    });
  }

  findViewingForDeposit(id: string, client: DatabaseClient = prisma) {
    return client.viewing.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        finalResult: true,
        rentalRequest: {
          select: {
            id: true,
            branchId: true,
            rentalMode: true,
            status: true,
          },
        },
        details: { select: { roomId: true, customerInterested: true } },
      },
    });
  }

  findRoomBedIds(roomId: string, client: DatabaseClient = prisma) {
    return client.bed.findMany({
      where: { roomId },
      select: { id: true },
    });
  }

  findBedsWithAllocations(bedIds: string[], client: DatabaseClient = prisma) {
    return client.bed.findMany({
      where: { id: { in: bedIds } },
      include: {
        room: { select: { id: true, branchId: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          select: { id: true, allocationType: true },
        },
      },
    });
  }

  createDeposit(
    data: Prisma.DepositUncheckedCreateInput,
    details: Prisma.DepositDetailUncheckedCreateWithoutDepositInput[],
    client: DatabaseClient,
  ) {
    return client.deposit.create({
      data: { ...data, details: { create: details } },
      include: depositDetailInclude,
    });
  }

  updateDeposit(
    id: string,
    data: Prisma.DepositUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.deposit.update({
      where: { id },
      data,
      include: depositDetailInclude,
    });
  }

  createPayment(
    data: Prisma.PaymentUncheckedCreateInput,
    client: DatabaseClient,
  ) {
    return client.payment.create({ data });
  }

  updatePayment(
    id: string,
    data: Prisma.PaymentUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.payment.update({ where: { id }, data });
  }

  findDepositPayment(depositId: string, client: DatabaseClient = prisma) {
    return client.payment.findFirst({
      where: { depositId, paymentType: 'DEPOSIT' },
      orderBy: { issuedAt: 'desc' },
    });
  }

  createAllocation(
    data: Prisma.BedAllocationUncheckedCreateInput,
    client: DatabaseClient,
  ) {
    return client.bedAllocation.create({ data });
  }

  endActiveAllocationsByDeposit(
    depositId: string,
    endedAt: Date,
    client: DatabaseClient,
  ) {
    return client.bedAllocation.updateMany({
      where: { depositId, status: 'ACTIVE' },
      data: { status: 'ENDED', endedAt },
    });
  }

  promoteHeldAllocations(depositId: string, client: DatabaseClient) {
    return client.bedAllocation.updateMany({
      where: { depositId, status: 'ACTIVE', allocationType: 'HELD' },
      data: { allocationType: 'DEPOSITED' },
    });
  }

  // Expiry job: deposits still WAITING_PAYMENT whose payment deadline has passed.
  findExpiredWaitingPayments(now: Date) {
    return prisma.deposit.findMany({
      where: {
        status: 'WAITING_PAYMENT',
        payments: {
          some: {
            paymentType: 'DEPOSIT',
            status: 'WAITING_PAYMENT',
            expiresAt: { lte: now },
          },
        },
      },
      select: { id: true },
    });
  }
}
