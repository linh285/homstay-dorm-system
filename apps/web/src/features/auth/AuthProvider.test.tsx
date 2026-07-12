import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from '../../pages/DashboardPage';
import { AuthProvider, useAuth } from './AuthProvider';

const employee = {
  id: 'NV001',
  fullName: 'Sale Test',
  role: 'SALE' as const,
  branchId: 'CN001',
};

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithAuth(ui: React.ReactNode, client = createClient()) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <AuthProvider>{ui}</AuthProvider>
      </QueryClientProvider>,
    ),
  };
}

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe('AuthProvider session handling', () => {
  it('/auth/me 401 marks the session unauthenticated without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(401, {
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Expired session.' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    function Probe() {
      const { employee: currentEmployee, isInitialized } = useAuth();
      return (
        <span>
          {isInitialized
            ? currentEmployee
              ? 'authenticated'
              : 'unauthenticated'
            : 'loading'}
        </span>
      );
    }

    renderWithAuth(<Probe />);
    await screen.findByText('unauthenticated');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch dashboard while the visitor is unauthenticated', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(401, {
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Expired session.' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithAuth(<DashboardPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/auth/me');
  });

  it('clears private cache and auth state when the session is cleared', async () => {
    function Probe() {
      const {
        employee: currentEmployee,
        establishSession,
        clearSession,
      } = useAuth();
      useEffect(() => establishSession(employee), [establishSession]);
      return (
        <button onClick={clearSession}>
          {currentEmployee ? 'logout' : 'login'}
        </button>
      );
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { success: true, data: { employee }, meta: null }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { client } = renderWithAuth(<Probe />);
    client.setQueryData(['dashboard'], { private: true });

    await screen.findByText('logout');
    fireEvent.click(screen.getByText('logout'));
    await screen.findByText('login');
    expect(client.getQueryData(['dashboard'])).toBeUndefined();
  });
});
