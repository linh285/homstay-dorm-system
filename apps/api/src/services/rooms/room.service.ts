import { randomBytes } from 'node:crypto';

import type { Prisma } from '../../generated/prisma/client.js';
import { RoomRepository } from '../../data/repositories/room.repository.js';
import { withTransaction } from '../../data/prisma/transaction.js';
import {
  assertBranchAccess,
  type BranchScopedUser,
} from '../authorization/branch-access.js';
import { AppError } from '../../shared/app-error.js';
import type {
  createBedSchema,
  createRoomSchema,
  listRoomsSchema,
  roomAssetsSchema,
  roomServicesSchema,
  updateBedSchema,
  updateRoomSchema,
} from '../../presentation/validators/room.validator.js';
import type { z } from 'zod';

type ListRoomsInput = z.infer<typeof listRoomsSchema>;
type CreateRoomInput = z.infer<typeof createRoomSchema>;
type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
type CreateBedInput = z.infer<typeof createBedSchema>;
type UpdateBedInput = z.infer<typeof updateBedSchema>;
type RoomServicesInput = z.infer<typeof roomServicesSchema>;
type RoomAssetsInput = z.infer<typeof roomAssetsSchema>;

type BedBusinessStatus =
  | 'AVAILABLE'
  | 'HELD'
  | 'DEPOSITED'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE';

function bedBusinessStatus(
  operationalStatus: string,
  activeAllocations: { allocationType: string }[],
): BedBusinessStatus {
  const active = activeAllocations[0];
  if (active) return active.allocationType as BedBusinessStatus;
  if (operationalStatus !== 'ACTIVE')
    return operationalStatus as BedBusinessStatus;
  return 'AVAILABLE';
}

export class RoomService {
  constructor(private readonly repository = new RoomRepository()) {}

  async list(user: BranchScopedUser, input: ListRoomsInput) {
    const branchScope = this.readBranchScope(user, input.branchId);
    const bedFilters: Prisma.BedWhereInput = {};
    if (input.minPrice) {
      bedFilters.monthlyRent = {
        ...(bedFilters.monthlyRent as object),
        gte: input.minPrice,
      };
    }
    if (input.maxPrice) {
      bedFilters.monthlyRent = {
        ...(bedFilters.monthlyRent as object),
        lte: input.maxPrice,
      };
    }
    const where: Prisma.RoomWhereInput = {
      ...(branchScope ? { branchId: branchScope } : {}),
      ...(input.area
        ? { area: { contains: input.area, mode: 'insensitive' } }
        : {}),
      ...(input.floor !== undefined ? { floor: input.floor } : {}),
      ...(input.roomType
        ? { roomType: { contains: input.roomType, mode: 'insensitive' } }
        : {}),
      ...(input.genderPolicy ? { genderPolicy: input.genderPolicy } : {}),
      ...(input.hasAirConditioner !== undefined
        ? { hasAirConditioner: input.hasAirConditioner }
        : {}),
      ...(input.hasParking !== undefined
        ? { hasParking: input.hasParking }
        : {}),
      ...(input.operationalStatus
        ? { operationalStatus: input.operationalStatus }
        : {}),
      ...(Object.keys(bedFilters).length ? { beds: { some: bedFilters } } : {}),
      ...(input.hasAvailability
        ? {
            beds: {
              some: {
                ...bedFilters,
                operationalStatus: 'ACTIVE',
                allocations: { none: { status: 'ACTIVE' } },
              },
            },
          }
        : {}),
    };
    const [rooms, totalItems] = await this.repository.findMany(
      where,
      input.page,
      input.pageSize,
    );
    const items = rooms.map((room) => {
      const availableBeds = room.beds.filter(
        (bed) =>
          bed.operationalStatus === 'ACTIVE' && bed.allocations.length === 0,
      ).length;
      const rents = room.beds.map((bed) => Number(bed.monthlyRent));
      return {
        id: room.id,
        name: room.name,
        branch: room.branch,
        area: room.area,
        floor: room.floor,
        roomType: room.roomType,
        maximumCapacity: room.maximumCapacity,
        genderPolicy: room.genderPolicy,
        hasAirConditioner: room.hasAirConditioner,
        hasParking: room.hasParking,
        operationalStatus: room.operationalStatus,
        totalBeds: room.beds.length,
        availableBeds,
        minRent: rents.length ? Math.min(...rents).toFixed(2) : null,
        maxRent: rents.length ? Math.max(...rents).toFixed(2) : null,
      };
    });
    return { items, totalItems, page: input.page, pageSize: input.pageSize };
  }

