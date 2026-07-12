import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const { employee, isLoading } = useAuth();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      await navigate(location.state?.from?.pathname ?? '/');
    },
  });

  if (!isLoading && employee) return <Navigate to="/" replace />;
  const error =
    mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <main className="login-page">
      <Card className="login-card">
        <Typography.Title level={2}>Đăng nhập</Typography.Title>
        <Typography.Paragraph>
          HomeStay Dorm — hệ thống nội bộ cho nhân viên.
        </Typography.Paragraph>
        {error && (
          <Alert type="error" message={error} showIcon className="form-alert" />
        )}
        <Form
          layout="vertical"
          onFinish={form.handleSubmit((values) => mutation.mutate(values))}
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
                <Input autoComplete="username" {...field} />
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
                <Input.Password autoComplete="current-password" {...field} />
              </Form.Item>
            )}
          />
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            block
          >
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </main>
  );
}
