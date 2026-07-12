import { Card, Layout, Typography } from 'antd';

const { Content, Header } = Layout;

export function App() {
  return (
    <Layout className="app-shell">
      <Header className="app-header">HomeStay Dorm</Header>
      <Content className="app-content">
        <Card>
          <Typography.Title level={2}>
            Hệ thống quản lý ký túc xá
          </Typography.Title>
          <Typography.Paragraph>
            Monorepo frontend, backend và Docker đã sẵn sàng cho các module
            nghiệp vụ.
          </Typography.Paragraph>
        </Card>
      </Content>
    </Layout>
  );
}
