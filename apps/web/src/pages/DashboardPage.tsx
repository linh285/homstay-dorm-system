import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Spin, Typography } from 'antd';

import { CounterCards } from '../components/CounterCards';
import { useAuth } from '../features/auth/AuthProvider';
import { getDashboard } from '../features/dashboard/dashboard-api';
import { ApiError } from '../lib/api-client';

export function DashboardPage() {
  const { employee, isInitialized } = useAuth();
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });
  if (!isInitialized || !employee) return null;
  if (query.isLoading) return <Spin />;
  if (query.error instanceof ApiError && query.error.code === 'UNAUTHENTICATED')
    return null;
  if (query.isError)
    return <Alert type="error" message="Không thể tải dashboard." />;
  return (
    <Card title="Dashboard công việc">
      <Typography.Paragraph>
        Các chỉ số được hiển thị theo role và phạm vi chi nhánh của bạn.
      </Typography.Paragraph>
      <CounterCards counters={query.data?.counters ?? {}} />
    </Card>
  );
}
