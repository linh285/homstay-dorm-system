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
import {
  formatCurrencyVnd,
  formatMetricLabel,
  formatMetricValue,
  formatPercent,
  formatScopeLabel,
  formatStatusLabel,
} from '../lib/display-format';

type StatusRow = {
  status: string;
  label: string;
  count: number;
};

type BranchSummaryRow = {
  key: string;
  branchName: string;
  totalBeds: number;
  availableBeds: number;
  heldBeds: number;
  depositedBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
};

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function statusRows(counts: unknown): StatusRow[] {
  return Object.entries(asRecord(counts)).map(([status, count]) => ({
    status,
    label: formatStatusLabel(status),
    count: asNumber(count),
  }));
}

function CountsTable({ counts }: { counts: unknown }) {
  const rows = statusRows(counts);
  if (!rows.length) return <Empty description="Chưa có dữ liệu" />;
  return (
    <Table<StatusRow>
      rowKey="status"
      size="small"
      pagination={false}
      dataSource={rows}
      columns={[
        { title: 'Trạng thái', dataIndex: 'label' },
        { title: 'Số lượng', dataIndex: 'count', align: 'right' },
      ]}
    />
  );
}

function MetricStatistic({
  metricKey,
  value,
}: {
  metricKey: string;
  value: unknown;
}) {
  const label = formatMetricLabel(metricKey);
  if (!label) return null;
  return (
    <Statistic
      title={label}
      value={formatMetricValue(metricKey, value)}
      className="report-stat"
    />
  );
}

function scopeOf(data: ReportData | undefined) {
  return formatScopeLabel(String(asRecord(data).scope ?? ''));
}

function branchSummaryRows(
  summary: ReportData | undefined,
  selectedBranchId?: string,
): BranchSummaryRow[] {
  const branches = asRecord(summary).branches;
  if (!Array.isArray(branches)) return [];
  return branches
    .filter((item) => {
      if (!selectedBranchId) return true;
      return String(asRecord(asRecord(item).branch).id) === selectedBranchId;
    })
    .map((item, index) => {
      const record = asRecord(item);
      const branch = asRecord(record.branch);
      const occupancy = asRecord(record.occupancy);
      return {
        key: String(branch.id ?? index),
        branchName: String(branch.name ?? branch.id ?? '-'),
        totalBeds: asNumber(occupancy.totalBeds),
        availableBeds: asNumber(occupancy.availableBeds),
        heldBeds: asNumber(occupancy.heldBeds),
        depositedBeds: asNumber(occupancy.depositedBeds),
        occupiedBeds: asNumber(occupancy.occupiedBeds),
        occupancyRate: asNumber(occupancy.occupancyRate),
      };
    });
}

function SystemSummaryTable({
  summary,
  selectedBranchId,
}: {
  summary: ReportData | undefined;
  selectedBranchId?: string;
}) {
  const rows = branchSummaryRows(summary, selectedBranchId);
  if (!rows.length) return <Empty description="Chưa có dữ liệu chi nhánh" />;
  return (
    <Table<BranchSummaryRow>
      rowKey="key"
      pagination={false}
      dataSource={rows}
      columns={[
        { title: 'Chi nhánh', dataIndex: 'branchName' },
        { title: 'Tổng số giường', dataIndex: 'totalBeds', align: 'right' },
        { title: 'Còn trống', dataIndex: 'availableBeds', align: 'right' },
        { title: 'Giữ chỗ', dataIndex: 'heldBeds', align: 'right' },
        { title: 'Đã cọc', dataIndex: 'depositedBeds', align: 'right' },
        { title: 'Đang ở', dataIndex: 'occupiedBeds', align: 'right' },
        {
          title: 'Tỷ lệ lấp đầy',
          dataIndex: 'occupancyRate',
          align: 'right',
          render: formatPercent,
        },
      ]}
    />
  );
}

