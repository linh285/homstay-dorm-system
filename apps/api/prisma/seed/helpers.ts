import bcrypt from 'bcrypt';

import type {
  AllocationStatus,
  AllocationType,
  CheckoutStatus,
  ContractStatus,
  CustomerType,
  DeductionSource,
  DepositStatus,
  EligibilityResult,
  HandoverStatus,
  InspectionResult,
  PaymentMethod,
  PaymentType,
  Prisma,
  RentalMode,
  RentalRequestStatus,
  Role,
  SettlementResult,
  TransactionDirection,
  ViewingResult,
  ViewingStatus,
} from '../../src/generated/prisma/client.js';
import {
  DEFAULT_PASSWORD,
  DEFAULT_PROFILE,
  type ProfileConfig,
  type SeedProfile,
  profileConfigs,
} from './constants.js';

export type DbClient = Prisma.TransactionClient;

export type BranchSeed = {
  id: string;
  name: string;
};

export type EmployeeSeed = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  branchId: string | null;
};

export type RoomSeed = {
  id: string;
  branchId: string;
  name: string;
  maximumCapacity: number;
  roomType: string;
  monthlyRent: number;
};

export type BedSeed = {
  id: string;
  roomId: string;
  branchId: string;
  name: string;
  monthlyRent: number;
};

export type CustomerSeed = {
  id: string;
  customerType: CustomerType;
};

export type RentalRequestSeed = {
  id: string;
  branchId: string;
  representativeId: string;
  saleEmployeeId: string;
  expectedResidents: number;
  rentalMode: RentalMode;
  status: RentalRequestStatus;
};

export type DepositSeed = {
  id: string;
  rentalRequestId: string;
  branchId: string;
  saleEmployeeId: string;
  status: DepositStatus;
  rentalMode: RentalMode;
  selectedBedIds: string[];
  totalDepositAmount: number;
};

export type ContractSeed = {
  id: string;
  depositId: string;
  branchId: string;
  saleEmployeeId: string;
  status: ContractStatus;
  bedIds: string[];
  startsOn: Date;
  endsOn: Date;
  totalMonthlyRent: number;
};

export type HandoverSeed = {
  id: string;
  contractId: string;
  status: HandoverStatus;
};

export type CheckoutSeed = {
  id: string;
  depositId: string;
  contractId: string | null;
  branchId: string;
  status: CheckoutStatus;
};

export type AllocationSeed = {
  id: string;
  bedId: string;
  depositId: string | null;
  contractId: string | null;
  allocationType: AllocationType;
  status: AllocationStatus;
  startedAt: Date;
  expiresAt: Date | null;
  endedAt: Date | null;
};

export type SeedContext = {
  profile: SeedProfile;
  config: ProfileConfig;
  now: Date;
  passwordHash: string;
  branches: BranchSeed[];
  employees: EmployeeSeed[];
  salesByBranch: Map<string, EmployeeSeed[]>;
  accountantsByBranch: Map<string, EmployeeSeed[]>;
  managersByBranch: Map<string, EmployeeSeed[]>;
  admins: EmployeeSeed[];
  rooms: RoomSeed[];
  beds: BedSeed[];
  customers: CustomerSeed[];
  individuals: CustomerSeed[];
  organizations: CustomerSeed[];
  rentalRequests: RentalRequestSeed[];
  deposits: DepositSeed[];
  contracts: ContractSeed[];
  handovers: HandoverSeed[];
  checkouts: CheckoutSeed[];
  allocations: AllocationSeed[];
  nextBedIndex: number;
  allocatedBedIds: Set<string>;
};

export const demoPaymentStatuses = {
  WAITING_PAYMENT: 'WAITING_PAYMENT',
  WAITING_MANAGER_CONFIRMATION: 'WAITING_MANAGER_CONFIRMATION',
  PAYMENT_RECHECK: 'PAYMENT_RECHECK',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  CONFIRMED: 'CONFIRMED',
} as const;

