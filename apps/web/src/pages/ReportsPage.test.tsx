import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
  return render(
    <QueryClientProvider client={client}>
      <ReportsPage />
    </QueryClientProvider>,
  );
}

describe('ReportsPage', () => {
  it('renders all report sections without raw JSON dump', async () => {
    mocks.getBranches.mockResolvedValueOnce([]);
    mocks.getSystemSummary.mockResolvedValueOnce({ scope: 'SYSTEM' });
    mocks.getOccupancy.mockResolvedValueOnce({
      scope: 'SYSTEM',
      totalBeds: 10,
      occupancyRate: 50,
    });
    mocks.getRentalFunnel.mockResolvedValueOnce({ counts: { ACTIVE: 2 } });
    mocks.getDepositReport.mockResolvedValueOnce({
      total: 3,
      totalDepositAmount: '3000000.00',
      expiringWithin24Hours: 1,
      countsByStatus: { DEPOSITED: 1 },
    });
    mocks.getCheckInsCheckoutsReport.mockResolvedValueOnce({
      contractsByStatus: { ACTIVE: 1 },
      checkoutsByStatus: { WAITING_INSPECTION: 1 },
      upcomingCheckIns: [{}],
      upcomingCheckouts: [{}],
    });
    mocks.getFinancialSummary.mockResolvedValueOnce({
      depositReceived: '3000000.00',
      refundPaid: '0.00',
      additionalPaymentReceived: '0.00',
      netCashFlow: '3000000.00',
    });

    renderPage();

    expect(
      await screen.findByText('Báo cáo toàn hệ thống'),
    ).toBeInTheDocument();
    expect(screen.getByText('Đặt cọc')).toBeInTheDocument();
    expect(screen.getByText('Nhận / trả phòng')).toBeInTheDocument();
    expect(screen.getByText('Tài chính')).toBeInTheDocument();
    expect(screen.queryByText(/\{"scope"/)).not.toBeInTheDocument();
  });
});
