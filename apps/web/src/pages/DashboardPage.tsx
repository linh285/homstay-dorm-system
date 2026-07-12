import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, Space, Spin, Table, Typography } from 'antd';

import { CounterCards } from '../components/CounterCards';
import { useAuth } from '../features/auth/AuthProvider';
import {
  getDashboard,
  type DashboardSchedule,
  type DashboardTask,
} from '../features/dashboard/dashboard-api';
import { ApiError } from '../lib/api-client';

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : '-';
}

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
  const dashboard = query.data;
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="Dashboard công việc">
        <Typography.Paragraph>
          Các chỉ số được hiển thị theo role và phạm vi chi nhánh của bạn.
        </Typography.Paragraph>
        <CounterCards counters={dashboard?.counters ?? {}} />
      </Card>
      <Card title="Công việc cần xử lý">
        {dashboard?.tasks.length ? (
          <Table<DashboardTask>
            rowKey="id"
            pagination={false}
            dataSource={dashboard.tasks}
            columns={[
              { title: 'Loại', dataIndex: 'type' },
              { title: 'Tiêu đề', dataIndex: 'title' },
              { title: 'Trạng thái', dataIndex: 'status' },
              {
                title: 'Phát sinh',
                dataIndex: 'occurredAt',
                render: dateTime,
              },
              { title: 'Hạn xử lý', dataIndex: 'dueAt', render: dateTime },
            ]}
          />
        ) : (
          <Empty description="Không có công việc cần xử lý" />
        )}
      </Card>
      <Card title="Lịch hôm nay">
        {dashboard?.todaySchedules.length ? (
          <Table<DashboardSchedule>
            rowKey="id"
            pagination={false}
            dataSource={dashboard.todaySchedules}
            columns={[
              { title: 'Loại', dataIndex: 'type' },
              { title: 'Tiêu đề', dataIndex: 'title' },
              { title: 'Trạng thái', dataIndex: 'status' },
              { title: 'Bắt đầu', dataIndex: 'startsAt', render: dateTime },
              { title: 'Kết thúc', dataIndex: 'endsAt', render: dateTime },
            ]}
          />
        ) : (
          <Empty description="Không có lịch hôm nay" />
        )}
      </Card>
    </Space>
  );
}
