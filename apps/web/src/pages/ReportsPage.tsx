import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Empty,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { useState } from 'react';

import { CounterCards } from '../components/CounterCards';
import { getBranches } from '../features/administration/administration-api';
import { useAuth } from '../features/auth/AuthProvider';
import {
  getBranchSummary,
  getCheckInsCheckoutsReport,
  getDepositReport,
  getFinancialSummary,
  getOccupancy,
  getRentalFunnel,
  getSystemSummary,
  type ReportData,
} from '../features/reporting/reporting-api';

function asRecord(data: ReportData | undefined): Record<string, unknown> {
  return data ?? {};
}

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function money(value: unknown) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numberValue(value));
}

function countsTable(counts: unknown) {
  const rows = Object.entries((counts ?? {}) as Record<string, number>).map(
    ([status, count]) => ({ status, count }),
  );
  if (!rows.length) return <Empty description="Chưa có dữ liệu" />;
  return (
    <Table
      rowKey="status"
      pagination={false}
      size="small"
      dataSource={rows}
      columns={[
        { title: 'Trạng thái', dataIndex: 'status' },
        { title: 'Số lượng', dataIndex: 'count' },
      ]}
    />
  );
}

function SummaryCard({
  title,
  data,
}: {
  title: string;
  data: ReportData | undefined;
}) {
  const record = asRecord(data);
  const flat = Object.fromEntries(
    Object.entries(record).filter(
      ([, value]) => typeof value === 'number' || typeof value === 'string',
    ),
  );
  return (
    <Card title={title}>
      <CounterCards counters={flat} />
    </Card>
  );
}

export function ReportsPage() {
  const { employee, isInitialized } = useAuth();
  const isAdmin = employee?.role === 'ADMIN';
  const [branchId, setBranchId] = useState<string>();
  const enabled = isInitialized && Boolean(employee);
  const branches = useQuery({
    queryKey: ['branches', 'report-filter'],
    queryFn: getBranches,
    enabled: enabled && isAdmin,
    retry: false,
  });
  const summary = useQuery({
    queryKey: ['report', isAdmin ? 'system' : 'branch'],
    queryFn: isAdmin ? getSystemSummary : getBranchSummary,
    enabled,
    retry: false,
  });
  const occupancy = useQuery({
    queryKey: ['report', 'occupancy', branchId],
    queryFn: () => getOccupancy(branchId),
    enabled,
    retry: false,
  });
  const funnel = useQuery({
    queryKey: ['report', 'funnel', branchId],
    queryFn: () => getRentalFunnel(branchId),
    enabled,
    retry: false,
  });
  const deposits = useQuery({
    queryKey: ['report', 'deposits', branchId],
    queryFn: () => getDepositReport(branchId),
    enabled,
    retry: false,
  });
  const checkInsCheckouts = useQuery({
    queryKey: ['report', 'check-ins-checkouts', branchId],
    queryFn: () => getCheckInsCheckoutsReport(branchId),
    enabled,
    retry: false,
  });
  const financial = useQuery({
    queryKey: ['report', 'financial-summary', branchId],
    queryFn: () => getFinancialSummary(branchId),
    enabled,
    retry: false,
  });

  if (
    summary.isError ||
    occupancy.isError ||
    funnel.isError ||
    deposits.isError ||
    checkInsCheckouts.isError ||
    financial.isError
  )
    return <Alert type="error" message="Không thể tải báo cáo." />;

  const occupancyData = asRecord(occupancy.data);
  const depositData = asRecord(deposits.data);
  const checkData = asRecord(checkInsCheckouts.data);
  const financialData = asRecord(financial.data);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space align="center" wrap>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {isAdmin ? 'Báo cáo toàn hệ thống' : 'Báo cáo chi nhánh'}
        </Typography.Title>
        {isAdmin && (
          <Select
            allowClear
            placeholder="Lọc theo chi nhánh"
            style={{ width: 240 }}
            value={branchId}
            onChange={setBranchId}
            options={branches.data?.map((branch) => ({
              value: branch.id,
              label: `${branch.id} - ${branch.name}`,
            }))}
          />
        )}
      </Space>
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <SummaryCard
            title={isAdmin ? 'Tổng quan hệ thống' : 'Tổng quan chi nhánh'}
            data={summary.data}
          />
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Sức chứa và lấp đầy">
            <CounterCards counters={occupancyData} />
            <Progress
              percent={numberValue(occupancyData.occupancyRate)}
              status="active"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Phễu thuê">
            {countsTable((asRecord(funnel.data).counts as unknown) ?? {})}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Đặt cọc">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="Tổng phiếu"
                  value={numberValue(depositData.total)}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Tiền cọc hợp lệ"
                  value={money(depositData.totalDepositAmount)}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Sắp hết hạn 24h"
                  value={numberValue(depositData.expiringWithin24Hours)}
                />
              </Col>
            </Row>
            {countsTable(depositData.countsByStatus)}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Nhận / trả phòng">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Nhận phòng 7 ngày tới">
                {Array.isArray(checkData.upcomingCheckIns)
                  ? checkData.upcomingCheckIns.length
                  : 0}
              </Descriptions.Item>
              <Descriptions.Item label="Trả phòng 7 ngày tới">
                {Array.isArray(checkData.upcomingCheckouts)
                  ? checkData.upcomingCheckouts.length
                  : 0}
              </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5}>Hợp đồng</Typography.Title>
            {countsTable(checkData.contractsByStatus)}
            <Typography.Title level={5}>Trả phòng</Typography.Title>
            {countsTable(checkData.checkoutsByStatus)}
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Tài chính">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={6}>
                <Statistic
                  title="Cọc đã thu"
                  value={money(financialData.depositReceived)}
                />
              </Col>
              <Col xs={24} md={6}>
                <Statistic
                  title="Hoàn cọc đã chi"
                  value={money(financialData.refundPaid)}
                />
              </Col>
              <Col xs={24} md={6}>
                <Statistic
                  title="Thu thêm"
                  value={money(financialData.additionalPaymentReceived)}
                />
              </Col>
              <Col xs={24} md={6}>
                <Statistic
                  title="Dòng tiền ròng"
                  value={money(financialData.netCashFlow)}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
