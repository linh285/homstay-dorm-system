import { AdminRepository } from '../../data/repositories/admin.repository.js';
import { PaymentStatus } from '../../shared/payment-status.js';
import { AppError } from '../../shared/app-error.js';
import type { BranchScopedUser } from '../authorization/branch-access.js';

type DashboardTask = {
  id: string;
  type: string;
  entityId: string;
  title: string;
  status: string;
  occurredAt: Date | string;
  dueAt: Date | string | null;
};

type DashboardSchedule = {
  id: string;
  type: string;
  entityId: string;
  title: string;
  status: string;
  startsAt: Date | string;
  endsAt: Date | string | null;
};

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
    const { start, end } = this.todayInHoChiMinh();
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
    const scopedBranchId = branchId!;
    if (user.role === 'ACCOUNTANT') {
      return {
        counters: {
          ...base,
          depositsWaitingCalculation: await this.repository.countDeposits(
            scopedBranchId,
            ['ROOM_APPROVED'],
          ),
          paymentsWaitingRecord: await this.repository.countDeposits(
            scopedBranchId,
            ['WAITING_PAYMENT'],
          ),
          settlementsWaiting: await this.repository.countSettlements(
            scopedBranchId,
            ['WAITING_SETTLEMENT', 'WAITING_CUSTOMER_CONFIRMATION'],
          ),
        },
        tasks: await this.accountantTasks(scopedBranchId),
        todaySchedules: await this.accountantSchedules(
          scopedBranchId,
          start,
          end,
        ),
      };
    }
    if (user.role === 'MANAGER') {
      return {
        counters: {
          ...base,
          roomsWaitingApproval: await this.repository.countDeposits(
            scopedBranchId,
            ['WAITING_ROOM_CHECK'],
          ),
          depositsWaitingApproval: await this.repository.countDeposits(
            scopedBranchId,
            ['WAITING_MANAGER_CONFIRMATION'],
          ),
          eligibilityReviews: await this.repository.countContracts(
            scopedBranchId,
            ['WAITING_ELIGIBILITY'],
          ),
          handoversWaiting: await this.repository.countContracts(
            scopedBranchId,
            ['READY_FOR_HANDOVER'],
          ),
          inspectionsWaiting: await this.repository.countCheckoutRequests(
            scopedBranchId,
            ['WAITING_INSPECTION'],
          ),
          settlementsWaiting: await this.repository.countSettlements(
            scopedBranchId,
            ['WAITING_CUSTOMER_CONFIRMATION'],
          ),
        },
        tasks: await this.managerTasks(scopedBranchId),
        todaySchedules: await this.managerSchedules(scopedBranchId, start, end),
      };
    }
    return {
      counters: base,
      tasks: await this.saleTasks(scopedBranchId),
      todaySchedules: await this.saleSchedules(scopedBranchId, start, end),
    };
  }

  private async saleTasks(branchId: string): Promise<DashboardTask[]> {
    const [requests, deposits, checkouts] = await Promise.all([
      this.repository.listRentalRequestTasks(branchId, ['ACTIVE'], 10),
      this.repository.listDepositTasks(
        branchId,
        [
          'DRAFT',
          'WAITING_ROOM_CHECK',
          'ROOM_APPROVED',
          PaymentStatus.WAITING_PAYMENT,
          PaymentStatus.WAITING_MANAGER_CONFIRMATION,
          PaymentStatus.PAYMENT_RECHECK,
        ],
        10,
      ),
      this.repository.listCheckoutTasks(branchId, ['DRAFT'], 10),
    ]);
    return this.newestTasks([
      ...requests.map((item) => ({
        id: `RENTAL_REQUEST:${item.id}`,
        type: 'RENTAL_REQUEST',
        entityId: item.id,
        title: `Yêu cầu thuê ${item.id}`,
        status: item.status,
        occurredAt: item.registeredAt,
        dueAt: item.expectedCheckInDate,
      })),
      ...deposits.map((item) => ({
        id: `DEPOSIT:${item.id}`,
        type: 'DEPOSIT',
        entityId: item.id,
        title: `Phiếu cọc ${item.id}`,
        status: item.status,
        occurredAt: item.createdAt,
        dueAt: item.payments[0]?.expiresAt ?? item.scheduledCheckInAt,
      })),
      ...checkouts.map((item) => ({
        id: `CHECKOUT:${item.id}`,
        type: 'CHECKOUT',
        entityId: item.id,
        title: `Yêu cầu trả phòng ${item.id}`,
        status: item.status,
        occurredAt: item.requestedAt,
        dueAt: item.expectedCheckoutAt,
      })),
    ]);
  }

  private async accountantTasks(branchId: string): Promise<DashboardTask[]> {
    const [deposits, contracts, settlements] = await Promise.all([
      this.repository.listDepositTasks(
        branchId,
        ['ROOM_APPROVED', PaymentStatus.WAITING_PAYMENT],
        10,
      ),
      this.repository.listContractTasks(
        branchId,
        ['WAITING_INITIAL_PAYMENT'],
        10,
      ),
      this.repository.listSettlementTasks(
        branchId,
        ['WAITING_SETTLEMENT', 'WAITING_FINANCIAL_COMPLETION'],
        10,
      ),
    ]);
    return this.newestTasks([
      ...deposits.map((item) => ({
        id: `DEPOSIT:${item.id}`,
        type: 'DEPOSIT',
        entityId: item.id,
        title: `Ghi nhận thanh toán cọc ${item.id}`,
        status: item.status,
        occurredAt: item.createdAt,
        dueAt: item.payments[0]?.expiresAt ?? null,
      })),
      ...contracts.map((item) => ({
        id: `CONTRACT:${item.id}`,
        type: 'CONTRACT',
        entityId: item.id,
        title: `Thanh toán đầu kỳ ${item.id}`,
        status: item.status,
        occurredAt: item.startsOn,
        dueAt: item.startsOn,
      })),
      ...settlements.map((item) => ({
        id: `SETTLEMENT:${item.id}`,
        type: 'SETTLEMENT',
        entityId: item.id,
        title: `Đối soát trả phòng ${item.id}`,
        status: item.status,
        occurredAt: item.checkoutRequest.requestedAt,
        dueAt: item.customerAgreedAt,
      })),
    ]);
  }

  private async managerTasks(branchId: string): Promise<DashboardTask[]> {
    const [deposits, contracts, handovers, checkouts, settlements] =
      await Promise.all([
        this.repository.listDepositTasks(
          branchId,
          ['WAITING_ROOM_CHECK', PaymentStatus.WAITING_MANAGER_CONFIRMATION],
          10,
        ),
        this.repository.listContractTasks(
          branchId,
          ['WAITING_ELIGIBILITY'],
          10,
        ),
        this.repository.listContractTasks(branchId, ['READY_FOR_HANDOVER'], 10),
        this.repository.listCheckoutTasks(branchId, ['WAITING_INSPECTION'], 10),
        this.repository.listSettlementTasks(
          branchId,
          ['WAITING_CUSTOMER_CONFIRMATION'],
          10,
        ),
      ]);
    return this.newestTasks([
      ...deposits.map((item) => ({
        id: `DEPOSIT:${item.id}`,
        type: 'DEPOSIT',
        entityId: item.id,
        title: `Duyệt phiếu cọc ${item.id}`,
        status: item.status,
        occurredAt: item.createdAt,
        dueAt: item.payments[0]?.expiresAt ?? null,
      })),
      ...contracts.map((item) => ({
        id: `CONTRACT:${item.id}`,
        type: 'CONTRACT',
        entityId: item.id,
        title: `Duyệt điều kiện cư trú ${item.id}`,
        status: item.status,
        occurredAt: item.startsOn,
        dueAt: item.startsOn,
      })),
      ...handovers.map((item) => ({
        id: `HANDOVER:${item.id}`,
        type: 'HANDOVER',
        entityId: item.id,
        title: `Bàn giao phòng ${item.id}`,
        status: item.status,
        occurredAt: item.startsOn,
        dueAt: item.startsOn,
      })),
      ...checkouts.map((item) => ({
        id: `CHECKOUT:${item.id}`,
        type: 'CHECKOUT',
        entityId: item.id,
        title: `Kiểm tra trả phòng ${item.id}`,
        status: item.status,
        occurredAt: item.requestedAt,
        dueAt: item.expectedCheckoutAt,
      })),
      ...settlements.map((item) => ({
        id: `SETTLEMENT:${item.id}`,
        type: 'SETTLEMENT',
        entityId: item.id,
        title: `Xác nhận đối soát ${item.id}`,
        status: item.status,
        occurredAt: item.checkoutRequest.requestedAt,
        dueAt: item.customerAgreedAt,
      })),
    ]);
  }

  private async saleSchedules(
    branchId: string,
    start: Date,
    end: Date,
  ): Promise<DashboardSchedule[]> {
    const [viewings, checkIns] = await Promise.all([
      this.repository.listTodayViewings(branchId, start, end, 10),
      this.repository.listTodayScheduledCheckIns(branchId, start, end, 10),
    ]);
    return [
      ...viewings.map((item) => ({
        id: `VIEWING:${item.id}`,
        type: 'VIEWING',
        entityId: item.id,
        title: `Lịch xem ${item.id}`,
        status: item.status,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
      })),
      ...checkIns.map((item) => ({
        id: `CHECKIN:${item.id}`,
        type: 'CHECKIN',
        entityId: item.id,
        title: `Nhận phòng ${item.id}`,
        status: item.status,
        startsAt: item.scheduledCheckInAt!,
        endsAt: null,
      })),
    ].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  }

  private async accountantSchedules(
    branchId: string,
    start: Date,
    end: Date,
  ): Promise<DashboardSchedule[]> {
    const payments = await this.repository.listPaymentsDue(
      branchId,
      start,
      end,
      10,
    );
    return payments.map((item) => ({
      id: `PAYMENT:${item.id}`,
      type: 'PAYMENT',
      entityId: item.id,
      title: `Thanh toán đến hạn ${item.id}`,
      status: item.status,
      startsAt: item.expiresAt!,
      endsAt: null,
    }));
  }

  private async managerSchedules(
    branchId: string,
    start: Date,
    end: Date,
  ): Promise<DashboardSchedule[]> {
    const [handovers, checkouts] = await Promise.all([
      this.repository.listTodayHandovers(branchId, start, end, 10),
      this.repository.listTodayCheckouts(branchId, start, end, 10),
    ]);
    return [
      ...handovers.map((item) => ({
        id: `HANDOVER:${item.id}`,
        type: 'HANDOVER',
        entityId: item.id,
        title: `Bàn giao ${item.id}`,
        status: item.status,
        startsAt: item.handedOverAt!,
        endsAt: null,
      })),
      ...checkouts.map((item) => ({
        id: `CHECKOUT:${item.id}`,
        type: 'CHECKOUT',
        entityId: item.id,
        title: `Trả phòng ${item.id}`,
        status: item.status,
        startsAt: item.expectedCheckoutAt!,
        endsAt: null,
      })),
    ].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  }

  private newestTasks(tasks: DashboardTask[]): DashboardTask[] {
    return tasks
      .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
      .slice(0, 10);
  }

  private todayInHoChiMinh(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const year = Number(parts.find((part) => part.type === 'year')!.value);
    const month = Number(parts.find((part) => part.type === 'month')!.value);
    const day = Number(parts.find((part) => part.type === 'day')!.value);
    const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
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
