import { Card, Col, Row, Statistic } from 'antd';

export function CounterCards({
  counters,
}: {
  counters: Record<string, unknown>;
}) {
  return (
    <Row gutter={[16, 16]}>
      {Object.entries(counters)
        .filter(
          ([, value]) => typeof value === 'number' || typeof value === 'string',
        )
        .map(([label, value]) => (
          <Col xs={24} sm={12} lg={8} key={label}>
            <Card>
              <Statistic title={label} value={value as number | string} />
            </Card>
          </Col>
        ))}
    </Row>
  );
}
