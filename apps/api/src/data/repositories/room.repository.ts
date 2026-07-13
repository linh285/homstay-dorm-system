import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { prisma } from '../prisma/client.js';
import type { TransactionClient } from '../prisma/transaction.js';

type DatabaseClient = PrismaClient | TransactionClient;

export const roomDetailInclude = {
  branch: { select: { id: true, name: true } },
  beds: {
    orderBy: { name: 'asc' },
    include: {
      allocations: {
        where: { status: 'ACTIVE' },
        select: { allocationType: true },
      },
    },
  },
  services: {
    include: { service: true },
  },
  assets: {
    include: { assetType: true },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.RoomInclude;

export const roomListInclude = {
  branch: { select: { id: true, name: true } },
  beds: {
    select: {
      operationalStatus: true,
      monthlyRent: true,
      allocations: {
        where: { status: 'ACTIVE' },
        select: { id: true },
      },
    },
  },
} satisfies Prisma.RoomInclude;

export class RoomRepository {
  findMany(where: Prisma.RoomWhereInput, page: number, pageSize: number) {
    return prisma.$transaction([
      prisma.room.findMany({
        where,
        include: roomListInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.room.count({ where }),
    ]);
  }

  findById(id: string, client: DatabaseClient = prisma) {
    return client.room.findUnique({
      where: { id },
      include: roomDetailInclude,
    });
  }

  findBranchOfRoom(id: string, client: DatabaseClient = prisma) {
    return client.room.findUnique({
      where: { id },
      select: { id: true, branchId: true },
    });
  }

  createRoom(data: Prisma.RoomUncheckedCreateInput, client: DatabaseClient) {
    return client.room.create({ data, include: roomDetailInclude });
  }

  updateRoom(
    id: string,
    data: Prisma.RoomUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.room.update({
      where: { id },
      data,
      include: roomDetailInclude,
    });
  }

  findBedById(id: string, client: DatabaseClient = prisma) {
    return client.bed.findUnique({
      where: { id },
      include: {
        room: { select: { id: true, branchId: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          select: { allocationType: true },
        },
      },
    });
  }

  findBedByName(roomId: string, name: string, client: DatabaseClient = prisma) {
    return client.bed.findUnique({
      where: { roomId_name: { roomId, name } },
      select: { id: true },
    });
  }

  createBed(data: Prisma.BedUncheckedCreateInput, client: DatabaseClient) {
    return client.bed.create({ data });
  }

  updateBed(
    id: string,
    data: Prisma.BedUncheckedUpdateInput,
    client: DatabaseClient,
  ) {
    return client.bed.update({ where: { id }, data });
  }

  activeAllocationsForRoom(roomId: string, client: DatabaseClient = prisma) {
    return client.bedAllocation.findMany({
      where: { status: 'ACTIVE', bed: { roomId } },
      select: { allocationType: true },
    });
  }

  listServices() {
    return prisma.service.findMany({ orderBy: { name: 'asc' } });
  }

  listAssetTypes() {
    return prisma.assetType.findMany({ orderBy: { name: 'asc' } });
  }

  findServicesByIds(ids: string[], client: DatabaseClient = prisma) {
    return client.service.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
  }

  findAssetTypesByIds(ids: string[], client: DatabaseClient = prisma) {
    return client.assetType.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
  }

  replaceRoomServices(
    roomId: string,
    rows: Prisma.RoomServiceCreateManyInput[],
    client: TransactionClient,
  ) {
    return client.roomService
      .deleteMany({ where: { roomId } })
      .then(() =>
        rows.length
          ? client.roomService.createMany({ data: rows })
          : Promise.resolve(null),
      );
  }

  listRoomServices(roomId: string, client: DatabaseClient = prisma) {
    return client.roomService.findMany({
      where: { roomId },
      include: { service: true },
    });
  }

  listRoomAssets(roomId: string, client: DatabaseClient = prisma) {
    return client.roomAsset.findMany({
      where: { roomId },
      include: { assetType: true },
      orderBy: { id: 'asc' },
    });
  }

  hasProtectedRoomAssets(roomId: string, client: DatabaseClient = prisma) {
    return client.roomAsset.count({
      where: {
        roomId,
        OR: [
          { handoverAssets: { some: {} } },
          { inspectionItems: { some: {} } },
        ],
      },
    });
  }

  async replaceRoomAssets(
    roomId: string,
    rows: Prisma.RoomAssetUncheckedCreateInput[],
    client: TransactionClient,
  ) {
    await client.roomAsset.deleteMany({ where: { roomId } });
    if (rows.length) await client.roomAsset.createMany({ data: rows });
  }
}