function UpcomingTable({
  title,
  rows,
  dateKey,
}: {
  title: string;
  rows: unknown;
  dateKey: string;
}) {
  const data = Array.isArray(rows)
    ? rows.map((item, index) => {
        const record = asRecord(item);
        return {
          key: String(record.id ?? index),
          id: String(record.id ?? '-'),
          branchId: String(record.branchId ?? '-'),
          status: formatStatusLabel(String(record.status ?? '')),
          date: record[dateKey]
            ? new Date(String(record[dateKey])).toLocaleString('vi-VN')
            : '-',
        };
      })
    : [];

  return (
    <Card title={title} className="equal-card">
      {data.length ? (
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={data}
          columns={[
            { title: 'Mã hồ sơ', dataIndex: 'id' },
            { title: 'Chi nhánh', dataIndex: 'branchId' },
            { title: 'Trạng thái', dataIndex: 'status' },
            { title: 'Thời gian', dataIndex: 'date' },
          ]}
        />
      ) : (
        <Empty description="Chưa có lịch trong 7 ngày tới" />
      )}
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
    queryKey: ['report', 'rental-funnel', branchId],
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
  ) {
    return <Alert type="error" title="Không thể tải báo cáo." />;
  }

  const occupancyData = asRecord(occupancy.data);
  const funnelData = asRecord(funnel.data);
  const depositData = asRecord(deposits.data);
  const checkData = asRecord(checkInsCheckouts.data);
  const financialData = asRecord(financial.data);
  const summaryScope =
    isAdmin && branchId ? formatScopeLabel(branchId) : scopeOf(summary.data);

  return (
    <Space orientation="vertical" size="large" className="page-stack">
      <Space align="center" wrap>
        <Typography.Title level={2} className="page-title">
          {isAdmin ? 'Báo cáo toàn hệ thống' : 'Báo cáo chi nhánh'}
        </Typography.Title>
        {isAdmin && (
          <Select
            allowClear
            placeholder="Lọc theo chi nhánh"
            style={{ width: 260 }}
            value={branchId}
            onChange={setBranchId}
            options={branches.data?.map((branch) => ({
              value: branch.id,
              label: `${branch.id} - ${branch.name}`,
            }))}
          />
        )}
      </Space>

      <Card
        title={isAdmin ? 'Tổng quan hệ thống' : 'Tổng quan chi nhánh'}
        extra={`Phạm vi: ${summaryScope}`}
      >
        {isAdmin ? (
          <SystemSummaryTable
            summary={summary.data}
            selectedBranchId={branchId}
          />
        ) : (
          <CounterCards counters={asRecord(asRecord(summary.data).occupancy)} />
        )}
      </Card>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={12}>
          <Card
            title="Sức chứa và lấp đầy"
            className="equal-card"
            extra={`Phạm vi: ${scopeOf(occupancy.data)}`}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <MetricStatistic
                  metricKey="totalBeds"
                  value={occupancyData.totalBeds}
                />
              </Col>
              <Col span={12}>
                <MetricStatistic
                  metricKey="availableBeds"
                  value={occupancyData.availableBeds}
                />
              </Col>
              <Col span={8}>
                <MetricStatistic
                  metricKey="heldBeds"
                  value={occupancyData.heldBeds}
                />
              </Col>
              <Col span={8}>
                <MetricStatistic
                  metricKey="depositedBeds"
                  value={occupancyData.depositedBeds}
                />
              </Col>
              <Col span={8}>
                <MetricStatistic
                  metricKey="occupiedBeds"
                  value={occupancyData.occupiedBeds}
                />
              </Col>
            </Row>
            <Progress
              percent={asNumber(occupancyData.occupancyRate)}
              format={formatPercent}
              status="active"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Phễu thuê"
            className="equal-card"
            extra={`Phạm vi: ${scopeOf(funnel.data)}`}
          >
            <CountsTable counts={funnelData.counts} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={12}>
          <Card
            title="Báo cáo đặt cọc"
            className="equal-card"
            extra={`Phạm vi: ${scopeOf(deposits.data)}`}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <MetricStatistic metricKey="total" value={depositData.total} />
              </Col>
              <Col xs={24} md={8}>
                <MetricStatistic
                  metricKey="totalDepositAmount"
                  value={depositData.totalDepositAmount}
                />
              </Col>
              <Col xs={24} md={8}>
                <MetricStatistic
                  metricKey="expiringWithin24Hours"
                  value={depositData.expiringWithin24Hours}
                />
              </Col>
            </Row>
            <CountsTable counts={depositData.countsByStatus} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Báo cáo nhận / trả phòng"
            className="equal-card"
            extra={`Phạm vi: ${scopeOf(checkInsCheckouts.data)}`}
          >
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Lịch nhận phòng 7 ngày tới">
                {Array.isArray(checkData.upcomingCheckIns)
                  ? checkData.upcomingCheckIns.length
                  : 0}
              </Descriptions.Item>
              <Descriptions.Item label="Lịch trả phòng 7 ngày tới">
                {Array.isArray(checkData.upcomingCheckouts)
                  ? checkData.upcomingCheckouts.length
                  : 0}
              </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5}>Trạng thái hợp đồng</Typography.Title>
            <CountsTable counts={checkData.contractsByStatus} />
            <Typography.Title level={5}>Trạng thái trả phòng</Typography.Title>
            <CountsTable counts={checkData.checkoutsByStatus} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <UpcomingTable
            title="Lịch nhận phòng sắp tới"
            rows={checkData.upcomingCheckIns}
            dateKey="scheduledCheckInAt"
          />
        </Col>
        <Col xs={24} lg={12}>
          <UpcomingTable
            title="Lịch trả phòng sắp tới"
            rows={checkData.upcomingCheckouts}
            dateKey="expectedCheckoutAt"
          />
        </Col>
      </Row>

      <Card
        title="Báo cáo tài chính"
        extra={`Phạm vi: ${scopeOf(financial.data)}`}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Statistic
              title="Tiền cọc đã thu"
              value={formatCurrencyVnd(financialData.depositReceived)}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic
              title="Tiền hoàn cọc đã chi"
              value={formatCurrencyVnd(financialData.refundPaid)}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic
              title="Tiền thu thêm"
              value={formatCurrencyVnd(financialData.additionalPaymentReceived)}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic
              title="Dòng tiền ròng"
              value={formatCurrencyVnd(financialData.netCashFlow)}
            />
          </Col>
        </Row>
      </Card>
    </Space>
  );
}