  async get(user: BranchScopedUser, id: string) {
    const room = await this.repository.findById(id);
    if (!room) throw new AppError(404, 'NOT_FOUND', 'Room was not found.');
    assertBranchAccess(user, room.branchId);
    return this.toRoomDetail(room);
  }

  async availability(user: BranchScopedUser, id: string) {
    const room = await this.repository.findById(id);
    if (!room) throw new AppError(404, 'NOT_FOUND', 'Room was not found.');
    assertBranchAccess(user, room.branchId);
    return {
      roomId: room.id,
      beds: room.beds.map((bed) => ({
        id: bed.id,
        name: bed.name,
        monthlyRent: bed.monthlyRent.toFixed(2),
        operationalStatus: bed.operationalStatus,
        businessStatus: bedBusinessStatus(
          bed.operationalStatus,
          bed.allocations,
        ),
      })),
    };
  }

  async create(user: BranchScopedUser, input: CreateRoomInput) {
    const branchId = this.getManagerBranchId(user);
    if (input.branchId !== branchId) {
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'A room must belong to your branch.',
      );
    }
    const room = await withTransaction((transaction) =>
      this.repository.createRoom(
        {
          id: this.createId('ROM'),
          branchId,
          name: input.name,
          area: input.area ?? null,
          floor: input.floor ?? null,
          roomType: input.roomType ?? null,
          maximumCapacity: input.maximumCapacity,
          genderPolicy: input.genderPolicy ?? null,
          hasAirConditioner: input.hasAirConditioner ?? false,
          hasParking: input.hasParking ?? false,
          curfew: input.curfew ?? null,
          quietLevel: input.quietLevel ?? null,
          rules: input.rules ?? null,
          operationalStatus: input.operationalStatus,
          note: input.note ?? null,
        },
        transaction,
      ),
    );
    return this.toRoomDetail(room);
  }

  async update(user: BranchScopedUser, id: string, input: UpdateRoomInput) {
    const branchId = this.getManagerBranchId(user);
    return withTransaction(async (transaction) => {
      const room = await this.repository.findById(id, transaction);
      if (!room) throw new AppError(404, 'NOT_FOUND', 'Room was not found.');
      if (room.branchId !== branchId) {
        throw new AppError(
          403,
          'BRANCH_ACCESS_DENIED',
          'You can only manage rooms in your branch.',
        );
      }
      if (
        input.operationalStatus &&
        input.operationalStatus !== 'ACTIVE' &&
        room.operationalStatus === 'ACTIVE'
      ) {
        const allocations = await this.repository.activeAllocationsForRoom(
          id,
          transaction,
        );
        this.assertNoProtectedAllocation(allocations);
      }
      const updated = await this.repository.updateRoom(
        id,
        {
          name: input.name,
          area: input.area,
          floor: input.floor,
          roomType: input.roomType,
          maximumCapacity: input.maximumCapacity,
          genderPolicy: input.genderPolicy,
          hasAirConditioner: input.hasAirConditioner,
          hasParking: input.hasParking,
          curfew: input.curfew,
          quietLevel: input.quietLevel,
          rules: input.rules,
          operationalStatus: input.operationalStatus,
          note: input.note,
        },
        transaction,
      );
      return this.toRoomDetail(updated);
    });
  }

  async addBed(user: BranchScopedUser, roomId: string, input: CreateBedInput) {
    const branchId = this.getManagerBranchId(user);
    return withTransaction(async (transaction) => {
      const room = await this.repository.findBranchOfRoom(roomId, transaction);
      if (!room) throw new AppError(404, 'NOT_FOUND', 'Room was not found.');
      if (room.branchId !== branchId) {
        throw new AppError(
          403,
          'BRANCH_ACCESS_DENIED',
          'You can only manage rooms in your branch.',
        );
      }
      const existing = await this.repository.findBedByName(
        roomId,
        input.name,
        transaction,
      );
      if (existing) {
        throw new AppError(
          409,
          'BED_NAME_TAKEN',
          'A bed with this name already exists in the room.',
        );
      }
      const bed = await this.repository.createBed(
        {
          id: this.createId('BED'),
          roomId,
          name: input.name,
          monthlyRent: input.monthlyRent,
          operationalStatus: input.operationalStatus,
          note: input.note ?? null,
        },
        transaction,
      );
      return { ...bed, monthlyRent: bed.monthlyRent.toFixed(2) };
    });
  }

  async updateBed(
    user: BranchScopedUser,
    bedId: string,
    input: UpdateBedInput,
  ) {
    const branchId = this.getManagerBranchId(user);
    return withTransaction(async (transaction) => {
      const bed = await this.repository.findBedById(bedId, transaction);
      if (!bed) throw new AppError(404, 'NOT_FOUND', 'Bed was not found.');
      if (bed.room.branchId !== branchId) {
        throw new AppError(
          403,
          'BRANCH_ACCESS_DENIED',
          'You can only manage beds in your branch.',
        );
      }
      if (
        input.operationalStatus &&
        input.operationalStatus !== 'ACTIVE' &&
        bed.operationalStatus === 'ACTIVE'
      ) {
        this.assertNoProtectedAllocation(bed.allocations);
      }
      if (input.name && input.name !== bed.name) {
        const existing = await this.repository.findBedByName(
          bed.roomId,
          input.name,
          transaction,
        );
        if (existing) {
          throw new AppError(
            409,
            'BED_NAME_TAKEN',
            'A bed with this name already exists in the room.',
          );
        }
      }
      const updated = await this.repository.updateBed(
        bedId,
        {
          name: input.name,
          monthlyRent: input.monthlyRent,
          operationalStatus: input.operationalStatus,
          note: input.note,
        },
        transaction,
      );
      return { ...updated, monthlyRent: updated.monthlyRent.toFixed(2) };
    });
  }

  listServices() {
    return this.repository.listServices().then((services) =>
      services.map((service) => ({
        ...service,
        unitPrice: service.unitPrice.toFixed(2),
      })),
    );
  }

  listAssetTypes() {
    return this.repository.listAssetTypes();
  }

  async getAssets(user: BranchScopedUser, roomId: string) {
    const room = await this.repository.findBranchOfRoom(roomId);
    if (!room) throw new AppError(404, 'NOT_FOUND', 'Room was not found.');
    assertBranchAccess(user, room.branchId);
    const assets = await this.repository.listRoomAssets(roomId);
    return assets.map((asset) => ({ ...asset }));
  }

  async replaceServices(
    user: BranchScopedUser,
    roomId: string,
    input: RoomServicesInput,
  ) {
    const branchId = this.getManagerBranchId(user);
    return withTransaction(async (transaction) => {
      const room = await this.repository.findBranchOfRoom(roomId, transaction);
      if (!room) throw new AppError(404, 'NOT_FOUND', 'Room was not found.');
      if (room.branchId !== branchId) {
        throw new AppError(
          403,
          'BRANCH_ACCESS_DENIED',
          'You can only manage rooms in your branch.',
        );
      }
      const ids = input.services.map((item) => item.serviceId);
      this.assertUniqueIds(ids, 'DUPLICATE_SERVICE');
      if (ids.length) {
        const found = await this.repository.findServicesByIds(ids, transaction);
        if (found.length !== ids.length) {
          throw new AppError(
            422,
            'SERVICE_NOT_FOUND',
            'One or more services do not exist.',
          );
        }
      }
      await this.repository.replaceRoomServices(
        roomId,
        input.services.map((item) => ({
          roomId,
          serviceId: item.serviceId,
          customPrice: item.customPrice ?? null,
          note: item.note ?? null,
        })),
        transaction,
      );
      const rows = await this.repository.listRoomServices(roomId, transaction);
      return rows.map((row) => this.toRoomServiceDto(row));
    });
  }

  async replaceAssets(
    user: BranchScopedUser,
    roomId: string,
    input: RoomAssetsInput,
  ) {
    const branchId = this.getManagerBranchId(user);
    return withTransaction(async (transaction) => {
      const room = await this.repository.findBranchOfRoom(roomId, transaction);
      if (!room) throw new AppError(404, 'NOT_FOUND', 'Room was not found.');
      if (room.branchId !== branchId) {
        throw new AppError(
          403,
          'BRANCH_ACCESS_DENIED',
          'You can only manage rooms in your branch.',
        );
      }
      const protectedCount = await this.repository.hasProtectedRoomAssets(
        roomId,
        transaction,
      );
      if (protectedCount > 0) {
        throw new AppError(
          422,
          'ROOM_ASSET_IN_USE',
          'Room assets are referenced by handover or inspection records and cannot be replaced.',
        );
      }
      const ids = input.assets.map((item) => item.assetTypeId);
      this.assertUniqueIds(ids, 'DUPLICATE_ASSET_TYPE');
      if (ids.length) {
        const found = await this.repository.findAssetTypesByIds(
          ids,
          transaction,
        );
        if (found.length !== ids.length) {
          throw new AppError(
            422,
            'ASSET_TYPE_NOT_FOUND',
            'One or more asset types do not exist.',
          );
        }
      }
      await this.repository.replaceRoomAssets(
        roomId,
        input.assets.map((item) => ({
          id: this.createId('RAS'),
          roomId,
          assetTypeId: item.assetTypeId,
          quantity: item.quantity,
          currentCondition: item.currentCondition ?? null,
          note: item.note ?? null,
        })),
        transaction,
      );
      const rows = await this.repository.listRoomAssets(roomId, transaction);
      return rows.map((row) => ({ ...row }));
    });
  }

  private toRoomDetail(room: Awaited<ReturnType<RoomRepository['findById']>>) {
    if (!room) throw new AppError(404, 'NOT_FOUND', 'Room was not found.');
    return {
      id: room.id,
      branch: room.branch,
      branchId: room.branchId,
      name: room.name,
      area: room.area,
      floor: room.floor,
      roomType: room.roomType,
      maximumCapacity: room.maximumCapacity,
      genderPolicy: room.genderPolicy,
      hasAirConditioner: room.hasAirConditioner,
      hasParking: room.hasParking,
      curfew: room.curfew,
      quietLevel: room.quietLevel,
      rules: room.rules,
      operationalStatus: room.operationalStatus,
      note: room.note,
      beds: room.beds.map((bed) => ({
        id: bed.id,
        name: bed.name,
        monthlyRent: bed.monthlyRent.toFixed(2),
        operationalStatus: bed.operationalStatus,
        note: bed.note,
        businessStatus: bedBusinessStatus(
          bed.operationalStatus,
          bed.allocations,
        ),
      })),
      services: room.services.map((row) => this.toRoomServiceDto(row)),
      assets: room.assets.map((asset) => ({
        id: asset.id,
        assetTypeId: asset.assetTypeId,
        assetType: asset.assetType,
        quantity: asset.quantity,
        currentCondition: asset.currentCondition,
        note: asset.note,
      })),
    };
  }

  private toRoomServiceDto(row: {
    serviceId: string;
    customPrice: { toFixed(digits: number): string } | null;
    note: string | null;
    service: { unitPrice: { toFixed(digits: number): string } } & Record<
      string,
      unknown
    >;
  }) {
    return {
      serviceId: row.serviceId,
      customPrice: row.customPrice ? row.customPrice.toFixed(2) : null,
      note: row.note,
      service: { ...row.service, unitPrice: row.service.unitPrice.toFixed(2) },
    };
  }

  private assertNoProtectedAllocation(
    allocations: { allocationType: string }[],
  ) {
    const protectedTypes = new Set(['DEPOSITED', 'OCCUPIED']);
    if (allocations.some((item) => protectedTypes.has(item.allocationType))) {
      throw new AppError(
        422,
        'ROOM_HAS_ACTIVE_ALLOCATION',
        'A room or bed with a deposited or occupied allocation cannot be taken out of service.',
      );
    }
  }

  private assertUniqueIds(ids: string[], code: string) {
    if (new Set(ids).size !== ids.length) {
      throw new AppError(422, code, 'Duplicate entries are not allowed.');
    }
  }

  private readBranchScope(
    user: BranchScopedUser,
    requestedBranchId?: string,
  ): string | undefined {
    if (user.role === 'ADMIN') return requestedBranchId;
    if (!['SALE', 'MANAGER'].includes(user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You cannot view rooms.');
    }
    if (!user.branchId) {
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'You must belong to a branch.',
      );
    }
    if (requestedBranchId && requestedBranchId !== user.branchId) {
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'You cannot view rooms of another branch.',
      );
    }
    return user.branchId;
  }

  private getManagerBranchId(user: BranchScopedUser): string {
    if (user.role !== 'MANAGER') {
      throw new AppError(403, 'FORBIDDEN', 'Only MANAGER can manage rooms.');
    }
    if (!user.branchId) {
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'MANAGER must belong to a branch.',
      );
    }
    return user.branchId;
  }

  private createId(prefix: string): string {
    return `${prefix}-${randomBytes(8).toString('hex')}`;
  }
}
