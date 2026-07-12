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

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
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
  if (query.isLoading)
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <Spin size="large" />
      </div>
    );
  if (query.error instanceof ApiError && query.error.code === 'UNAUTHENTICATED')
    return null;
  if (query.isError)
    return <Alert type="error" message="Không thể tải dashboard." showIcon />;
  const dashboard = query.data;
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div
        style={{
          padding: '24px 28px',
          borderRadius: 16,
          color: '#fff',
          background:
            'linear-gradient(120deg, #4f46e5 0%, #6366f1 45%, #0ea5e9 100%)',
          boxShadow: '0 12px 30px rgba(79, 70, 229, 0.28)',
        }}
      >
        <Typography.Title level={3} style={{ color: '#fff', margin: 0 }}>
          {greeting()}, {employee.fullName} 👋
        </Typography.Title>
        <Typography.Paragraph
          style={{ color: 'rgba(255,255,255,0.85)', margin: '6px 0 0' }}
        >
          Đây là các chỉ số công việc theo vai trò và chi nhánh của bạn.
        </Typography.Paragraph>
      </div>

      <Card title="Dashboard công việc">
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
