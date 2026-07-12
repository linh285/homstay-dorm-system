import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { PaymentStatus } from '../../shared/payment-status.js';
import { prisma } from '../prisma/client.js';

type DatabaseClient = PrismaClient;

const employeeInclude = {
  account: { select: { username: true } },
  branch: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeInclude;

const branchSelect = {
  id: true,
  name: true,
  address: true,
  phone: true,
  email: true,
  accountHolderName: true,
  bankAccountNumber: true,
  bankName: true,
  bankTransferInstruction: true,
  status: true,
  _count: { select: { employees: true, rooms: true } },
} satisfies Prisma.BranchSelect;

function paymentScope(branchId?: string): Prisma.PaymentWhereInput {
  if (!branchId) return {};
  return {
    OR: [
      { deposit: { rentalRequest: { branchId } } },
      { contract: { deposit: { rentalRequest: { branchId } } } },
      {
        settlement: {
          checkoutRequest: { deposit: { rentalRequest: { branchId } } },
        },
      },
    ],
  };
}

export class AdminRepository {
  listEmployees() {
    return prisma.employee.findMany({
      include: employeeInclude,
      orderBy: [{ branchId: 'asc' }, { id: 'asc' }],
    });
  }

  listBranches() {
    return prisma.branch.findMany({
      select: branchSelect,
      orderBy: { id: 'asc' },
    });
  }

  findBranch(id: string) {
    return prisma.branch.findUnique({ where: { id }, select: branchSelect });
  }

  updateBranch(
    id: string,
    data: Prisma.BranchUpdateInput,
    client: DatabaseClient = prisma,
  ) {
    return client.branch.update({ where: { id }, data, select: branchSelect });
  }

  countBranches() {
    return prisma.branch.count();
  }

  countEmployees(branchId?: string) {
    return prisma.employee.count({
      where: branchId ? { branchId } : undefined,
    });
  }

  countRooms(branchId?: string) {
    return prisma.room.count({ where: branchId ? { branchId } : undefined });
  }

  findBedsWithActiveAllocations(branchId?: string) {
    return prisma.bed.findMany({
      where: branchId ? { room: { branchId } } : undefined,
      select: {
        id: true,
        allocations: {
          where: { status: 'ACTIVE' },
          select: { allocationType: true, status: true },
        },
      },
    });
  }

  countRentalRequests(
    branchId?: string,
    status?: Prisma.RentalRequestWhereInput['status'],
  ) {
    return prisma.rentalRequest.count({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {}),
      },
    });
  }

  countViewingsToday(
    branchId?: string,
    start: Date = new Date(),
    end: Date = new Date(),
  ) {
    return prisma.viewing.count({
      where: {
        startsAt: { gte: start, lt: end },
        ...(branchId ? { rentalRequest: { branchId } } : {}),
      },
    });
  }

  countDeposits(branchId?: string, statuses?: string[]) {
    return prisma.deposit.count({
      where: {
        ...(branchId ? { rentalRequest: { branchId } } : {}),
        ...(statuses?.length ? { status: { in: statuses as never[] } } : {}),
      },
    });
  }

  countContracts(branchId?: string, statuses?: string[]) {
    return prisma.contract.count({
      where: {
        ...(branchId ? { deposit: { rentalRequest: { branchId } } } : {}),
        ...(statuses?.length ? { status: { in: statuses as never[] } } : {}),
      },
    });
  }

  countCheckoutRequests(branchId?: string, statuses?: string[]) {
    return prisma.checkoutRequest.count({
      where: {
        ...(branchId ? { deposit: { rentalRequest: { branchId } } } : {}),
        ...(statuses?.length ? { status: { in: statuses as never[] } } : {}),
      },
    });
  }

  countSettlements(branchId?: string, statuses?: string[]) {
    return prisma.settlement.count({
      where: {
        ...(branchId
          ? { checkoutRequest: { deposit: { rentalRequest: { branchId } } } }
          : {}),
        ...(statuses?.length ? { status: { in: statuses as never[] } } : {}),
      },
    });
  }

  groupRentalRequestsByStatus(branchId?: string) {
    return prisma.rentalRequest.groupBy({
      by: ['status'],
      where: branchId ? { branchId } : undefined,
      _count: { _all: true },
    });
  }

  groupDepositsByStatus(branchId?: string) {
    return prisma.deposit.groupBy({
      by: ['status'],
      where: branchId ? { rentalRequest: { branchId } } : undefined,
      _count: { _all: true },
    });
  }

  financialTotals(branchId?: string) {
    return prisma.payment.findMany({
      where: {
        amountPaid: { not: null },
        status: PaymentStatus.CONFIRMED,
        ...paymentScope(branchId),
      },
      select: { paymentType: true, amountPaid: true, status: true },
    });
  }

  sumValidDepositAmount(branchId?: string) {
    return prisma.deposit.aggregate({
      where: {
        ...(branchId ? { rentalRequest: { branchId } } : {}),
        status: {
          notIn: ['ROOM_REJECTED', 'PAYMENT_REJECTED', 'EXPIRED', 'CANCELLED'],
        },
      },
      _sum: { totalDepositAmount: true },
    });
  }

  countDepositPaymentsExpiringWithin(
    branchId: string | undefined,
    start: Date,
    end: Date,
  ) {
    return prisma.payment.count({
      where: {
        paymentType: 'DEPOSIT',
        status: 'WAITING_PAYMENT',
        expiresAt: { gte: start, lte: end },
        ...paymentScope(branchId),
      },
    });
  }

  groupContractsByStatus(branchId?: string) {
    return prisma.contract.groupBy({
      by: ['status'],
      where: branchId ? { deposit: { rentalRequest: { branchId } } } : {},
      _count: { _all: true },
    });
  }

  groupCheckoutRequestsByStatus(branchId?: string) {
    return prisma.checkoutRequest.groupBy({
      by: ['status'],
      where: branchId ? { deposit: { rentalRequest: { branchId } } } : {},
      _count: { _all: true },
    });
  }

  listUpcomingCheckIns(branchId: string | undefined, start: Date, end: Date) {
    return prisma.deposit.findMany({
      where: {
        ...(branchId ? { rentalRequest: { branchId } } : {}),
        scheduledCheckInAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        status: true,
        scheduledCheckInAt: true,
        rentalRequest: { select: { id: true, branchId: true } },
      },
      orderBy: { scheduledCheckInAt: 'asc' },
      take: 20,
    });
  }

  listUpcomingCheckouts(branchId: string | undefined, start: Date, end: Date) {
    return prisma.checkoutRequest.findMany({
      where: {
        ...(branchId ? { deposit: { rentalRequest: { branchId } } } : {}),
        expectedCheckoutAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        status: true,
        expectedCheckoutAt: true,
        deposit: { select: { rentalRequest: { select: { branchId: true } } } },
      },
      orderBy: { expectedCheckoutAt: 'asc' },
      take: 20,
    });
  }

  financialSummaryPayments(branchId?: string) {
    return prisma.payment.groupBy({
      by: ['paymentType', 'direction'],
      where: {
        amountPaid: { not: null },
        status: 'CONFIRMED',
        ...paymentScope(branchId),
      },
      _sum: { amountPaid: true },
    });
  }

  listRentalRequestTasks(branchId: string, statuses: string[], take = 10) {
    return prisma.rentalRequest.findMany({
      where: { branchId, status: { in: statuses as never[] } },
      select: {
        id: true,
        status: true,
        registeredAt: true,
        expectedCheckInDate: true,
        representative: {
          select: {
            fullName: true,
            organizationName: true,
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
      take,
    });
  }

  listDepositTasks(branchId: string, statuses: string[], take = 10) {
    return prisma.deposit.findMany({
      where: {
        rentalRequest: { branchId },
        status: { in: statuses as never[] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        scheduledCheckInAt: true,
        payments: {
          select: { expiresAt: true },
          orderBy: { issuedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  listContractTasks(branchId: string, statuses: string[], take = 10) {
    return prisma.contract.findMany({
      where: {
        deposit: { rentalRequest: { branchId } },
        status: { in: statuses as never[] },
      },
      select: {
        id: true,
        status: true,
        startsOn: true,
      },
      orderBy: { startsOn: 'desc' },
      take,
    });
  }

  listCheckoutTasks(branchId: string, statuses: string[], take = 10) {
    return prisma.checkoutRequest.findMany({
      where: {
        deposit: { rentalRequest: { branchId } },
        status: { in: statuses as never[] },
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        expectedCheckoutAt: true,
      },
      orderBy: { requestedAt: 'desc' },
      take,
    });
  }

  listSettlementTasks(branchId: string, statuses: string[], take = 10) {
    return prisma.settlement.findMany({
      where: {
        checkoutRequest: { deposit: { rentalRequest: { branchId } } },
        status: { in: statuses as never[] },
      },
      select: {
        id: true,
        status: true,
        customerAgreedAt: true,
        checkoutRequest: { select: { requestedAt: true } },
      },
      orderBy: { checkoutRequest: { requestedAt: 'desc' } },
      take,
    });
  }

  listPaymentsDue(branchId: string, start: Date, end: Date, take = 10) {
    return prisma.payment.findMany({
      where: {
        expiresAt: { gte: start, lt: end },
        status: 'WAITING_PAYMENT',
        deposit: { rentalRequest: { branchId } },
      },
      select: {
        id: true,
        status: true,
        issuedAt: true,
        expiresAt: true,
      },
      orderBy: { expiresAt: 'asc' },
      take,
    });
  }

  listTodayViewings(branchId: string, start: Date, end: Date, take = 10) {
    return prisma.viewing.findMany({
      where: {
        rentalRequest: { branchId },
        startsAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { startsAt: 'asc' },
      take,
    });
  }

  listTodayScheduledCheckIns(
    branchId: string,
    start: Date,
    end: Date,
    take = 10,
  ) {
    return prisma.deposit.findMany({
      where: {
        rentalRequest: { branchId },
        scheduledCheckInAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        status: true,
        scheduledCheckInAt: true,
      },
      orderBy: { scheduledCheckInAt: 'asc' },
      take,
    });
  }

  listTodayHandovers(branchId: string, start: Date, end: Date, take = 10) {
    return prisma.handover.findMany({
      where: {
        contract: { deposit: { rentalRequest: { branchId } } },
        handedOverAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        status: true,
        handedOverAt: true,
      },
      orderBy: { handedOverAt: 'asc' },
      take,
    });
  }

  listTodayCheckouts(branchId: string, start: Date, end: Date, take = 10) {
    return prisma.checkoutRequest.findMany({
      where: {
        deposit: { rentalRequest: { branchId } },
        expectedCheckoutAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        status: true,
        expectedCheckoutAt: true,
      },
      orderBy: { expectedCheckoutAt: 'asc' },
      take,
    });
  }
}
