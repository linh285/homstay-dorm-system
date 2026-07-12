import type { Prisma } from '../../generated/prisma/client.js';
import { PaymentStatus } from '../../shared/payment-status.js';
import { prisma } from '../prisma/client.js';

export type ReportScope = { branchId?: string };

function branchFilter(branchId?: string): Prisma.RoomWhereInput {
  return branchId ? { branchId } : {};
}

function paymentBranchFilter(branchId?: string): Prisma.PaymentWhereInput {
  if (!branchId) return {};
  return {
    OR: [
      { deposit: { is: { rentalRequest: { is: { branchId } } } } },
      {
        contract: {
          is: { deposit: { is: { rentalRequest: { is: { branchId } } } } },
        },
      },
      {
        settlement: {
          is: {
            checkoutRequest: {
              is: { deposit: { is: { rentalRequest: { is: { branchId } } } } },
            },
          },
        },
      },
    ],
  };
}

export class ReportingRepository {
  async getBedCounts(scope: ReportScope) {
    const roomWhere = branchFilter(scope.branchId);
    const allocationWhere: Prisma.BedAllocationWhereInput = {
      status: 'ACTIVE',
      ...(scope.branchId
        ? { bed: { room: { branchId: scope.branchId } } }
        : {}),
    };
    const [rooms, beds, allocations] = await Promise.all([
      prisma.room.count({ where: roomWhere }),
      prisma.bed.count({
        where: scope.branchId ? { room: { branchId: scope.branchId } } : {},
      }),
      prisma.bedAllocation.groupBy({
        by: ['allocationType'],
        where: allocationWhere,
        _count: { _all: true },
      }),
    ]);
    const totals = Object.fromEntries(
      allocations.map((item) => [item.allocationType, item._count._all]),
    );
    const held = totals.HELD ?? 0;
    const deposited = totals.DEPOSITED ?? 0;
    const occupied = totals.OCCUPIED ?? 0;
    return {
      rooms,
      beds,
      available: Math.max(0, beds - held - deposited - occupied),
      held,
      deposited,
      occupied,
    };
  }

  async getRentalFunnel(scope: ReportScope) {
    const rentalWhere: Prisma.RentalRequestWhereInput = scope.branchId
      ? { branchId: scope.branchId }
      : {};
    const viewingWhere: Prisma.ViewingWhereInput = scope.branchId
      ? { rentalRequest: { branchId: scope.branchId } }
      : {};
    const depositWhere: Prisma.DepositWhereInput = scope.branchId
      ? { rentalRequest: { branchId: scope.branchId } }
      : {};
    const [rentalRequests, viewings, deposits] = await Promise.all([
      prisma.rentalRequest.groupBy({
        by: ['status'],
        where: rentalWhere,
        _count: { _all: true },
      }),
      prisma.viewing.groupBy({
        by: ['status'],
        where: viewingWhere,
        _count: { _all: true },
      }),
      prisma.deposit.groupBy({
        by: ['status'],
        where: depositWhere,
        _count: { _all: true },
      }),
    ]);
    return {
      rentalRequests: Object.fromEntries(
        rentalRequests.map((item) => [item.status, item._count._all]),
      ),
      viewings: Object.fromEntries(
        viewings.map((item) => [item.status, item._count._all]),
      ),
      deposits: Object.fromEntries(
        deposits.map((item) => [item.status, item._count._all]),
      ),
    };
  }

  async getFinancialTotals(scope: ReportScope) {
    const baseWhere: Prisma.PaymentWhereInput = {
      amountPaid: { not: null },
      status: PaymentStatus.CONFIRMED,
      ...paymentBranchFilter(scope.branchId),
    };
    const totals = await prisma.payment.groupBy({
      by: ['paymentType'],
      where: baseWhere,
      _sum: { amountPaid: true },
    });
    return Object.fromEntries(
      totals.map((item) => [
        item.paymentType,
        item._sum.amountPaid?.toString() ?? '0.00',
      ]),
    );
  }

