import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  listRentalRequests,
  type RentalRequest,
} from '../features/rental-requests/rental-request-api';
import { useAuth } from '../features/auth/AuthProvider';

export function RentalRequestsPage() {
  const navigate = useNavigate();
  const { employee, isInitialized } = useAuth();
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {},
  );
  const query = useQuery({
    queryKey: ['rental-requests', filters],
    queryFn: () => listRentalRequests(filters),
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });

  return (
    <Card
      title="Danh sách yêu cầu thuê"
      extra={
        <Button
          type="primary"
          onClick={() => void navigate('/rental-requests/new')}
        >
          Tạo yêu cầu thuê
        </Button>
      }
    >
      <Form
        layout="inline"
        onFinish={(values) => setFilters(values)}
        initialValues={filters}
        className="filter-form"
      >
        <Form.Item name="customerName">
          <Input placeholder="Tên khách" allowClear />
        </Form.Item>
        <Form.Item name="phone">
          <Input placeholder="Điện thoại" allowClear />
        </Form.Item>
        <Form.Item name="rentalMode">
          <Select
            placeholder="Hình thức thuê"
            allowClear
            style={{ width: 160 }}
            options={[
              { value: 'WHOLE_ROOM', label: 'Nguyên phòng' },
              { value: 'SHARED_BEDS', label: 'Ở ghép' },
            ]}
          />
        </Form.Item>
        <Form.Item name="status">
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 160 }}
            options={['ACTIVE', 'VIEWING', 'DEPOSIT_PROCESS', 'CLOSED'].map(
              (value) => ({ value, label: value }),
            )}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button htmlType="submit">Lọc</Button>
            <Button onClick={() => setFilters({})}>Xóa lọc</Button>
          </Space>
        </Form.Item>
      </Form>
      {query.isError && (
        <Typography.Text type="danger">
          Không thể tải danh sách yêu cầu thuê.
        </Typography.Text>
      )}
      <Table<RentalRequest>
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data ?? []}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Mã yêu cầu', dataIndex: 'id', width: 210 },
          {
            title: 'Khách / đại diện',
            render: (_, row) =>
              row.representative.fullName ??
              row.representative.organizationName,
          },
          { title: 'Số người', dataIndex: 'expectedResidents' },
          { title: 'Hình thức', dataIndex: 'rentalMode' },
          { title: 'Chi nhánh', render: (_, row) => row.branch.name },
          {
            title: 'Ngày dự kiến vào',
            dataIndex: 'expectedCheckInDate',
            render: (value) => String(value).slice(0, 10),
          },
          {
            title: 'Trạng thái',
            render: (_, row) => (
              <Tag color={row.status === 'CLOSED' ? 'default' : 'blue'}>
                {row.status}
              </Tag>
            ),
          },
          {
            title: 'Thao tác',
            fixed: 'right',
            render: (_, row) => (
              <Button
                type="link"
                onClick={() => void navigate(`/rental-requests/${row.id}`)}
              >
                Xem
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}
