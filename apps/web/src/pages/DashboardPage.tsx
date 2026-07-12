import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Spin, Typography } from 'antd';

import { CounterCards } from '../components/CounterCards';
import { getDashboard } from '../features/dashboard/dashboard-api';

export function DashboardPage() {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  if (query.isLoading) return <Spin />;
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
