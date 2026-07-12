import { AdminRepository } from '../../data/repositories/admin.repository.js';
import { AppError } from '../../shared/app-error.js';
import { PaymentStatus } from '../../shared/payment-status.js';
import type { BranchScopedUser } from '../authorization/branch-access.js';

const depositStatuses = [
  'DRAFT',
  'WAITING_ROOM_CHECK',
  'ROOM_APPROVED',
  'ROOM_REJECTED',
  'WAITING_PAYMENT',
  'WAITING_MANAGER_CONFIRMATION',
  'PAYMENT_RECHECK',
  'PAYMENT_REJECTED',
  'DEPOSITED',
  'EXPIRED',
  'CANCELLED',
];

const contractStatuses = [
  'CHECKIN_DRAFT',
  'ARRIVED',
  'WAITING_ELIGIBILITY',
  'ELIGIBILITY_APPROVED',
  'CHECKIN_STOPPED',
  'PAPER_SIGNED',
  'WAITING_INITIAL_PAYMENT',
  'READY_FOR_HANDOVER',
  'ACTIVE',
  'LIQUIDATED',
];

const checkoutStatuses = [
  'DRAFT',
  'WAITING_INSPECTION',
  'INSPECTED',
  'WAITING_SETTLEMENT',
  'WAITING_CUSTOMER_CONFIRMATION',
  'DISPUTED',
  'WAITING_FINANCIAL_COMPLETION',
  'READY_TO_COMPLETE',
  'COMPLETED',
  'CANCELLED',
];

type Occupancy = {
  totalBeds: number;
  availableBeds: number;
  heldBeds: number;
  depositedBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
};

export class ReportingService {
  constructor(private readonly repository = new AdminRepository()) {}

  async branchSummary(user: BranchScopedUser) {
    const branchId = this.managerBranch(user);
    return { scope: branchId, ...(await this.buildBranchSummary(branchId)) };
  }

  async systemSummary(user: BranchScopedUser) {
    this.assertAdmin(user);
    const branchRows = await this.repository.listBranches();
    const branches = await Promise.all(
      branchRows.map(async (branch) => ({
        branch: { id: branch.id, name: branch.name },
        ...(await this.buildBranchSummary(branch.id)),
      })),
    );
    return { scope: 'SYSTEM', branches };
  }

  async occupancy(user: BranchScopedUser, requestedBranchId?: string) {
    const branchId = this.reportingScope(user, requestedBranchId);
    return {
      scope: branchId ?? 'SYSTEM',
      ...(await this.getOccupancy(branchId)),
    };
  }

  async rentalFunnel(user: BranchScopedUser, requestedBranchId?: string) {
    const branchId = this.reportingScope(user, requestedBranchId);
    const grouped = await this.repository.groupRentalRequestsByStatus(branchId);
    const counts = grouped.reduce<Record<string, number>>((result, item) => {
      result[item.status] = item._count._all;
      return result;
    }, {});
    return { scope: branchId ?? 'SYSTEM', counts };
  }

  async deposits(user: BranchScopedUser, requestedBranchId?: string) {
    const branchId = this.reportingScope(user, requestedBranchId);
    const now = new Date();
    const next24Hours = new Date(now);
    next24Hours.setHours(now.getHours() + 24);
    const [total, amount, expiringWithin24Hours, grouped] = await Promise.all([
      this.repository.countDeposits(branchId),
      this.repository.sumValidDepositAmount(branchId),
      this.repository.countDepositPaymentsExpiringWithin(
        branchId,
        now,
        next24Hours,
      ),
      this.repository.groupDepositsByStatus(branchId),
    ]);
    return {
      scope: branchId ?? 'SYSTEM',
      total,
      totalDepositAmount: amount._sum.totalDepositAmount?.toString() ?? '0.00',
      expiringWithin24Hours,
      countsByStatus: this.countsByStatus(depositStatuses, grouped),
    };
  }

  async checkInsCheckouts(user: BranchScopedUser, requestedBranchId?: string) {
    const branchId = this.reportingScope(user, requestedBranchId);
    const now = new Date();
    const nextSevenDays = new Date(now);
    nextSevenDays.setDate(now.getDate() + 7);
    const [contracts, checkouts, upcomingCheckIns, upcomingCheckouts] =
      await Promise.all([
        this.repository.groupContractsByStatus(branchId),
        this.repository.groupCheckoutRequestsByStatus(branchId),
        this.repository.listUpcomingCheckIns(branchId, now, nextSevenDays),
        this.repository.listUpcomingCheckouts(branchId, now, nextSevenDays),
      ]);
    return {
      scope: branchId ?? 'SYSTEM',
      contractsByStatus: this.countsByStatus(contractStatuses, contracts),
      checkoutsByStatus: this.countsByStatus(checkoutStatuses, checkouts),
      upcomingCheckIns: upcomingCheckIns.map((item) => ({
        id: item.id,
        status: item.status,
        scheduledCheckInAt: item.scheduledCheckInAt,
        rentalRequestId: item.rentalRequest.id,
        branchId: item.rentalRequest.branchId,
      })),
      upcomingCheckouts: upcomingCheckouts.map((item) => ({
        id: item.id,
        status: item.status,
        expectedCheckoutAt: item.expectedCheckoutAt,
        branchId: item.deposit.rentalRequest.branchId,
      })),
    };
  }

