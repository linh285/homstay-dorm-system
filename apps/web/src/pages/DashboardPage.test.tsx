import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './DashboardPage';

const mocks = vi.hoisted(() => ({
  getDashboard: vi.fn(),
}));

vi.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({
    employee: {
      id: 'NV001',
      fullName: 'Sale Test',
      role: 'SALE',
      branchId: 'CN001',
    },
    isInitialized: true,
  }),
}));

vi.mock('../features/dashboard/dashboard-api', () => ({
  getDashboard: mocks.getDashboard,
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPage presentation', () => {
  it('renders Vietnamese labels instead of technical metric keys', async () => {
    mocks.getDashboard.mockResolvedValueOnce({
      counters: {
        branches: 2,
        employees: 10,
        totalBeds: 30,
        availableBeds: 12,
        heldBeds: 3,
        depositedBeds: 5,
        occupiedBeds: 10,
        unknownMetric: 999,
      },
      tasks: [
        {
          id: 'DEPOSIT:D001',
          type: 'DEPOSIT',
          entityId: 'D001',
          title: 'Phiếu cọc D001',
          status: 'WAITING_PAYMENT',
          occurredAt: new Date('2026-07-12T02:00:00Z').toISOString(),
          dueAt: null,
        },
      ],
      todaySchedules: [
        {
          id: 'VIEWING:V001',
          type: 'VIEWING',
          entityId: 'V001',
          title: 'Lịch xem V001',
          status: 'ACTIVE',
          startsAt: new Date('2026-07-12T03:00:00Z').toISOString(),
          endsAt: null,
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Chi nhánh')).toBeInTheDocument();
    expect(screen.getByText('Nhân viên')).toBeInTheDocument();
    expect(screen.getByText('Tổng số giường')).toBeInTheDocument();
    expect(screen.getByText('Giường còn trống')).toBeInTheDocument();
    expect(screen.getByText('Giường đang giữ chỗ')).toBeInTheDocument();
    expect(screen.getByText('Giường đã đặt cọc')).toBeInTheDocument();
    expect(screen.getByText('Giường đang sử dụng')).toBeInTheDocument();
    expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();

    for (const technicalKey of [
      'totalBeds',
      'availableBeds',
      'heldBeds',
      'depositedBeds',
      'occupiedBeds',
      'branches',
      'employees',
      'unknownMetric',
    ]) {
      expect(screen.queryByText(technicalKey)).not.toBeInTheDocument();
    }
  });
});
