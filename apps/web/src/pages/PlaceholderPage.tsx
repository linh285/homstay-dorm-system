import { Card, Typography } from 'antd';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Card>
      <Typography.Title level={2}>{title}</Typography.Title>
      <Typography.Paragraph>
        Chức năng nghiệp vụ sẽ được triển khai trong module tương ứng.
      </Typography.Paragraph>
    </Card>
  );
}
