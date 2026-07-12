import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';

import { useAuth } from '../features/auth/AuthProvider';
import {
  approvePayment,
  approveRoom,
  cancelDeposit,
  confirmCustomerRules,
  getDeposit,
  issuePaymentRequest,
  listDeposits,
  recordPayment,
  rejectPayment,
  rejectRoom,
  requestPaymentRecheck,
  scheduleCheckIn,
  submitRoomCheck,
  type Deposit,
  type DepositStatus,
} from '../features/deposits/deposits-api';
import { ApiError } from '../lib/api-client';

const statusMeta: Record<DepositStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Nháp', color: 'default' },
  WAITING_ROOM_CHECK: { label: 'Chờ kiểm tra phòng', color: 'gold' },
  ROOM_APPROVED: { label: 'Phòng đã duyệt', color: 'blue' },
  ROOM_REJECTED: { label: 'Phòng bị từ chối', color: 'red' },
  WAITING_PAYMENT: { label: 'Chờ thanh toán', color: 'orange' },
  WAITING_MANAGER_CONFIRMATION: { label: 'Chờ QL xác nhận', color: 'geekblue' },
  PAYMENT_RECHECK: { label: 'Cần kiểm tra lại', color: 'volcano' },
  PAYMENT_REJECTED: { label: 'Tiền bị từ chối', color: 'red' },
  DEPOSITED: { label: 'Đã đặt cọc', color: 'green' },
  EXPIRED: { label: 'Hết hạn', color: 'default' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

const stepOrder: DepositStatus[] = [
  'DRAFT',
  'WAITING_ROOM_CHECK',
  'ROOM_APPROVED',
  'WAITING_PAYMENT',
  'WAITING_MANAGER_CONFIRMATION',
  'DEPOSITED',
];

const stepLabels = [
  'Tạo & nội quy',
  'Kiểm tra phòng',
  'Phát hành thanh toán',
  'Ghi nhận tiền',
  'Xác nhận tiền',
  'Đã đặt cọc',
];

function displayError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Thao tác không thành công.';
}

function customerName(deposit: Deposit) {
  return deposit.customer.fullName ?? deposit.customer.organizationName ?? '—';
}

function currentStep(status: DepositStatus) {
  const index = stepOrder.indexOf(status);
  return index >= 0 ? index : 0;
}

export function DepositsPage() {
  const { employee, isInitialized } = useAuth();
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {},
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['deposits', filters],
    queryFn: () => listDeposits(filters),
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });

  return (
    <Card title="Đặt cọc">
      <Form
        layout="inline"
        className="filter-form"
        onFinish={(values) => setFilters(values)}
      >
        <Form.Item name="depositCode">
          <Input placeholder="Mã phiếu cọc" allowClear />
        </Form.Item>
        <Form.Item name="customerName">
          <Input placeholder="Tên khách" allowClear />
        </Form.Item>
        <Form.Item name="status">
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 200 }}
            options={Object.entries(statusMeta).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button htmlType="submit">Lọc</Button>
            <Button onClick={() => setFilters({})}>Xóa lọc</Button>
          </Space>
        </Form.Item>
      </Form>
      {query.isError && (
        <Typography.Text type="danger">
          Không thể tải danh sách phiếu cọc.
        </Typography.Text>
      )}
      <Table<Deposit>
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data ?? []}
        pagination={false}
        scroll={{ x: 1000 }}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'id', width: 200 },
          { title: 'Khách hàng', render: (_, row) => customerName(row) },
          {
            title: 'Phòng / giường',
            render: (_, row) =>
              row.details
                .map((detail) => `${detail.roomName}·${detail.bedName}`)
                .join(', '),
          },
          { title: 'Tổng cọc', dataIndex: 'totalDepositAmount' },
          {
            title: 'Trạng thái',
            render: (_, row) => (
              <Tag color={statusMeta[row.status].color}>
                {statusMeta[row.status].label}
              </Tag>
            ),
          },
          {
            title: 'Hạn thanh toán',
            render: (_, row) =>
              row.payment?.expiresAt
                ? new Date(row.payment.expiresAt).toLocaleString('vi-VN')
                : '—',
          },
          {
            title: 'Thao tác',
            fixed: 'right',
            render: (_, row) => (
              <Button type="link" onClick={() => setSelectedId(row.id)}>
                Chi tiết
              </Button>
            ),
          },
        ]}
      />
      <DepositDrawer
        depositId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </Card>
  );
}

