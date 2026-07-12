import { LogoutOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Dropdown, Layout, Menu, Typography } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

import { logout, type Role } from '../features/auth/auth-api';
import { useAuth } from '../features/auth/AuthProvider';

const { Header, Sider, Content } = Layout;

type MenuEntry = { key: string; label: string; roles: Role[] };
const entries: MenuEntry[] = [
  {
    key: '/',
    label: 'Dashboard',
    roles: ['SALE', 'ACCOUNTANT', 'MANAGER', 'ADMIN'],
  },
  { key: '/employees', label: 'Nhân viên và chi nhánh', roles: ['ADMIN'] },
  {
    key: '/rooms',
    label: 'Phòng và giường',
    roles: ['SALE', 'MANAGER', 'ADMIN'],
  },
  { key: '/rental-requests', label: 'Yêu cầu thuê', roles: ['SALE'] },
  { key: '/viewings', label: 'Lịch xem phòng', roles: ['SALE'] },
  {
    key: '/deposits',
    label: 'Đặt cọc',
    roles: ['SALE', 'ACCOUNTANT', 'MANAGER'],
  },
  {
    key: '/check-in',
    label: 'Nhận phòng',
    roles: ['SALE', 'ACCOUNTANT', 'MANAGER'],
  },
  {
    key: '/check-out',
    label: 'Trả phòng',
    roles: ['SALE', 'ACCOUNTANT', 'MANAGER'],
  },
  { key: '/reports', label: 'Báo cáo', roles: ['MANAGER', 'ADMIN'] },
];

export function AppLayout() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      queryClient.removeQueries({ queryKey: ['auth'] });
      await navigate('/login');
    },
  });

  if (!employee) return null;
  const menuItems = entries
    .filter((entry) => entry.roles.includes(employee.role))
    .map(({ key, label }) => ({ key, label }));
  const branchLabel = employee.branchId ?? 'Toàn hệ thống';

  return (
    <Layout className="app-shell">
      <Sider breakpoint="lg" collapsedWidth="0">
        <div className="brand">HomeStay Dorm</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => void navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Text>Hệ thống quản lý ký túc xá</Typography.Text>
          <Dropdown
            menu={{
              items: [
                { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined /> },
              ],
              onClick: () => logoutMutation.mutate(),
            }}
          >
            <Button type="text" className="account-button">
              <Avatar>{employee.fullName.slice(0, 1).toUpperCase()}</Avatar>
              <span>
                {employee.fullName} · {employee.role} · {branchLabel}
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
