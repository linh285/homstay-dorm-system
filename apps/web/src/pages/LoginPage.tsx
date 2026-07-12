import { HomeFilled, LockOutlined, UserOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ApiError } from '../lib/api-client';
import { login } from '../features/auth/auth-api';
import { useAuth } from '../features/auth/AuthProvider';

const loginSchema = z.object({
  username: z.string().min(1, 'Nhập tên đăng nhập.'),
  password: z.string().min(1, 'Nhập mật khẩu.'),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { employee, isLoading, establishSession } = useAuth();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async ({ employee: authenticatedEmployee }) => {
      establishSession(authenticatedEmployee);
      await navigate(location.state?.from?.pathname ?? '/');
    },
  });

  if (!isLoading && employee) return <Navigate to="/" replace />;
  const error =
    mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <main className="login-page">
      <Card className="login-card" styles={{ body: { padding: 32 } }}>
        <div className="login-brand">
          <span className="brand-mark">
            <HomeFilled style={{ color: '#fff' }} />
          </span>
          <span className="brand-text">
            <span className="brand-title" style={{ color: '#0f172a' }}>
              HomeStay Dorm
            </span>
            <span className="brand-subtitle" style={{ color: '#94a3b8' }}>
              Hệ thống nội bộ
            </span>
          </span>
        </div>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          Chào mừng trở lại 👋
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Đăng nhập để tiếp tục quản lý ký túc xá.
        </Typography.Paragraph>
        {error && (
          <Alert type="error" message={error} showIcon className="form-alert" />
        )}
        <Form
          layout="vertical"
          onFinish={form.handleSubmit((values) => mutation.mutate(values))}
          requiredMark={false}
        >
          <Controller
            name="username"
            control={form.control}
            render={({ field, fieldState }) => (
              <Form.Item
                label="Tên đăng nhập"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="sale01"
                  autoComplete="username"
                  {...field}
                />
              </Form.Item>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Form.Item
                label="Mật khẩu"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...field}
                />
              </Form.Item>
            )}
          />
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            size="large"
            block
          >
            Đăng nhập
          </Button>
        </Form>
        <div className="login-hint">
          Tài khoản demo · mật khẩu <code>Password123!</code>
          <br />
          <code>sale01</code> · <code>accountant01</code> ·{' '}
          <code>manager01</code> · <code>admin01</code>
        </div>
      </Card>
    </main>
  );
}
