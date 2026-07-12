import { AdminRepository } from '../../data/repositories/admin.repository.js';
import { AppError } from '../../shared/app-error.js';
import type { BranchScopedUser } from '../authorization/branch-access.js';

export class DashboardService {
  constructor(private readonly repository = new AdminRepository()) {}

  async get(user: BranchScopedUser) {
    const branchId =
      user.role === 'ADMIN' ? undefined : (user.branchId ?? undefined);
    if (user.role !== 'ADMIN' && !branchId)
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'This employee is not assigned to a branch.',
      );
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const base = {
      activeRentalRequests: await this.repository.countRentalRequests(
        branchId,
        'ACTIVE',
      ),
      todayViewings: await this.repository.countViewingsToday(
        branchId,
        start,
        end,
      ),
      depositsInProgress: await this.repository.countDeposits(branchId, [
        'DRAFT',
        'WAITING_ROOM_CHECK',
        'ROOM_APPROVED',
        'WAITING_PAYMENT',
        'WAITING_MANAGER_CONFIRMATION',
        'PAYMENT_RECHECK',
      ]),
      scheduledCheckIns: await this.repository.countContracts(branchId, [
        'READY_FOR_HANDOVER',
      ]),
      openCheckoutRequests: await this.repository.countCheckoutRequests(
        branchId,
        [
          'DRAFT',
          'WAITING_INSPECTION',
          'INSPECTED',
          'WAITING_SETTLEMENT',
          'WAITING_CUSTOMER_CONFIRMATION',
          'DISPUTED',
          'WAITING_FINANCIAL_COMPLETION',
        ],
      ),
    };

    if (user.role === 'ADMIN') {
      const [branches, employees, rooms, beds] = await Promise.all([
        this.repository.countBranches(),
        this.repository.countEmployees(),
        this.repository.countRooms(),
        this.repository.findBedsWithActiveAllocations(),
      ]);
      const occupancy = this.occupancy(beds);
      return {
        counters: { branches, employees, rooms, ...occupancy },
        tasks: [],
        todaySchedules: [],
      };
    }
    if (user.role === 'ACCOUNTANT') {
      return {
        counters: {
          ...base,
          depositsWaitingCalculation: await this.repository.countDeposits(
            branchId,
            ['ROOM_APPROVED'],
          ),
          paymentsWaitingRecord: await this.repository.countDeposits(branchId, [
            'WAITING_PAYMENT',
          ]),
          settlementsWaiting: await this.repository.countSettlements(branchId, [
            'WAITING_SETTLEMENT',
            'WAITING_CUSTOMER_CONFIRMATION',
          ]),
        },
        tasks: [],
        todaySchedules: [],
      };
    }
    if (user.role === 'MANAGER') {
      return {
        counters: {
          ...base,
          roomsWaitingApproval: await this.repository.countDeposits(branchId, [
            'WAITING_ROOM_CHECK',
          ]),
          depositsWaitingApproval: await this.repository.countDeposits(
            branchId,
            ['WAITING_MANAGER_CONFIRMATION'],
          ),
          eligibilityReviews: await this.repository.countContracts(branchId, [
            'WAITING_ELIGIBILITY',
          ]),
          handoversWaiting: await this.repository.countContracts(branchId, [
            'READY_FOR_HANDOVER',
          ]),
          inspectionsWaiting: await this.repository.countCheckoutRequests(
            branchId,
            ['WAITING_INSPECTION'],
          ),
          settlementsWaiting: await this.repository.countSettlements(branchId, [
            'WAITING_CUSTOMER_CONFIRMATION',
          ]),
        },
        tasks: [],
        todaySchedules: [],
      };
    }
    return { counters: base, tasks: [], todaySchedules: [] };
  }

  private occupancy(
    beds: Array<{
      allocations: Array<{ allocationType: string; status: string }>;
    }>,
  ) {
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
    return {
      totalBeds,
      availableBeds: totalBeds - heldBeds - depositedBeds - occupiedBeds,
      heldBeds,
      depositedBeds,
      occupiedBeds,
    };
  }
}
