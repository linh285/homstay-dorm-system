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

import { useAuth } from '../features/auth/AuthProvider';
import {
  listRentalRequests,
  type RentalRequest,
  type RentalRequestListParams,
} from '../features/rental-requests/rental-request-api';
import { formatStatusLabel } from '../lib/display-format';

export function RentalRequestsPage() {
  const navigate = useNavigate();
  const { employee, isInitialized } = useAuth();
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {},
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('registeredAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const params: RentalRequestListParams = {
    ...filters,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };
  const query = useQuery({
    queryKey: ['rental-requests', params],
    queryFn: () => listRentalRequests(params),
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
        onFinish={(values) => {
          setPage(1);
          setFilters(values);
        }}
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
              (value) => ({ value, label: formatStatusLabel(value) }),
            )}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button htmlType="submit">Lọc</Button>
            <Button
              onClick={() => {
                setPage(1);
                setFilters({});
              }}
            >
              Xóa lọc
            </Button>
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
        dataSource={query.data?.data ?? []}
        pagination={{
          current: query.data?.meta.page ?? page,
          pageSize: query.data?.meta.pageSize ?? pageSize,
          total: query.data?.meta.totalItems ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} yêu cầu`,
        }}
        onChange={(pagination, _filters, sorter) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? 20);
          if (!Array.isArray(sorter) && sorter.field) {
            setSortBy(String(sorter.field));
            setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
          }
        }}
        scroll={{ x: 1000 }}
        columns={[
          {
            title: 'Mã yêu cầu',
            dataIndex: 'id',
            width: 210,
            sorter: true,
          },
          {
            title: 'Khách / Đại diện',
            render: (_, row) =>
              row.representative.fullName ??
              row.representative.organizationName,
          },
          {
            title: 'Số người',
            dataIndex: 'expectedResidents',
            sorter: true,
          },
          {
            title: 'Hình thức',
            dataIndex: 'rentalMode',
            render: formatStatusLabel,
          },
          { title: 'Khu vực mong muốn', dataIndex: 'preferredArea' },
          { title: 'Chi nhánh', render: (_, row) => row.branch.name },
          {
            title: 'Ngày dự kiến vào',
            dataIndex: 'expectedCheckInDate',
            sorter: true,
            render: (value) => String(value).slice(0, 10),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            sorter: true,
            render: (_, row) => (
              <Tag color={row.status === 'CLOSED' ? 'default' : 'blue'}>
                {formatStatusLabel(row.status)}
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
