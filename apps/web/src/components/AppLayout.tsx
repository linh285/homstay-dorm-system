import {
  AppstoreOutlined,
  CalendarOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeFilled,
  LoginOutlined,
  LogoutOutlined,
  PieChartOutlined,
  RollbackOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Dropdown, Layout, Menu, Tag } from 'antd';
import type { ReactNode } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

import { logout, type Role } from '../features/auth/auth-api';
import { useAuth } from '../features/auth/AuthProvider';

const { Sider, Header, Content } = Layout;

type MenuEntry = { key: string; label: string; roles: Role[]; icon: ReactNode };
const entries: MenuEntry[] = [
  {
    key: '/',
    label: 'Dashboard',
    roles: ['SALE', 'ACCOUNTANT', 'MANAGER', 'ADMIN'],
    icon: <DashboardOutlined />,
  },
  {
    key: '/employees',
    label: 'Nhân viên và chi nhánh',
    roles: ['ADMIN'],
    icon: <TeamOutlined />,
  },
  {
    key: '/rooms',
    label: 'Phòng và giường',
    roles: ['SALE', 'MANAGER', 'ADMIN'],
    icon: <AppstoreOutlined />,
  },
  {
    key: '/rental-requests',
    label: 'Yêu cầu thuê',
    roles: ['SALE'],
    icon: <FileTextOutlined />,
  },
  {
    key: '/viewings',
    label: 'Lịch xem phòng',
    roles: ['SALE'],
    icon: <CalendarOutlined />,
  },
  {
    key: '/deposits',
    label: 'Đặt cọc',
    roles: ['SALE', 'ACCOUNTANT', 'MANAGER'],
    icon: <DollarOutlined />,
  },
  {
    key: '/check-in',
    label: 'Nhận phòng',
    roles: ['SALE', 'ACCOUNTANT', 'MANAGER'],
    icon: <LoginOutlined />,
  },
  {
    key: '/check-out',
    label: 'Trả phòng',
    roles: ['SALE', 'ACCOUNTANT', 'MANAGER'],
    icon: <RollbackOutlined />,
  },
  {
    key: '/reports',
    label: 'Báo cáo',
    roles: ['MANAGER', 'ADMIN'],
    icon: <PieChartOutlined />,
  },
];

const roleLabels: Record<Role, string> = {
  SALE: 'Nhân viên Sale',
  ACCOUNTANT: 'Kế toán',
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
};

const roleColors: Record<Role, string> = {
  SALE: 'blue',
  ACCOUNTANT: 'gold',
  MANAGER: 'purple',
  ADMIN: 'red',
};

function resolveTitle(pathname: string): string {
  if (pathname.startsWith('/rental-requests/new')) return 'Tạo yêu cầu thuê';
  if (pathname.startsWith('/rental-requests/')) return 'Hồ sơ yêu cầu thuê';
  const exact = entries.find((entry) => entry.key === pathname);
  if (exact) return exact.label;
  const prefix = entries
    .filter((entry) => entry.key !== '/' && pathname.startsWith(entry.key))
    .sort((a, b) => b.key.length - a.key.length)[0];
  return prefix?.label ?? 'HomeStay Dorm';
}

function selectedKey(pathname: string): string {
  if (pathname === '/') return '/';
  const match = entries
    .filter((entry) => entry.key !== '/' && pathname.startsWith(entry.key))
    .sort((a, b) => b.key.length - a.key.length)[0];
  return match?.key ?? pathname;
}

export function AppLayout() {
  const { employee, clearSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      clearSession();
      queryClient.removeQueries({
        predicate: (cachedQuery) => cachedQuery.queryKey[0] !== 'auth',
      });
      await navigate('/login');
    },
  });

  if (!employee) return null;
  const menuItems = entries
    .filter((entry) => entry.roles.includes(employee.role))
    .map(({ key, label, icon }) => ({ key, label, icon }));
  const branchLabel = employee.branchId ?? 'Toàn hệ thống';

  return (
    <Layout className="app-shell">
      <Sider breakpoint="lg" collapsedWidth="0" width={252}>
        <div className="brand">
          <span className="brand-mark">
            <HomeFilled style={{ color: '#fff' }} />
          </span>
          <span className="brand-text">
            <span className="brand-title">HomeStay Dorm</span>
            <span className="brand-subtitle">Quản lý ký túc xá</span>
          </span>
        </div>
        <Menu
          className="sidebar-menu"
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey(location.pathname)]}
          items={menuItems}
          onClick={({ key }) => void navigate(key)}
        />
        <div className="sidebar-footer">
          © {new Date().getFullYear()} HomeStay Dorm
        </div>
      </Sider>
      <Layout>
        <Header className="app-header">
          <div>
            <div className="header-title">
              {resolveTitle(location.pathname)}
            </div>
            <div className="header-subtitle">
              {roleLabels[employee.role]} · Chi nhánh {branchLabel}
            </div>
          </div>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: 'profile',
                  label: (
                    <div style={{ padding: '4px 0' }}>
                      <div style={{ fontWeight: 600 }}>{employee.fullName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        {roleLabels[employee.role]}
                      </div>
                    </div>
                  ),
                  disabled: true,
                },
                { type: 'divider' },
                {
                  key: 'logout',
                  label: 'Đăng xuất',
                  icon: <LogoutOutlined />,
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === 'logout') logoutMutation.mutate();
              },
            }}
          >
            <Button type="text" className="account-button">
              <Avatar className="account-avatar">
                {employee.fullName.slice(0, 1).toUpperCase()}
              </Avatar>
              <span className="account-meta">
                <span className="account-name">{employee.fullName}</span>
                <span className="account-role">
                  <Tag
                    color={roleColors[employee.role]}
                    style={{ marginInlineEnd: 4, lineHeight: '16px' }}
                  >
                    {employee.role}
                  </Tag>
                  {branchLabel}
                </span>
              </span>
            </Button>
          </Dropdown>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
