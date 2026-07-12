import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Spin, Typography } from 'antd';

import { CounterCards } from '../components/CounterCards';
import { useAuth } from '../features/auth/AuthProvider';
import {
  getBranchSummary,
  getOccupancy,
  getRentalFunnel,
  getSystemSummary,
} from '../features/reporting/reporting-api';

function ReportCard({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown> | undefined;
}) {
  if (!data)
    return (
      <Card title={title}>
        <Spin />
      </Card>
    );
  const flat = Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => typeof value === 'number' || typeof value === 'string',
    ),
  );
  return (
    <Card title={title}>
      <CounterCards counters={flat} />
      <Typography.Paragraph className="report-json">
        {JSON.stringify(data, null, 2)}
      </Typography.Paragraph>
    </Card>
  );
}

export function ReportsPage() {
  const { employee, isInitialized } = useAuth();
  const isAdmin = employee?.role === 'ADMIN';
  const summary = useQuery({
    queryKey: ['report', isAdmin ? 'system' : 'branch'],
    queryFn: isAdmin ? getSystemSummary : getBranchSummary,
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });
  const occupancy = useQuery({
    queryKey: ['report', 'occupancy'],
    queryFn: () => getOccupancy(),
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });
  const funnel = useQuery({
    queryKey: ['report', 'funnel'],
    queryFn: () => getRentalFunnel(),
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });
  if (summary.isError || occupancy.isError || funnel.isError)
    return <Alert type="error" message="Không thể tải báo cáo." />;
  return (
    <>
      <Typography.Title level={2}>
        {isAdmin ? 'Báo cáo toàn hệ thống' : 'Báo cáo chi nhánh'}
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ReportCard
            title={isAdmin ? 'Tổng quan hệ thống' : 'Tổng quan chi nhánh'}
            data={summary.data}
          />
        </Col>
        <Col xs={24} lg={12}>
          <ReportCard title="Sức chứa và lấp đầy" data={occupancy.data} />
        </Col>
        <Col xs={24} lg={12}>
          <ReportCard title="Phễu thuê" data={funnel.data} />
        </Col>
      </Row>
    </>
  );
}