  async getOperationalCounts(scope: ReportScope) {
    const branchId = scope.branchId;
    const rentalWhere: Prisma.RentalRequestWhereInput = branchId
      ? { branchId }
      : {};
    const depositWhere: Prisma.DepositWhereInput = branchId
      ? { rentalRequest: { branchId } }
      : {};
    const contractWhere: Prisma.ContractWhereInput = branchId
      ? { deposit: { rentalRequest: { branchId } } }
      : {};
    const checkoutWhere: Prisma.CheckoutRequestWhereInput = branchId
      ? { deposit: { rentalRequest: { branchId } } }
      : {};
    const settlementWhere: Prisma.SettlementWhereInput = branchId
      ? { checkoutRequest: { deposit: { rentalRequest: { branchId } } } }
      : {};
    const [rentalRequests, deposits, contracts, checkoutRequests, settlements] =
      await Promise.all([
        prisma.rentalRequest.count({ where: rentalWhere }),
        prisma.deposit.count({ where: depositWhere }),
        prisma.contract.count({ where: contractWhere }),
        prisma.checkoutRequest.count({ where: checkoutWhere }),
        prisma.settlement.count({ where: settlementWhere }),
      ]);
    return {
      rentalRequests,
      deposits,
      contracts,
      checkoutRequests,
      settlements,
    };
  }

  getDashboardCounts(
    role: 'SALE' | 'ACCOUNTANT' | 'MANAGER',
    branchId: string,
  ) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const nextDay = new Date(now);
    nextDay.setDate(now.getDate() + 2);
    if (role === 'SALE')
      return Promise.all([
        prisma.rentalRequest.count({ where: { branchId, status: 'ACTIVE' } }),
        prisma.viewing.count({
          where: {
            rentalRequest: { branchId },
            startsAt: { gte: new Date(now.setHours(0, 0, 0, 0)), lt: tomorrow },
          },
        }),
        prisma.deposit.count({
          where: {
            rentalRequest: { branchId },
            status: {
              in: [
                'DRAFT',
                'WAITING_ROOM_CHECK',
                'ROOM_APPROVED',
                'WAITING_PAYMENT',
                'WAITING_MANAGER_CONFIRMATION',
                'PAYMENT_RECHECK',
              ],
            },
          },
        }),
        prisma.deposit.count({
          where: {
            rentalRequest: { branchId },
            status: 'DEPOSITED',
            scheduledCheckInAt: { gte: new Date(), lt: nextDay },
          },
        }),
        prisma.checkoutRequest.count({
          where: { deposit: { rentalRequest: { branchId } }, status: 'DRAFT' },
        }),
      ]);
    if (role === 'ACCOUNTANT')
      return Promise.all([
        prisma.deposit.count({
          where: { rentalRequest: { branchId }, status: 'ROOM_APPROVED' },
        }),
        prisma.deposit.count({
          where: { rentalRequest: { branchId }, status: 'WAITING_PAYMENT' },
        }),
        prisma.payment.count({
          where: {
            deposit: { rentalRequest: { branchId } },
            expiresAt: { gte: new Date(), lt: nextDay },
            status: 'WAITING_PAYMENT',
          },
        }),
        prisma.contract.count({
          where: {
            deposit: { rentalRequest: { branchId } },
            status: 'WAITING_INITIAL_PAYMENT',
          },
        }),
        prisma.settlement.count({
          where: {
            checkoutRequest: { deposit: { rentalRequest: { branchId } } },
            status: 'WAITING_FINANCIAL_COMPLETION',
          },
        }),
      ]);
    return Promise.all([
      prisma.deposit.count({
        where: { rentalRequest: { branchId }, status: 'WAITING_ROOM_CHECK' },
      }),
      prisma.deposit.count({
        where: {
          rentalRequest: { branchId },
          status: 'WAITING_MANAGER_CONFIRMATION',
        },
      }),
      prisma.contract.count({
        where: {
          deposit: { rentalRequest: { branchId } },
          status: 'WAITING_ELIGIBILITY',
        },
      }),
      prisma.handover.count({
        where: {
          contract: { deposit: { rentalRequest: { branchId } } },
          status: 'DRAFT',
        },
      }),
      prisma.checkoutRequest.count({
        where: {
          deposit: { rentalRequest: { branchId } },
          status: 'WAITING_INSPECTION',
        },
      }),
      prisma.settlement.count({
        where: {
          checkoutRequest: { deposit: { rentalRequest: { branchId } } },
          status: 'WAITING_CUSTOMER_CONFIRMATION',
        },
      }),
    ]);
  }

  getAdminDashboardCounts() {
    return Promise.all([
      prisma.branch.count(),
      prisma.employee.count(),
      this.getBedCounts({}),
    ]);
  }
}