export function parseSeedProfile(value: string | undefined): SeedProfile {
  if (value === 'small' || value === 'demo' || value === 'large') {
    return value;
  }

  return DEFAULT_PROFILE;
}

export async function createSeedContext(): Promise<SeedContext> {
  const profile = parseSeedProfile(process.env.SEED_PROFILE);
  const password = process.env.SEED_PASSWORD ?? DEFAULT_PASSWORD;

  return {
    profile,
    config: profileConfigs[profile],
    now: new Date('2026-07-12T09:00:00+07:00'),
    passwordHash: await bcrypt.hash(password, 12),
    branches: [],
    employees: [],
    salesByBranch: new Map(),
    accountantsByBranch: new Map(),
    managersByBranch: new Map(),
    admins: [],
    rooms: [],
    beds: [],
    customers: [],
    individuals: [],
    organizations: [],
    rentalRequests: [],
    deposits: [],
    contracts: [],
    handovers: [],
    checkouts: [],
    allocations: [],
    nextBedIndex: 0,
    allocatedBedIds: new Set(),
  };
}

export function pad(value: number, size = 3): string {
  return value.toString().padStart(size, '0');
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + hours);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function pick<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new Error('Cannot pick from an empty collection.');
  }

  return item;
}

export function byBranch(map: Map<string, EmployeeSeed[]>, branchId: string, index: number): EmployeeSeed {
  const employees = map.get(branchId);
  if (!employees || employees.length === 0) {
    throw new Error(`Missing employee for branch ${branchId}.`);
  }

  return pick(employees, index);
}

export function nextBeds(ctx: SeedContext, count: number): BedSeed[] {
  return nextBedsFrom(ctx, count, ctx.beds);
}

export function nextBedsForBranch(ctx: SeedContext, branchId: string, count: number): BedSeed[] {
  return nextBedsFrom(
    ctx,
    count,
    ctx.beds.filter((bed) => bed.branchId === branchId),
  );
}

function nextBedsFrom(ctx: SeedContext, count: number, sourceBeds: BedSeed[]): BedSeed[] {
  const beds: BedSeed[] = [];

  for (const bed of sourceBeds) {
    if (!bed || ctx.allocatedBedIds.has(bed.id)) {
      continue;
    }

    beds.push(bed);
    ctx.allocatedBedIds.add(bed.id);
    const globalIndex = ctx.beds.findIndex((item) => item.id === bed.id);
    ctx.nextBedIndex = Math.max(ctx.nextBedIndex, globalIndex + 1);

    if (beds.length === count) {
      break;
    }
  }

  if (beds.length < count) {
    throw new Error(`Not enough demo beds to allocate ${count} more beds.`);
  }

  return beds;
}

export function nextWholeRoomBeds(ctx: SeedContext): BedSeed[] {
  return nextWholeRoomBedsFrom(ctx, ctx.rooms);
}

export function nextWholeRoomBedsForBranch(ctx: SeedContext, branchId: string): BedSeed[] {
  return nextWholeRoomBedsFrom(
    ctx,
    ctx.rooms.filter((room) => room.branchId === branchId),
  );
}

function nextWholeRoomBedsFrom(ctx: SeedContext, sourceRooms: RoomSeed[]): BedSeed[] {
  for (const room of sourceRooms) {
    const roomBeds = ctx.beds.filter((bed) => bed.roomId === room.id);
    if (roomBeds.length > 0 && roomBeds.every((bed) => !ctx.allocatedBedIds.has(bed.id))) {
      for (const bed of roomBeds) {
        ctx.allocatedBedIds.add(bed.id);
      }

      const lastIndex = ctx.beds.findIndex((bed) => bed.id === roomBeds.at(-1)?.id);
      ctx.nextBedIndex = Math.max(ctx.nextBedIndex, lastIndex + 1);

      return roomBeds;
    }
  }

  throw new Error('No complete demo room is available for whole-room allocation.');
}

