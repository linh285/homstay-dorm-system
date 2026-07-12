import type { RentalMode, RentalRequestStatus } from '../../src/generated/prisma/client.js';
import { PLANNED_PARTICIPATION_STATUS, roomTypes } from './constants.js';
import {
  addDays,
  byBranch,
  dateOnly,
  eligibilityResult,
  pick,
  type DbClient,
  type SeedContext,
  pad,
} from './helpers.js';

export async function seedRentalRequests(db: DbClient, ctx: SeedContext): Promise<void> {
  for (let index = 1; index <= ctx.config.rentalRequests; index += 1) {
    const branch = pick(ctx.branches, index - 1);
    const expectedResidents = 1 + (index % 4);
    const rentalMode = requestRentalMode(index);
    const representative = representativeForRequest(ctx, index);
    const sale = byBranch(ctx.salesByBranch, branch.id, index);

    ctx.rentalRequests.push({
      id: `RR${pad(index)}`,
      branchId: branch.id,
      representativeId: representative.id,
      saleEmployeeId: sale.id,
      expectedResidents,
      rentalMode,
      status: requestStatus(index),
    });
  }

  await db.rentalRequest.createMany({
    data: ctx.rentalRequests.map((request, index) => ({
      id: request.id,
      representativeId: request.representativeId,
      branchId: request.branchId,
      saleEmployeeId: request.saleEmployeeId,
      registeredAt: index === 0 ? ctx.now : addDays(ctx.now, -(index % 45)),
      expectedResidents: request.expectedResidents,
      rentalMode: request.rentalMode,
      preferredRoomType: pick(roomTypes, index),
      maximumBudget: 2500000 + (index % 8) * 300000,
      expectedCheckInDate: dateOnly(addDays(ctx.now, 5 + (index % 40))),
      rentalDurationMonths: pick([3, 6, 9, 12], index),
      genderRequirement: pick(['MALE', 'FEMALE', 'ANY'], index),
      requiresAirConditioner: index % 2 === 0,
      requiresParking: index % 3 === 0,
      quietPreference: index % 4 === 0,
      acceptsSharedBeds: request.rentalMode === 'SHARED_BEDS',
      livingSchedule: 'Di hoc/di lam gio hanh chinh.',
      note: rentalRequestNote(index + 1),
      status: request.status,
    })),
    skipDuplicates: true,
  });

  await seedRequestMembers(db, ctx);
}

async function seedRequestMembers(db: DbClient, ctx: SeedContext): Promise<void> {
  const memberRows = ctx.rentalRequests.flatMap((request, requestIndex) => {
    const enoughMembers = requestIndex < 3 || requestIndex % 5 !== 0;
    const memberCount = enoughMembers ? request.expectedResidents : Math.max(0, request.expectedResidents - 1);
    const plannedBeds =
      requestIndex % 4 === 0
        ? Array.from({ length: Math.max(1, memberCount) }, (_unused, bedIndex) =>
            pick(ctx.beds, requestIndex * 3 + bedIndex),
          )
        : [];

    return Array.from({ length: memberCount }, (_unused, memberIndex) => {
      const customer = pick(ctx.individuals, requestIndex * 4 + memberIndex);
      const manager = byBranch(ctx.managersByBranch, request.branchId, requestIndex);
      const approved = request.status === 'DEPOSIT_PROCESS' || requestIndex % 6 === 0;

      return {
        rentalRequestId: request.id,
        customerId: customer.id,
        isRepresentative: customer.id === request.representativeId,
        plannedBedId: plannedBeds[memberIndex]?.id ?? null,
        identityChecked: approved,
        eligibilityResult: approved ? eligibilityResult(requestIndex + memberIndex) : 'NOT_REVIEWED',
        rejectionReason: approved && (requestIndex + memberIndex) % 11 === 0 ? 'Khong du dieu kien cu tru.' : null,
        approvedById: approved ? manager.id : null,
        approvedAt: approved ? addDays(ctx.now, -2) : null,
        participationStatus: PLANNED_PARTICIPATION_STATUS,
      };
    });
  });

  await db.requestMember.createMany({
    data: memberRows,
    skipDuplicates: true,
  });
}

function requestRentalMode(index: number): RentalMode {
  if (index === 2) {
    return 'WHOLE_ROOM';
  }

  if (index === 3) {
    return 'SHARED_BEDS';
  }

  return index % 4 === 0 ? 'WHOLE_ROOM' : 'SHARED_BEDS';
}

function requestStatus(index: number): RentalRequestStatus {
  if (index <= 3) {
    return 'ACTIVE';
  }

  return pick(['ACTIVE', 'VIEWING', 'DEPOSIT_PROCESS', 'CLOSED'], index) as RentalRequestStatus;
}

function representativeForRequest(ctx: SeedContext, index: number) {
  if (index % 5 === 0 && ctx.organizations.length > 0) {
    return pick(ctx.organizations, index);
  }

  return pick(ctx.individuals, index);
}

function rentalRequestNote(index: number): string | null {
  if (index === 1) {
    return 'DEMO-RR-NEW: yeu cau ACTIVE moi trong ngay.';
  }

  if (index === 2) {
    return 'DEMO-RR-WHOLE-ROOM: du thanh vien, phu hop thue nguyen phong.';
  }

  if (index === 3) {
    return 'DEMO-RR-SHARED-BEDS: du thanh vien, phu hop thue ghep.';
  }

  return null;
}
