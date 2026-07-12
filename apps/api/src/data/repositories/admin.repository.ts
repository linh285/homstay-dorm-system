import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
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
        ...(branchId ? { deposit: { rentalRequest: { branchId } } } : {}),
      },
      select: { paymentType: true, amountPaid: true, status: true },
    });
  }
}