  async financialSummary(user: BranchScopedUser, requestedBranchId?: string) {
    const branchId = this.reportingScope(user, requestedBranchId);
    const rows = await this.repository.financialSummaryPayments(branchId);
    const totals = rows.reduce(
      (result, item) => {
        const amount = Number(item._sum.amountPaid ?? 0);
        if (item.paymentType === 'DEPOSIT') result.depositReceived += amount;
        if (item.paymentType === 'DEPOSIT_REFUND') result.refundPaid += amount;
        if (item.paymentType === 'CHECKOUT_ADDITIONAL_PAYMENT')
          result.additionalPaymentReceived += amount;
        return result;
      },
      {
        depositReceived: 0,
        refundPaid: 0,
        additionalPaymentReceived: 0,
      },
    );
    const netCashFlow =
      totals.depositReceived +
      totals.additionalPaymentReceived -
      totals.refundPaid;
    return {
      scope: branchId ?? 'SYSTEM',
      depositReceived: this.money(totals.depositReceived),
      refundPaid: this.money(totals.refundPaid),
      additionalPaymentReceived: this.money(totals.additionalPaymentReceived),
      netCashFlow: this.money(netCashFlow),
    };
  }

  private async buildBranchSummary(branchId: string) {
    const [
      occupancy,
      rentalRequests,
      viewings,
      deposits,
      contracts,
      checkouts,
      financial,
    ] = await Promise.all([
      this.getOccupancy(branchId),
      this.repository.countRentalRequests(branchId),
      this.repository.countViewingsToday(branchId),
      this.repository.countDeposits(branchId),
      this.repository.countContracts(branchId),
      this.repository.countCheckoutRequests(branchId),
      this.repository.financialTotals(branchId),
    ]);
    const totals = this.sumFinancial(financial);
    return {
      occupancy,
      counts: {
        rentalRequests,
        todayViewings: viewings,
        deposits,
        contracts,
        checkoutRequests: checkouts,
      },
      finances: totals,
    };
  }

  private async getOccupancy(branchId?: string): Promise<Occupancy> {
    const beds = await this.repository.findBedsWithActiveAllocations(branchId);
    let heldBeds = 0;
    let depositedBeds = 0;
    let occupiedBeds = 0;
    for (const bed of beds) {
      const allocation = bed.allocations[0];
      if (allocation?.allocationType === 'HELD') heldBeds += 1;
      if (allocation?.allocationType === 'DEPOSITED') depositedBeds += 1;
      if (allocation?.allocationType === 'OCCUPIED') occupiedBeds += 1;
    }
    const totalBeds = beds.length;
    const availableBeds = totalBeds - heldBeds - depositedBeds - occupiedBeds;
    return {
      totalBeds,
      availableBeds,
      heldBeds,
      depositedBeds,
      occupiedBeds,
      occupancyRate: totalBeds
        ? Number(
            (((depositedBeds + occupiedBeds) / totalBeds) * 100).toFixed(2),
          )
        : 0,
    };
  }

  private sumFinancial(
    payments: Array<{
      paymentType: string;
      amountPaid: { toString(): string } | null;
      status: string;
    }>,
  ) {
    const result = { deposit: 0, refund: 0, additionalPayment: 0 };
    for (const payment of payments) {
      if (!payment.amountPaid || payment.status !== PaymentStatus.CONFIRMED)
        continue;
      const amount = Number(payment.amountPaid);
      if (payment.paymentType === 'DEPOSIT') result.deposit += amount;
      if (payment.paymentType === 'DEPOSIT_REFUND') result.refund += amount;
      if (payment.paymentType === 'CHECKOUT_ADDITIONAL_PAYMENT')
        result.additionalPayment += amount;
    }
    return result;
  }

  private countsByStatus<
    T extends { status: string; _count: { _all: number } },
  >(statuses: string[], rows: T[]) {
    const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
    for (const row of rows) counts[row.status] = row._count._all;
    return counts;
  }

  private money(value: number): string {
    return value.toFixed(2);
  }

  private managerBranch(user: BranchScopedUser): string {
    if (user.role !== 'MANAGER' || !user.branchId)
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only MANAGER can access branch reports.',
      );
    return user.branchId;
  }

  private reportingScope(
    user: BranchScopedUser,
    requestedBranchId?: string,
  ): string | undefined {
    if (user.role === 'ADMIN') return requestedBranchId;
    if (user.role === 'MANAGER' && user.branchId) {
      return user.branchId;
    }
    throw new AppError(
      403,
      'FORBIDDEN',
      'Only MANAGER or ADMIN can access reports.',
    );
  }

  private assertAdmin(user: BranchScopedUser) {
    if (user.role !== 'ADMIN')
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only ADMIN can access system reports.',
      );
  }
}
