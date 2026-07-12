import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { RentalRequestsPage } from './RentalRequestsPage';

const mocks = vi.hoisted(() => ({
  listRentalRequests: vi.fn(),
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

vi.mock('../features/rental-requests/rental-request-api', async () => {
  const actual = await vi.importActual<
    typeof import('../features/rental-requests/rental-request-api')
  >('../features/rental-requests/rental-request-api');
  return {
    ...actual,
    listRentalRequests: mocks.listRentalRequests,
  };
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RentalRequestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RentalRequestsPage', () => {
  it('uses server-side pagination metadata and shows preferred area', async () => {
    mocks.listRentalRequests.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'RR001',
          branchId: 'CN001',
          expectedResidents: 2,
          rentalMode: 'SHARED_BEDS',
          preferredArea: 'Khu A',
          expectedCheckInDate: '2027-01-01',
          rentalDurationMonths: 12,
          status: 'ACTIVE',
          registeredAt: new Date().toISOString(),
          representative: {
            id: 'C001',
            customerType: 'INDIVIDUAL',
            fullName: 'Nguyễn A',
          },
          branch: { id: 'CN001', name: 'Chi nhánh 1' },
          saleEmployee: { id: 'NV001', fullName: 'Sale Test' },
          members: [],
        },
      ],
      meta: { page: 1, pageSize: 20, totalItems: 25, totalPages: 2 },
    });

    renderPage();

    expect(await screen.findByText('RR001')).toBeInTheDocument();
    expect(screen.getByText('Khu A')).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.listRentalRequests).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 20 }),
      ),
    );
  });
});
