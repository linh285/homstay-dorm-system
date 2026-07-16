import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../features/auth/AuthProvider';
import { AppLayout } from './AppLayout';

const employee = {
  id: 'NV001',
  fullName: 'Sale Test',
  role: 'SALE' as const,
  branchId: 'CN001',
};

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe('AppLayout logout', () => {
  it('redirects to login and removes private cache even when logout fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, data: { employee }, meta: null }),
      )
      .mockRejectedValueOnce(new Error('Network unavailable'));
    vi.stubGlobal('fetch', fetchMock);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(['dashboard'], { private: true });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<div>Private page</div>} />
              </Route>
              <Route path="/login" element={<div>Login page</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText('Private page');
    fireEvent.click(screen.getByText(/Sale Test/));
    fireEvent.click(await screen.findByText('Đăng xuất'));

    await screen.findByText('Login page');
    await waitFor(() =>
      expect(client.getQueryData(['dashboard'])).toBeUndefined(),
    );
  });

  it('reserves a header slot before the page content', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, data: { employee }, meta: null }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<h1>Dashboard</h1>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
    const header = screen
      .getAllByText('Dashboard')
      .map((element) => element.closest('header'))
      .find(Boolean);
    const content = screen.getByRole('main');

    if (!header) throw new Error('App header was not rendered.');
    expect(header).toHaveClass('app-header');
    expect(content).toHaveClass('app-content');
    expect(header.compareDocumentPosition(content)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(content.className).not.toMatch(/negative|clip|hidden/i);
  });
});
