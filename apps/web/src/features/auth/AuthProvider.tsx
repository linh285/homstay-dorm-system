import { useQuery } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';

import { ApiError } from '../../lib/api-client';
import { getCurrentEmployee, type CurrentEmployee } from './auth-api';

type AuthContextValue = {
  employee: CurrentEmployee | null;
  isLoading: boolean;
  refresh: () => Promise<unknown>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentEmployee,
    retry: false,
    staleTime: 60_000,
  });
  const isUnauthenticated =
    query.error instanceof ApiError && query.error.code === 'UNAUTHENTICATED';

  return (
    <AuthContext.Provider
      value={{
        employee: isUnauthenticated ? null : (query.data?.employee ?? null),
        isLoading: query.isLoading,
        refresh: query.refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
