import { Spin } from 'antd';
import type { PropsWithChildren } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import type { Role } from '../features/auth/auth-api';
import { useAuth } from '../features/auth/AuthProvider';

export function ProtectedRoute() {
  const { employee, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Spin className="page-spinner" size="large" />;
  return employee ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

export function RoleRoute({
  roles,
  children,
}: PropsWithChildren<{ roles: Role[] }>) {
  const { employee } = useAuth();
  return employee && roles.includes(employee.role) ? (
    <>{children}</>
  ) : (
    <Navigate to="/forbidden" replace />
  );
}
