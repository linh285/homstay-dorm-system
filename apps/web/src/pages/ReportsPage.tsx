import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';

import { useAuth } from '../features/auth/AuthProvider';
import {
  getBranchSummary,
  getOccupancy,
  getRentalFunnel,
  getSystemSummary,
  type Occupancy,
  type OperationalCounts,
  type Finances,
  type RentalFunnel,
  type SystemBranchSummary,
} from '../features/reporting/reporting-api';
import { formatVnd } from '../lib/format';

const bedSegments: {
  key: keyof Omit<Occupancy, 'totalBeds' | 'occupancyRate'>;
  label: string;
  color: string;
}[] = [
  { key: 'availableBeds', label: 'Còn trống', color: '#16a34a' },
  { key: 'heldBeds', label: 'Đang giữ', color: '#d97706' },
  { key: 'depositedBeds', label: 'Đã đặt cọc', color: '#2563eb' },
  { key: 'occupiedBeds', label: 'Đang ở', color: '#db2777' },
];

const funnelMeta: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Đang mở', color: '#4f46e5' },
  VIEWING: { label: 'Đang xem phòng', color: '#0ea5e9' },
  DEPOSIT_PROCESS: { label: 'Đang đặt cọc', color: '#d97706' },
  CLOSED: { label: 'Đã đóng', color: '#94a3b8' },
};

function OccupancyBar({ occupancy }: { occupancy: Occupancy }) {
  const total = occupancy.totalBeds || 1;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 14,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#eef2f7',
        }}
      >
        {bedSegments.map((seg) => {
          const value = occupancy[seg.key];
          const width = (value / total) * 100;
          return width > 0 ? (
            <div
              key={seg.key}
              style={{ width: `${width}%`, background: seg.color }}
              title={`${seg.label}: ${value}`}
            />
          ) : null;
        })}
      </div>
      <Space wrap size={16} style={{ marginTop: 12 }}>
        {bedSegments.map((seg) => (
          <span key={seg.key} style={{ fontSize: 13, color: '#475569' }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 3,
                background: seg.color,
                marginRight: 6,
              }}
            />
            {seg.label}: <strong>{occupancy[seg.key]}</strong>
          </span>
        ))}
      </Space>
    </div>
  );
}

