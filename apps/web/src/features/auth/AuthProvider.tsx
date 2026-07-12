import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { ApiError } from '../../lib/api-client';
import { getCurrentEmployee, type CurrentEmployee } from './auth-api';
import { registerUnauthorizedHandler } from './auth-session';

type AuthContextValue = {
  employee: CurrentEmployee | null;
  isInitialized: boolean;
  isLoading: boolean;
  refresh: () => Promise<unknown>;
  establishSession: (employee: CurrentEmployee) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [employee, setEmployee] = useState<CurrentEmployee | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthCheckEnabled, setIsAuthCheckEnabled] = useState(true);
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentEmployee,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: isAuthCheckEnabled,
  });
  const clearSession = useCallback(() => {
    setIsAuthCheckEnabled(false);
    setEmployee(null);
    setIsInitialized(true);
    void queryClient.cancelQueries();
    queryClient.removeQueries({
      predicate: (cachedQuery) => cachedQuery.queryKey[0] !== 'auth',
    });
  }, [queryClient]);

  const establishSession = useCallback(
    (nextEmployee: CurrentEmployee) => {
      setIsAuthCheckEnabled(false);
      setEmployee(nextEmployee);
      setIsInitialized(true);
      queryClient.setQueryData(['auth', 'me'], { employee: nextEmployee });
    },
    [queryClient],
  );

  useEffect(() => registerUnauthorizedHandler(clearSession), [clearSession]);
  useEffect(() => {
    if (!isAuthCheckEnabled) {
      return;
    }
    if (query.isSuccess) {
      establishSession(query.data.employee);
      return;
    }
    if (query.isError) {
      if (
        query.error instanceof ApiError &&
        query.error.code === 'UNAUTHENTICATED'
      ) {
        clearSession();
      } else {
        setEmployee(null);
        setIsInitialized(true);
      }
    }
  }, [
    clearSession,
    establishSession,
    isAuthCheckEnabled,
    query.data,
    query.error,
    query.isError,
    query.isSuccess,
  ]);

  return (
    <AuthContext.Provider
      value={{
        employee,
        isInitialized,
        isLoading: !isInitialized,
        refresh: query.refetch,
        establishSession,
        clearSession,
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
