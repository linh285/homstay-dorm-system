import type { OperationalStatus } from '../../src/generated/prisma/client.js';
import {
  assetTypes,
  genderPolicies,
  quietLevels,
  roomTypes,
  serviceCatalog,
} from './constants.js';
import { type DbClient, type SeedContext, pad, pick } from './helpers.js';

export async function seedRooms(db: DbClient, ctx: SeedContext): Promise<void> {
  await db.service.createMany({
    data: serviceCatalog.map((service) => ({
      ...service,
      effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });

  await db.assetType.createMany({
    data: assetTypes.map((assetType) => ({
      ...assetType,
      description: `Danh mục tài sản demo ${assetType.name}`,
    })),
    skipDuplicates: true,
  });

  for (const branch of ctx.branches) {
    for (let roomIndex = 1; roomIndex <= ctx.config.roomsPerBranch; roomIndex += 1) {
      const roomNumber = (Number(branch.id.replace('CN', '')) - 1) * ctx.config.roomsPerBranch + roomIndex;
      const roomId = `P${pad(roomNumber)}`;
      const maximumCapacity = 4;
      const roomArrayIndex = ctx.rooms.length;
      const roomType = pick(roomTypes, roomArrayIndex);
      // Every bed in a room shares the same rent; rent varies by room type.
      const monthlyRent = rentForRoomType(roomType) + (roomIndex % 3) * 100000;

      ctx.rooms.push({
        id: roomId,
        branchId: branch.id,
        name: `${branch.id} - Phòng ${pad(roomIndex, 2)}`,
        maximumCapacity,
        roomType,
        monthlyRent,
      });

      for (let bedIndex = 1; bedIndex <= maximumCapacity; bedIndex += 1) {
        ctx.beds.push({
          id: `B${pad((roomNumber - 1) * maximumCapacity + bedIndex)}`,
          roomId,
          branchId: branch.id,
          name: `B${pad(bedIndex, 2)}`,
          monthlyRent,
        });
      }
    }
  }

  await db.room.createMany({
    data: ctx.rooms.map((room, index) => ({
      id: room.id,
      branchId: room.branchId,
      name: room.name,
      area: `Khu ${String.fromCharCode(65 + (index % 4))}`,
      floor: (index % 5) + 1,
      roomType: room.roomType,
      maximumCapacity: room.maximumCapacity,
      genderPolicy: pick(genderPolicies, index),
      hasAirConditioner: index % 2 === 0,
      hasParking: index % 3 !== 0,
      curfew: '23:00',
      quietLevel: pick(quietLevels, index),
      rules: 'Không hút thuốc, giữ trật tự sau 22:00.',
      operationalStatus: roomOperationalStatus(index + 1),
      note: index === 4 ? 'Phòng demo tạm ngưng sử dụng.' : null,
    })),
    skipDuplicates: true,
  });

  await db.bed.createMany({
    data: ctx.beds.map((bed, index) => ({
      id: bed.id,
      roomId: bed.roomId,
      name: bed.name,
      monthlyRent: bed.monthlyRent,
      operationalStatus: bedOperationalStatus(index),
      note: index % 41 === 0 ? 'Giường demo bảo trì nhẹ.' : null,
    })),
    skipDuplicates: true,
  });

  await db.roomService.createMany({
    data: ctx.rooms.flatMap((room, index) =>
      serviceCatalog.slice(0, 3 + (index % 2)).map((service) => ({
        roomId: room.id,
        serviceId: service.id,
        customPrice: service.unitPrice + (index % 3) * 10000,
        note: 'Dịch vụ gắn sẵn cho phòng demo.',
      })),
    ),
    skipDuplicates: true,
  });

  await db.roomAsset.createMany({
    data: ctx.rooms.flatMap((room, roomIndex) =>
      assetTypes.map((assetType, assetIndex) => ({
        id: `RA${pad(roomIndex * assetTypes.length + assetIndex + 1)}`,
        roomId: room.id,
        assetTypeId: assetType.id,
        quantity: assetType.id === 'AT003' ? room.maximumCapacity : 1 + (assetIndex % 2),
        currentCondition: roomIndex % 9 === 0 ? 'Cần kiểm tra lại' : 'Tốt',
        note: 'Tài sản phòng demo.',
      })),
    ),
    skipDuplicates: true,
  });
}

function rentForRoomType(roomType: string): number {
  switch (roomType) {
    case 'DELUXE':
      return 2800000;
    case 'QUIET':
      return 2300000;
    case 'STANDARD':
      return 2000000;
    case 'BUDGET':
    default:
      return 1500000;
  }
}

function roomOperationalStatus(index: number): OperationalStatus {
  if (index % 15 === 0) {
    return 'OUT_OF_SERVICE';
  }

  if (index % 10 === 0) {
    return 'MAINTENANCE';
  }

  return 'ACTIVE';
}

function bedOperationalStatus(index: number): OperationalStatus {
  if (index % 53 === 0) {
    return 'MAINTENANCE';
  }

  return 'ACTIVE';
}