function OccupancyPanel({ occupancy }: { occupancy: Occupancy }) {
  return (
    <Card title="Sức chứa và lấp đầy" style={{ height: '100%' }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
          <Progress
            type="dashboard"
            percent={Math.round(occupancy.occupancyRate)}
            strokeColor={{ '0%': '#4f46e5', '100%': '#0ea5e9' }}
            size={140}
            format={(percent) => (
              <span>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{percent}%</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>lấp đầy</div>
              </span>
            )}
          />
        </Col>
        <Col xs={24} sm={16}>
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Statistic title="Tổng giường" value={occupancy.totalBeds} />
            </Col>
            <Col span={12}>
              <Statistic
                title="Còn trống"
                value={occupancy.availableBeds}
                valueStyle={{ color: '#16a34a' }}
              />
            </Col>
          </Row>
          <OccupancyBar occupancy={occupancy} />
        </Col>
      </Row>
    </Card>
  );
}

function FinancePanel({ finances }: { finances: Finances }) {
  const tiles = [
    { label: 'Tiền cọc đã thu', value: finances.deposit, color: '#16a34a' },
    { label: 'Tiền đã hoàn', value: finances.refund, color: '#db2777' },
    { label: 'Tiền thu thêm', value: finances.additionalPayment, color: '#2563eb' },
  ];
  return (
    <Card title="Tài chính" style={{ height: '100%' }}>
      <Row gutter={[16, 16]}>
        {tiles.map((tile) => (
          <Col xs={24} key={tile.label}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: `${tile.color}0f`,
              }}
            >
              <div style={{ fontSize: 13, color: '#64748b' }}>{tile.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: tile.color }}>
                {formatVnd(tile.value)}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

function CountsPanel({ counts }: { counts: OperationalCounts }) {
  const tiles = [
    { label: 'Yêu cầu thuê', value: counts.rentalRequests },
    { label: 'Lịch xem hôm nay', value: counts.todayViewings },
    { label: 'Đặt cọc', value: counts.deposits },
    { label: 'Hợp đồng', value: counts.contracts },
    { label: 'Trả phòng', value: counts.checkoutRequests },
  ];
  return (
    <Card title="Hoạt động">
      <Row gutter={[16, 16]}>
        {tiles.map((tile) => (
          <Col xs={12} sm={8} lg={4} key={tile.label}>
            <Statistic title={tile.label} value={tile.value} />
          </Col>
        ))}
      </Row>
    </Card>
  );
}

function FunnelPanel({ funnel }: { funnel: RentalFunnel }) {
  const entries = Object.entries(funnel.counts);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <Card title="Yêu cầu thuê theo trạng thái" style={{ height: '100%' }}>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        {entries.length === 0 && (
          <Typography.Text type="secondary">Chưa có dữ liệu.</Typography.Text>
        )}
        {entries.map(([status, value]) => {
          const meta = funnelMeta[status] ?? { label: status, color: '#64748b' };
          return (
            <div key={status}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  fontSize: 13,
                }}
              >
                <span>{meta.label}</span>
                <strong>{value}</strong>
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 6,
                  background: '#eef2f7',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(value / max) * 100}%`,
                    background: meta.color,
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>
          );
        })}
      </Space>
    </Card>
  );
}

export function ReportsPage() {
  const { employee, isInitialized } = useAuth();
  const isAdmin = employee?.role === 'ADMIN';
  const enabled = isInitialized && Boolean(employee);

  const branchQuery = useQuery({
    queryKey: ['report', 'branch'],
    queryFn: getBranchSummary,
    enabled: enabled && !isAdmin,
    retry: false,
  });
  const systemQuery = useQuery({
    queryKey: ['report', 'system'],
    queryFn: getSystemSummary,
    enabled: enabled && isAdmin,
    retry: false,
  });
  const occupancy = useQuery({
    queryKey: ['report', 'occupancy'],
    queryFn: () => getOccupancy(),
    enabled,
    retry: false,
  });
  const funnel = useQuery({
    queryKey: ['report', 'funnel'],
    queryFn: () => getRentalFunnel(),
    enabled,
    retry: false,
  });

  if (branchQuery.isError || systemQuery.isError || occupancy.isError || funnel.isError)
    return <Alert type="error" showIcon message="Không thể tải báo cáo." />;

  const loading =
    (isAdmin ? systemQuery.isLoading : branchQuery.isLoading) ||
    occupancy.isLoading ||
    funnel.isLoading;
  if (loading)
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <Spin size="large" />
      </div>
    );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {isAdmin ? 'Báo cáo toàn hệ thống' : 'Báo cáo chi nhánh'}
      </Typography.Title>

      {isAdmin ? (
        <SystemReport branches={systemQuery.data?.branches ?? []} />
      ) : (
        branchQuery.data && (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <OccupancyPanel occupancy={branchQuery.data.occupancy} />
              </Col>
              <Col xs={24} lg={10}>
                <FinancePanel finances={branchQuery.data.finances} />
              </Col>
            </Row>
            <CountsPanel counts={branchQuery.data.counts} />
          </>
        )
      )}

      <Row gutter={[16, 16]}>
        {occupancy.data && (
          <Col xs={24} lg={12}>
            <OccupancyPanel occupancy={occupancy.data} />
          </Col>
        )}
        {funnel.data && (
          <Col xs={24} lg={12}>
            <FunnelPanel funnel={funnel.data} />
          </Col>
        )}
      </Row>
    </Space>
  );
}

function SystemReport({ branches }: { branches: SystemBranchSummary[] }) {
  const totals = branches.reduce(
    (acc, item) => ({
      totalBeds: acc.totalBeds + item.occupancy.totalBeds,
      occupiedBeds: acc.occupiedBeds + item.occupancy.occupiedBeds,
      deposits: acc.deposits + item.counts.deposits,
      contracts: acc.contracts + item.counts.contracts,
      depositMoney: acc.depositMoney + item.finances.deposit,
    }),
    { totalBeds: 0, occupiedBeds: 0, deposits: 0, contracts: 0, depositMoney: 0 },
  );
  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Số chi nhánh" value={branches.length} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Tổng giường" value={totals.totalBeds} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="Giường đang ở" value={totals.occupiedBeds} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic
              title="Tiền cọc đã thu"
              value={formatVnd(totals.depositMoney)}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>
      <Card title="Theo chi nhánh" style={{ marginTop: 16 }}>
        <Table<SystemBranchSummary>
          rowKey={(row) => row.branch.id}
          dataSource={branches}
          pagination={false}
          scroll={{ x: 800 }}
          columns={[
            { title: 'Chi nhánh', render: (_, row) => row.branch.name },
            {
              title: 'Lấp đầy',
              width: 160,
              render: (_, row) => (
                <Progress
                  percent={Math.round(row.occupancy.occupancyRate)}
                  size="small"
                  strokeColor="#4f46e5"
                />
              ),
            },
            {
              title: 'Giường (ở/tổng)',
              render: (_, row) =>
                `${row.occupancy.occupiedBeds}/${row.occupancy.totalBeds}`,
            },
            { title: 'Yêu cầu thuê', render: (_, row) => row.counts.rentalRequests },
            { title: 'Đặt cọc', render: (_, row) => row.counts.deposits },
            { title: 'Hợp đồng', render: (_, row) => row.counts.contracts },
            {
              title: 'Tiền cọc đã thu',
              render: (_, row) => (
                <Tag color="green">{formatVnd(row.finances.deposit)}</Tag>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
