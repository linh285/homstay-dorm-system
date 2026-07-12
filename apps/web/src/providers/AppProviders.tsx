import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
}
