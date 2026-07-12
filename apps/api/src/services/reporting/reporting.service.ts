import { AdminRepository } from '../../data/repositories/admin.repository.js';
import { AppError } from '../../shared/app-error.js';
import { excludedFromFinancialReports } from '../../shared/payment-status.js';
import type { BranchScopedUser } from '../authorization/branch-access.js';

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
      if (
        !payment.amountPaid ||
        (excludedFromFinancialReports as readonly string[]).includes(
          payment.status,
        )
      )
        continue;
      const amount = Number(payment.amountPaid);
      if (payment.paymentType === 'DEPOSIT') result.deposit += amount;
      if (payment.paymentType === 'DEPOSIT_REFUND') result.refund += amount;
      if (payment.paymentType === 'CHECKOUT_ADDITIONAL_PAYMENT')
        result.additionalPayment += amount;
    }
    return result;
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
