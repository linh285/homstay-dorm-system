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
      description: `Danh muc tai san demo ${assetType.name}`,
    })),
    skipDuplicates: true,
  });

  for (const branch of ctx.branches) {
    for (let roomIndex = 1; roomIndex <= ctx.config.roomsPerBranch; roomIndex += 1) {
      const roomNumber = (Number(branch.id.replace('CN', '')) - 1) * ctx.config.roomsPerBranch + roomIndex;
      const roomId = `P${pad(roomNumber)}`;
      const maximumCapacity = 4;

      ctx.rooms.push({
        id: roomId,
        branchId: branch.id,
        name: `${branch.id}-Phong ${pad(roomIndex, 2)}`,
        maximumCapacity,
      });

      for (let bedIndex = 1; bedIndex <= maximumCapacity; bedIndex += 1) {
        ctx.beds.push({
          id: `B${pad((roomNumber - 1) * maximumCapacity + bedIndex)}`,
          roomId,
          branchId: branch.id,
          name: `B${pad(bedIndex, 2)}`,
          monthlyRent: 1200000 + ((roomIndex + bedIndex) % 5) * 150000,
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
      roomType: pick(roomTypes, index),
      maximumCapacity: room.maximumCapacity,
      genderPolicy: pick(genderPolicies, index),
      hasAirConditioner: index % 2 === 0,
      hasParking: index % 3 !== 0,
      curfew: '23:00',
      quietLevel: pick(quietLevels, index),
      rules: 'Khong hut thuoc, giu trat tu sau 22:00.',
      operationalStatus: roomOperationalStatus(index + 1),
      note: index === 4 ? 'DEMO room tam ngung su dung.' : null,
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
      note: index % 41 === 0 ? 'Giuong demo bao tri nhe.' : null,
    })),
    skipDuplicates: true,
  });

  await db.roomService.createMany({
    data: ctx.rooms.flatMap((room, index) =>
      serviceCatalog.slice(0, 3 + (index % 2)).map((service) => ({
        roomId: room.id,
        serviceId: service.id,
        customPrice: service.unitPrice + (index % 3) * 10000,
        note: 'Dich vu gan san cho phong demo.',
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
        currentCondition: roomIndex % 9 === 0 ? 'Can kiem tra lai' : 'Tot',
        note: 'Tai san phong demo.',
      })),
    ),
    skipDuplicates: true,
  });
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
