import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import type { PropsWithChildren } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '../features/auth/AuthProvider';
import { ApiError } from '../lib/api-client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.code === 'UNAUTHENTICATED') &&
        failureCount < 3,
    },
  },
});

const appTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#4f46e5',
    colorInfo: '#4f46e5',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    borderRadius: 10,
    fontFamily:
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    colorBgLayout: '#f4f6fb',
    colorTextHeading: '#0f172a',
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#0f172a',
      bodyBg: '#f4f6fb',
      headerHeight: 64,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: '#4f46e5',
      darkItemHoverBg: 'rgba(255,255,255,0.08)',
      darkItemColor: 'rgba(226,232,240,0.72)',
      darkItemSelectedColor: '#ffffff',
      itemBorderRadius: 10,
      itemHeight: 44,
      itemMarginInline: 12,
    },
    Card: { borderRadiusLG: 16 },
    Button: { controlHeight: 38, fontWeight: 500, primaryShadow: 'none' },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      borderColor: '#eef2f7',
    },
    Input: { controlHeight: 38 },
    Select: { controlHeight: 38 },
    Segmented: { itemSelectedBg: '#4f46e5', itemSelectedColor: '#ffffff' },
  },
};

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={viVN} theme={appTheme}>
          <AntApp>
            <AuthProvider>{children}</AuthProvider>
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