export function amountForBeds(ctx: SeedContext, bedIds: string[]): number {
  return bedIds.reduce((total, bedId) => {
    const bed = ctx.beds.find((item) => item.id === bedId);
    if (!bed) {
      throw new Error(`Unknown bed ${bedId}.`);
    }

    return total + bed.monthlyRent;
  }, 0);
}

export function branchRooms(ctx: SeedContext, branchId: string): RoomSeed[] {
  return ctx.rooms.filter((room) => room.branchId === branchId);
}

export function ensureDemoEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run demo seed when NODE_ENV=production.');
  }
}

export async function resetDemoDataIfAllowed(db: DbClient): Promise<void> {
  if (process.env.ALLOW_DEMO_RESET !== 'true') {
    return;
  }

  await db.deduction.deleteMany();
  await db.paymentDetail.deleteMany();
  await db.payment.deleteMany();
  await db.settlement.deleteMany();
  await db.checkoutInspectionItem.deleteMany();
  await db.checkoutInspection.deleteMany();
  await db.checkoutRequest.deleteMany();
  await db.handoverAsset.deleteMany();
  await db.handover.deleteMany();
  await db.contractService.deleteMany();
  await db.contractBed.deleteMany();
  await db.bedAllocation.deleteMany();
  await db.contract.deleteMany();
  await db.depositDetail.deleteMany();
  await db.deposit.deleteMany();
  await db.viewingDetail.deleteMany();
  await db.viewing.deleteMany();
  await db.requestMember.deleteMany();
  await db.rentalRequest.deleteMany();
  await db.customer.deleteMany();
  await db.roomAsset.deleteMany();
  await db.roomService.deleteMany();
  await db.assetType.deleteMany();
  await db.service.deleteMany();
  await db.bed.deleteMany();
  await db.room.deleteMany();
  await db.account.deleteMany();
  await db.employee.deleteMany();
  await db.branch.deleteMany();
}

export function viewingStatus(index: number): ViewingStatus {
  return pick(
    ['CONFIRMED', 'SCHEDULED', 'VISITED', 'RESULT_RECORDED', 'CANCELLED', 'NO_SHOW'],
    index,
  ) as ViewingStatus;
}

export function viewingResult(status: ViewingStatus, index: number): ViewingResult | null {
  if (status !== 'RESULT_RECORDED' && status !== 'VISITED') {
    return null;
  }

  return pick(
    [
      'CUSTOMER_WANTS_DEPOSIT',
      'WANTS_MORE_VIEWINGS',
      'WANTS_TO_CHANGE_CRITERIA',
      'UNDECIDED',
      'NOT_INTERESTED',
    ],
    index,
  ) as ViewingResult;
}

export function eligibilityResult(index: number): EligibilityResult {
  return pick(['NOT_REVIEWED', 'ELIGIBLE', 'INELIGIBLE'], index) as EligibilityResult;
}

export function paymentMethod(index: number): PaymentMethod {
  return pick(['CASH', 'BANK_TRANSFER'], index) as PaymentMethod;
}

export function paymentDirection(type: PaymentType): TransactionDirection {
  return type === 'DEPOSIT_REFUND' ? 'OUTBOUND' : 'INBOUND';
}

export function inspectionResult(index: number): InspectionResult {
  return pick(
    ['NORMAL', 'DAMAGED', 'MISSING', 'CLEANING_REQUIRED', 'OTHER_VIOLATION'],
    index,
  ) as InspectionResult;
}

export function deductionSource(index: number): DeductionSource {
  return pick(['DEBT', 'INSPECTION', 'VIOLATION', 'MANUAL'], index) as DeductionSource;
}

export function settlementResult(finalBalance: number): SettlementResult {
  if (finalBalance > 0) {
    return 'REFUND_TO_CUSTOMER';
  }

  if (finalBalance < 0) {
    return 'CUSTOMER_PAYS_ADDITIONAL';
  }

  return 'NO_BALANCE';
}
