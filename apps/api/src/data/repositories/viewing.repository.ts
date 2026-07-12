import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { prisma } from '../prisma/client.js';
import type { TransactionClient } from '../prisma/transaction.js';

type DatabaseClient = PrismaClient | TransactionClient;

export const viewingInclude = {
  rentalRequest: {
    select: {
      id: true,
      branchId: true,
      status: true,
      representative: {
        select: { id: true, fullName: true, organizationName: true },
      },
    },
  },
  saleEmployee: { select: { id: true, fullName: true } },
  details: {
    include: { room: { select: { id: true, name: true } } },
    orderBy: { roomId: 'asc' },
  },
} satisfies Prisma.ViewingInclude;

export class ViewingRepository {
  findMany(where: Prisma.ViewingWhereInput, page: number, pageSize: number) {
    return prisma.$transaction([
      prisma.viewing.findMany({
        where,
        include: viewingInclude,
        orderBy: { startsAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.viewing.count({ where }),
    ]);
  }

  findById(id: string, client: DatabaseClient = prisma) {
    return client.viewing.findUnique({
      where: { id },
      include: viewingInclude,
    });
  }

  findRentalRequest(id: string, client: DatabaseClient = prisma) {
    return client.rentalRequest.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true },
    });
  }

  findRoomsInBranch(
    roomIds: string[],
    branchId: string,
    client: DatabaseClient = prisma,
  ) {
    return client.room.findMany({
      where: { id: { in: roomIds }, branchId },
      select: { id: true },
    });
  }

  createViewing(
    data: Prisma.ViewingUncheckedCreateInput,
    detailRoomIds: string[],
    client: TransactionClient,
  ) {
    return client.viewing.create({
      data: {
        ...data,
        details: {
          create: detailRoomIds.map((roomId) => ({ roomId })),
        },
      },
      include: viewingInclude,
    });
  }

  updateViewing(
    id: string,
    data: Prisma.ViewingUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.viewing.update({
      where: { id },
      data,
      include: viewingInclude,
    });
  }

  async replaceDetails(
    viewingId: string,
    roomIds: string[],
    client: TransactionClient,
  ) {
    await client.viewingDetail.deleteMany({ where: { viewingId } });
    if (roomIds.length)
      await client.viewingDetail.createMany({
        data: roomIds.map((roomId) => ({ viewingId, roomId })),
      });
  }

  markDetailInterested(
    viewingId: string,
    roomId: string,
    client: TransactionClient,
  ) {
    return client.viewingDetail.update({
      where: { viewingId_roomId: { viewingId, roomId } },
      data: { customerInterested: true, viewedInPerson: true },
    });
  }

  updateRentalRequestStatus(
    id: string,
    status: Prisma.RentalRequestUpdateInput['status'],
    client: TransactionClient,
  ) {
    return client.rentalRequest.update({ where: { id }, data: { status } });
  }
}
