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

describe('DashboardPage', () => {
  it('renders counters, tasks, and today schedules', async () => {
    mocks.getDashboard.mockResolvedValueOnce({
      counters: { activeRentalRequests: 2 },
      tasks: [
        {
          id: 'DEPOSIT:D001',
          type: 'DEPOSIT',
          entityId: 'D001',
          title: 'Phiếu cọc D001',
          status: 'WAITING_PAYMENT',
          occurredAt: new Date().toISOString(),
          dueAt: null,
        },
      ],
      todaySchedules: [
        {
          id: 'VIEWING:V001',
          type: 'VIEWING',
          entityId: 'V001',
          title: 'Lịch xem V001',
          status: 'SCHEDULED',
          startsAt: new Date().toISOString(),
          endsAt: null,
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Công việc cần xử lý')).toBeInTheDocument();
    expect(screen.getByText('Phiếu cọc D001')).toBeInTheDocument();
    expect(screen.getByText('Lịch xem V001')).toBeInTheDocument();
  });
});
