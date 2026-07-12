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

type Meta = { label: string; icon: ReactNode; color: string };

const meta: Record<string, Meta> = {
  activeRentalRequests: { label: 'Yêu cầu thuê đang mở', icon: <FileTextOutlined />, color: '#4f46e5' },
  todayViewings: { label: 'Lịch xem hôm nay', icon: <CalendarOutlined />, color: '#0ea5e9' },
  depositsInProgress: { label: 'Đặt cọc đang xử lý', icon: <DollarOutlined />, color: '#d97706' },
  scheduledCheckIns: { label: 'Chờ nhận phòng', icon: <LoginOutlined />, color: '#7c3aed' },
  openCheckoutRequests: { label: 'Yêu cầu trả phòng', icon: <RollbackOutlined />, color: '#db2777' },
  depositsWaitingCalculation: { label: 'Cọc chờ tính tiền', icon: <DollarOutlined />, color: '#d97706' },
  paymentsWaitingRecord: { label: 'Chờ ghi nhận tiền', icon: <DollarOutlined />, color: '#0891b2' },
  settlementsWaiting: { label: 'Đối soát đang chờ', icon: <AuditOutlined />, color: '#db2777' },
  roomsWaitingApproval: { label: 'Phòng chờ duyệt', icon: <HomeOutlined />, color: '#0ea5e9' },
  depositsWaitingApproval: { label: 'Cọc chờ xác nhận', icon: <SafetyCertificateOutlined />, color: '#16a34a' },
  eligibilityReviews: { label: 'Duyệt điều kiện cư trú', icon: <CheckSquareOutlined />, color: '#7c3aed' },
  handoversWaiting: { label: 'Chờ bàn giao', icon: <LoginOutlined />, color: '#4f46e5' },
  inspectionsWaiting: { label: 'Chờ kiểm tra trả phòng', icon: <AuditOutlined />, color: '#db2777' },
  branches: { label: 'Chi nhánh', icon: <BankOutlined />, color: '#4f46e5' },
  employees: { label: 'Nhân viên', icon: <TeamOutlined />, color: '#0ea5e9' },
  rooms: { label: 'Phòng', icon: <HomeOutlined />, color: '#7c3aed' },
  totalBeds: { label: 'Tổng số giường', icon: <ApartmentOutlined />, color: '#475569' },
  availableBeds: { label: 'Giường còn trống', icon: <ApartmentOutlined />, color: '#16a34a' },
  heldBeds: { label: 'Giường đang giữ', icon: <ApartmentOutlined />, color: '#d97706' },
  depositedBeds: { label: 'Giường đã đặt cọc', icon: <ApartmentOutlined />, color: '#0ea5e9' },
  occupiedBeds: { label: 'Giường đang ở', icon: <ApartmentOutlined />, color: '#db2777' },
};

function fallback(key: string): Meta {
  return { label: key, icon: <FileTextOutlined />, color: '#64748b' };
}

export function CounterCards({
  counters,
}: {
  counters: Record<string, unknown>;
}) {
  const entries = Object.entries(counters).filter(
    ([, value]) => typeof value === 'number' || typeof value === 'string',
  );
  return (
    <Row gutter={[16, 16]}>
      {entries.map(([key, value]) => {
        const info = meta[key] ?? fallback(key);
        return (
          <Col xs={24} sm={12} lg={8} xxl={6} key={key}>
            <Card
              styles={{ body: { padding: 20 } }}
              style={{ borderColor: '#eef1f6', overflow: 'hidden' }}
            >
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
                      {info.label}
                    </span>
                  }
                  value={value as number | string}
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
