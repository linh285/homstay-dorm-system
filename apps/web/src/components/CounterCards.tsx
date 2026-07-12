import {
  ApartmentOutlined,
  AuditOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  LoginOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Statistic } from 'antd';
import type { ReactNode } from 'react';

import {
  formatMetricLabel,
  formatMetricValue,
  isKnownMetric,
} from '../lib/display-format';

type Meta = { icon: ReactNode; color: string };

const meta: Record<string, Meta> = {
  activeRentalRequests: { icon: <FileTextOutlined />, color: '#4f46e5' },
  todayViewings: { icon: <CalendarOutlined />, color: '#0ea5e9' },
  depositsInProgress: { icon: <DollarOutlined />, color: '#d97706' },
  scheduledCheckIns: { icon: <LoginOutlined />, color: '#7c3aed' },
  openCheckoutRequests: { icon: <RollbackOutlined />, color: '#db2777' },
  depositsWaitingCalculation: { icon: <DollarOutlined />, color: '#d97706' },
  paymentsWaitingRecord: { icon: <DollarOutlined />, color: '#0891b2' },
  settlementsWaiting: { icon: <AuditOutlined />, color: '#db2777' },
  roomsWaitingApproval: { icon: <HomeOutlined />, color: '#0ea5e9' },
  depositsWaitingApproval: {
    icon: <SafetyCertificateOutlined />,
    color: '#16a34a',
  },
  eligibilityReviews: { icon: <CheckSquareOutlined />, color: '#7c3aed' },
  handoversWaiting: { icon: <LoginOutlined />, color: '#4f46e5' },
  inspectionsWaiting: { icon: <AuditOutlined />, color: '#db2777' },
  branches: { icon: <BankOutlined />, color: '#4f46e5' },
  employees: { icon: <TeamOutlined />, color: '#0ea5e9' },
  rooms: { icon: <HomeOutlined />, color: '#7c3aed' },
  totalBeds: { icon: <ApartmentOutlined />, color: '#475569' },
  availableBeds: { icon: <ApartmentOutlined />, color: '#16a34a' },
  heldBeds: { icon: <ApartmentOutlined />, color: '#d97706' },
  depositedBeds: { icon: <ApartmentOutlined />, color: '#0ea5e9' },
  occupiedBeds: { icon: <ApartmentOutlined />, color: '#db2777' },
};

function fallback(): Meta {
  return { icon: <FileTextOutlined />, color: '#64748b' };
}

export function CounterCards({
  counters,
}: {
  counters: Record<string, unknown>;
}) {
  const entries = Object.entries(counters).filter(
    ([key, value]) =>
      isKnownMetric(key) &&
      (typeof value === 'number' || typeof value === 'string'),
  );

  return (
    <Row gutter={[16, 16]}>
      {entries.map(([key, value]) => {
        const info = meta[key] ?? fallback();
        return (
          <Col xs={24} sm={12} lg={8} xxl={6} key={key}>
            <Card className="metric-card" styles={{ body: { padding: 20 } }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    flexShrink: 0,
                    fontSize: 22,
                    color: info.color,
                    background: `${info.color}14`,
                  }}
                >
                  {info.icon}
                </span>
                <Statistic
                  title={
                    <span style={{ color: '#64748b', fontSize: 13 }}>
                      {formatMetricLabel(key)}
                    </span>
                  }
                  value={formatMetricValue(key, value)}
                  valueStyle={{
                    fontWeight: 700,
                    fontSize: 26,
                    color: '#0f172a',
                  }}
                />
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
