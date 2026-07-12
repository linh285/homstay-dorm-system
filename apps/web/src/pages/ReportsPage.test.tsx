import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReportsPage } from './ReportsPage';

const mocks = vi.hoisted(() => ({
  getBranches: vi.fn(),
  getSystemSummary: vi.fn(),
  getBranchSummary: vi.fn(),
  getOccupancy: vi.fn(),
  getRentalFunnel: vi.fn(),
  getDepositReport: vi.fn(),
  getCheckInsCheckoutsReport: vi.fn(),
  getFinancialSummary: vi.fn(),
}));

vi.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({
    employee: {
      id: 'NV999',
      fullName: 'Admin Test',
      role: 'ADMIN',
      branchId: null,
    },
    isInitialized: true,
  }),
}));

vi.mock('../features/administration/administration-api', () => ({
  getBranches: mocks.getBranches,
}));

vi.mock('../features/reporting/reporting-api', () => ({
  getSystemSummary: mocks.getSystemSummary,
  getBranchSummary: mocks.getBranchSummary,
  getOccupancy: mocks.getOccupancy,
  getRentalFunnel: mocks.getRentalFunnel,
  getDepositReport: mocks.getDepositReport,
  getCheckInsCheckoutsReport: mocks.getCheckInsCheckoutsReport,
  getFinancialSummary: mocks.getFinancialSummary,
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    ...render(
      <QueryClientProvider client={client}>
        <ReportsPage />
      </QueryClientProvider>,
    ),
  };
}

describe('ReportsPage presentation', () => {
  it('renders reports with Vietnamese labels and without raw JSON', async () => {
    mocks.getBranches.mockResolvedValueOnce([
      { id: 'CN001', name: 'Chi nhánh 1' },
    ]);
    mocks.getSystemSummary.mockResolvedValueOnce({
      scope: 'SYSTEM',
      branches: [
        {
          branch: { id: 'CN001', name: 'Chi nhánh 1' },
          occupancy: {
            totalBeds: 10,
            availableBeds: 4,
            heldBeds: 1,
            depositedBeds: 2,
            occupiedBeds: 3,
            occupancyRate: 30.42,
          },
        },
      ],
    });
    mocks.getOccupancy.mockResolvedValueOnce({
      scope: 'SYSTEM',
      totalBeds: 10,
      availableBeds: 4,
      heldBeds: 1,
      depositedBeds: 2,
      occupiedBeds: 3,
      occupancyRate: 30.42,
    });
    mocks.getRentalFunnel.mockResolvedValueOnce({
      scope: 'SYSTEM',
      counts: { ACTIVE: 2, DEPOSIT_PROCESS: 1 },
    });
    mocks.getDepositReport.mockResolvedValueOnce({
      scope: 'SYSTEM',
      total: 3,
      totalDepositAmount: '3000000.00',
      expiringWithin24Hours: 1,
      countsByStatus: { WAITING_PAYMENT: 1, DEPOSITED: 2 },
    });
    mocks.getCheckInsCheckoutsReport.mockResolvedValueOnce({
      scope: 'SYSTEM',
      contractsByStatus: { READY_FOR_HANDOVER: 1 },
      checkoutsByStatus: { WAITING_INSPECTION: 1 },
      upcomingCheckIns: [
        { id: 'D001', status: 'DEPOSITED', scheduledCheckInAt: '2026-07-12' },
      ],
      upcomingCheckouts: [
        {
          id: 'CO001',
          status: 'WAITING_INSPECTION',
          expectedCheckoutAt: '2026-07-13',
        },
      ],
    });
    mocks.getFinancialSummary.mockResolvedValueOnce({
      scope: 'SYSTEM',
      depositReceived: '3000000.00',
      refundPaid: '0.00',
      additionalPaymentReceived: '0.00',
      netCashFlow: '3000000.00',
    });

    const { container } = renderPage();

    expect(
      await screen.findByText('Báo cáo toàn hệ thống'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText(/Toàn hệ thống/).length).toBeGreaterThan(0),
    );
    expect(screen.getByText('Chi nhánh 1')).toBeInTheDocument();
    expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
    expect(screen.getByText('Đang làm thủ tục cọc')).toBeInTheDocument();
    expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument();
    expect(
      screen.getAllByText('Chờ kiểm tra trả phòng').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('30,42%').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\.000\.000/).length).toBeGreaterThan(0);

    expect(container.querySelector('pre')).toBeNull();
    expect(container.textContent).not.toContain('JSON.stringify');
    expect(container.textContent).not.toContain('{"scope"');
    expect(container.textContent).not.toContain('SYSTEM');
    expect(container.textContent).not.toContain('totalBeds');
    expect(container.textContent).not.toContain('availableBeds');

    await waitFor(() => expect(mocks.getDepositReport).toHaveBeenCalled());
    expect(mocks.getCheckInsCheckoutsReport).toHaveBeenCalled();
    expect(mocks.getFinancialSummary).toHaveBeenCalled();
  });
});