function DepositDrawer({
  depositId,
  onClose,
}: {
  depositId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['deposit', depositId],
    queryFn: () => getDeposit(depositId!),
    enabled: Boolean(depositId),
    retry: false,
  });
  const deposit = query.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['deposit', depositId] });
    void queryClient.invalidateQueries({ queryKey: ['deposits'] });
  };

  const runner = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      message.success('Đã cập nhật phiếu cọc.');
      invalidate();
    },
    onError: (error) => message.error(displayError(error)),
  });

  const run = (fn: () => Promise<unknown>) => runner.mutate(fn);

  const actionButton = (action: string) => {
    if (!deposit) return null;
    switch (action) {
      case 'confirm-customer-rules':
        return (
          <Button key={action} onClick={() => setModal('confirm-rules')}>
            Xác nhận nội quy
          </Button>
        );
      case 'submit-room-check':
        return (
          <Button
            key={action}
            disabled={!deposit.customerAgreedToRules}
            onClick={() => run(() => submitRoomCheck(deposit.id))}
          >
            Gửi kiểm tra phòng
          </Button>
        );
      case 'approve-room':
        return (
          <Button
            key={action}
            type="primary"
            onClick={() => run(() => approveRoom(deposit.id))}
          >
            Cho phép nhận cọc
          </Button>
        );
      case 'reject-room':
        return (
          <Button key={action} danger onClick={() => setModal('reject-room')}>
            Phòng không khả dụng
          </Button>
        );
      case 'issue-payment-request':
        return (
          <Button
            key={action}
            type="primary"
            onClick={() => run(() => issuePaymentRequest(deposit.id))}
          >
            Phát hành yêu cầu thanh toán
          </Button>
        );
      case 'record-payment':
        return (
          <Button
            key={action}
            type="primary"
            onClick={() => setModal('record-payment')}
          >
            Ghi nhận thanh toán
          </Button>
        );
      case 'approve-payment':
        return (
          <Button
            key={action}
            type="primary"
            onClick={() => run(() => approvePayment(deposit.id))}
          >
            Xác nhận tiền hợp lệ
          </Button>
        );
      case 'request-payment-recheck':
        return (
          <Button key={action} onClick={() => setModal('recheck')}>
            Yêu cầu kiểm tra lại
          </Button>
        );
      case 'reject-payment':
        return (
          <Button
            key={action}
            danger
            onClick={() => setModal('reject-payment')}
          >
            Từ chối khoản tiền
          </Button>
        );
      case 'schedule-check-in':
        return (
          <Button
            key={action}
            type="primary"
            onClick={() => setModal('schedule')}
          >
            Hẹn ngày nhận phòng
          </Button>
        );
      case 'cancel':
        return (
          <Button
            key={action}
            danger
            onClick={() => run(() => cancelDeposit(deposit.id))}
          >
            Hủy phiếu
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Drawer
      title={deposit ? `Phiếu cọc ${deposit.id}` : 'Chi tiết phiếu cọc'}
      width={760}
      open={Boolean(depositId)}
      onClose={onClose}
      destroyOnClose
    >
      {deposit && (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Steps
            size="small"
            current={currentStep(deposit.status)}
            items={stepLabels.map((label) => ({ title: label }))}
          />
          <Space wrap>{deposit.availableActions.map(actionButton)}</Space>

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Khách hàng">
              {customerName(deposit)}
            </Descriptions.Item>
            <Descriptions.Item label="Yêu cầu thuê">
              {deposit.rentalRequestId}
            </Descriptions.Item>
            <Descriptions.Item label="Hình thức">
              {deposit.rentalModeSnapshot === 'WHOLE_ROOM'
                ? 'Nguyên phòng'
                : 'Ở ghép'}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng tiền cọc">
              {deposit.totalDepositAmount}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusMeta[deposit.status].color}>
                {statusMeta[deposit.status].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Nội quy">
              {deposit.customerAgreedToRules ? 'Khách đã đồng ý' : 'Chưa'}
            </Descriptions.Item>
            <Descriptions.Item label="Hạn thanh toán" span={2}>
              {deposit.payment?.expiresAt
                ? new Date(deposit.payment.expiresAt).toLocaleString('vi-VN')
                : '—'}
            </Descriptions.Item>
            {deposit.roomRejectionReason && (
              <Descriptions.Item label="Lý do từ chối phòng" span={2}>
                {deposit.roomRejectionReason}
              </Descriptions.Item>
            )}
            {deposit.scheduledCheckInAt && (
              <Descriptions.Item label="Ngày hẹn nhận phòng" span={2}>
                {new Date(deposit.scheduledCheckInAt).toLocaleString('vi-VN')}
              </Descriptions.Item>
            )}
          </Descriptions>

          <div>
            <Typography.Title level={5}>Giường và tiền cọc</Typography.Title>
            <Table
              rowKey="bedId"
              size="small"
              pagination={false}
              dataSource={deposit.details}
              columns={[
                { title: 'Phòng', dataIndex: 'roomName' },
                { title: 'Giường', dataIndex: 'bedName' },
                { title: 'Giá thuê', dataIndex: 'monthlyRentSnapshot' },
                { title: 'Số tháng', dataIndex: 'depositMonths' },
                { title: 'Thành tiền', dataIndex: 'depositAmount' },
              ]}
            />
          </div>

          {deposit.payment && (
            <Descriptions title="Thanh toán" bordered size="small" column={2}>
              <Descriptions.Item label="Phải thu">
                {deposit.payment.amountDue}
              </Descriptions.Item>
              <Descriptions.Item label="Đã thu">
                {deposit.payment.amountPaid ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức">
                {deposit.payment.method ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {deposit.payment.status}
              </Descriptions.Item>
            </Descriptions>
          )}

          <ConfirmRulesModal
            open={modal === 'confirm-rules'}
            onClose={() => setModal(null)}
            onSubmit={(note) => {
              run(() =>
                confirmCustomerRules(deposit.id, {
                  customerAgreed: true,
                  note,
                }),
              );
              setModal(null);
            }}
          />
          <ReasonModal
            open={modal === 'reject-room'}
            title="Từ chối phòng"
            onClose={() => setModal(null)}
            onSubmit={(reason) => {
              run(() => rejectRoom(deposit.id, reason));
              setModal(null);
            }}
          />
          <ReasonModal
            open={modal === 'recheck'}
            title="Yêu cầu kiểm tra lại"
            onClose={() => setModal(null)}
            onSubmit={(reason) => {
              run(() => requestPaymentRecheck(deposit.id, reason));
              setModal(null);
            }}
          />
          <ReasonModal
            open={modal === 'reject-payment'}
            title="Từ chối khoản thanh toán"
            onClose={() => setModal(null)}
            onSubmit={(reason) => {
              run(() => rejectPayment(deposit.id, reason));
              setModal(null);
            }}
          />
          <RecordPaymentModal
            open={modal === 'record-payment'}
            amountDue={deposit.payment?.amountDue ?? deposit.totalDepositAmount}
            onClose={() => setModal(null)}
            onSubmit={(values) => {
              run(() => recordPayment(deposit.id, values));
              setModal(null);
            }}
          />
          <ScheduleModal
            open={modal === 'schedule'}
            onClose={() => setModal(null)}
            onSubmit={(checkInAt, note) => {
              run(() => scheduleCheckIn(deposit.id, { checkInAt, note }));
              setModal(null);
            }}
          />
        </Space>
      )}
    </Drawer>
  );
}

function ConfirmRulesModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (note?: string) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Xác nhận khách đồng ý nội quy"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={(v) => onSubmit(v.note)}>
        <Form.Item
          name="agreed"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(new Error('Bắt buộc')),
            },
          ]}
        >
          <Checkbox>Khách đã đồng ý điều kiện thuê và nội quy (giấy).</Checkbox>
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ReasonModal({
  open,
  title,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={(v) => onSubmit(v.reason)}>
        <Form.Item
          name="reason"
          label="Lý do"
          rules={[{ required: true, message: 'Nhập lý do.' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function RecordPaymentModal({
  open,
  amountDue,
  onClose,
  onSubmit,
}: {
  open: boolean;
  amountDue: string;
  onClose: () => void;
  onSubmit: (values: {
    amount: string;
    method: 'CASH' | 'BANK_TRANSFER';
    paidAt: string;
    transactionReference?: string;
    receiptNumber?: string;
    externalEvidenceChecked: boolean;
    note?: string;
  }) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Ghi nhận thanh toán"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ amount: amountDue, method: 'BANK_TRANSFER' }}
        onFinish={(v) =>
          onSubmit({
            amount: v.amount,
            method: v.method,
            paidAt: new Date(v.paidAt).toISOString(),
            transactionReference: v.transactionReference,
            receiptNumber: v.receiptNumber,
            externalEvidenceChecked: Boolean(v.externalEvidenceChecked),
            note: v.note,
          })
        }
      >
        <Form.Item
          name="amount"
          label="Số tiền thực tế"
          rules={[
            { required: true },
            { pattern: /^\d+(\.\d{1,2})?$/, message: 'Số tiền không hợp lệ.' },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="method"
          label="Phương thức"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: 'CASH', label: 'Tiền mặt' },
              { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="paidAt"
          label="Thời điểm thanh toán"
          rules={[{ required: true, message: 'Chọn thời điểm.' }]}
        >
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="transactionReference" label="Mã giao dịch">
          <Input />
        </Form.Item>
        <Form.Item name="receiptNumber" label="Số phiếu thu">
          <Input />
        </Form.Item>
        <Form.Item
          name="externalEvidenceChecked"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(new Error('Bắt buộc')),
            },
          ]}
        >
          <Checkbox>Đã kiểm tra chứng từ bên ngoài.</Checkbox>
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ScheduleModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (checkInAt: string, note?: string) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Hẹn ngày nhận phòng"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => onSubmit(new Date(v.checkInAt).toISOString(), v.note)}
      >
        <Form.Item
          name="checkInAt"
          label="Ngày giờ nhận phòng"
          rules={[{ required: true, message: 'Chọn thời gian.' }]}
        >
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
