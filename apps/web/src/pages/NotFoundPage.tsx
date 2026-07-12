import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="Không tìm thấy trang bạn yêu cầu."
      extra={
        <Button type="primary" onClick={() => void navigate('/')}>
          Về dashboard
        </Button>
      }
    />
  );
}
