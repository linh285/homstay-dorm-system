import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

import { useAuth } from '../features/auth/AuthProvider';
import { listContracts } from '../features/checkin/checkin-api';
import {
  cancelCheckout,
  completeInspection,
  createCheckout,
  createInspection,
  getCheckout,
  getInspection,
  listCheckouts,
  putInspectionItems,
  submitCheckout,
  updateInspection,
  type CheckoutRequest,
  type CheckoutStatus,
} from '../features/checkout/checkout-api';
import { listDeposits } from '../features/deposits/deposits-api';
import { createSettlement } from '../features/settlements/settlements-api';
import { MoneyInput } from '../components/MoneyInput';
import { ApiError } from '../lib/api-client';
import { groupRoomBeds } from '../lib/format';
import { SettlementDrawer } from './SettlementDrawer';

const statusMeta: Record<CheckoutStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Nháp', color: 'default' },
  WAITING_INSPECTION: { label: 'Chờ kiểm tra', color: 'gold' },
  INSPECTED: { label: 'Đã kiểm tra', color: 'cyan' },
  WAITING_SETTLEMENT: { label: 'Chờ đối soát', color: 'blue' },
  WAITING_CUSTOMER_CONFIRMATION: { label: 'Chờ khách xác nhận', color: 'geekblue' },
  DISPUTED: { label: 'Khiếu nại', color: 'volcano' },
  WAITING_FINANCIAL_COMPLETION: { label: 'Chờ xử lý tiền', color: 'orange' },
  READY_TO_COMPLETE: { label: 'Sẵn sàng hoàn tất', color: 'purple' },
  COMPLETED: { label: 'Hoàn tất', color: 'green' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

const inspectionResults = ['NORMAL', 'DAMAGED', 'MISSING', 'CLEANING_REQUIRED', 'OTHER_VIOLATION'];

function displayError(error: unknown) {
  return error instanceof ApiError ? error.message : 'Thao tác không thành công.';
}
function customerName(checkout: CheckoutRequest) {
  return checkout.customer.fullName ?? checkout.customer.organizationName ?? '—';
}

export function CheckOutPage() {
  const { employee, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const isSale = employee?.role === 'SALE';

  const query = useQuery({
    queryKey: ['checkouts', filters],
    queryFn: () => listCheckouts(filters),
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });

  return (
    <Card
      title="Trả phòng, đối soát và hoàn cọc"
      extra={
        isSale ? (
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            Tạo yêu cầu trả phòng
          </Button>
        ) : null
      }
    >
      <Form layout="inline" className="filter-form" onFinish={(values) => setFilters(values)}>
        <Form.Item name="customerName">
          <Input placeholder="Tên khách" allowClear />
        </Form.Item>
        <Form.Item name="status">
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 200 }}
            options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))}
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
        <Typography.Text type="danger">Không thể tải danh sách yêu cầu trả phòng.</Typography.Text>
      )}
      <Table<CheckoutRequest>
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data ?? []}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Mã yêu cầu', dataIndex: 'id', width: 200 },
          { title: 'Khách hàng', render: (_, row) => customerName(row) },
          {
            title: 'Phòng / giường',
            render: (_, row) => (
              <Space direction="vertical" size={0}>
                {groupRoomBeds(row.beds).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </Space>
            ),
          },
          { title: 'Loại', render: (_, row) => (row.hasContract ? 'Có hợp đồng' : 'Chỉ cọc') },
          {
            title: 'Trạng thái',
            render: (_, row) => <Tag color={statusMeta[row.status].color}>{statusMeta[row.status].label}</Tag>,
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
      <CreateCheckoutModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['checkouts'] });
          setSelectedId(id);
        }}
      />
      <CheckoutDrawer checkoutId={selectedId} onClose={() => setSelectedId(null)} />
    </Card>
  );
}

function CreateCheckoutModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form] = Form.useForm();
  const [mode, setMode] = useState<'contract' | 'deposit'>('contract');
  const contractsQuery = useQuery({
    queryKey: ['contracts', { status: 'ACTIVE' }],
    queryFn: () => listContracts({ status: 'ACTIVE' }),
    enabled: open,
    retry: false,
  });
  const depositsQuery = useQuery({
    queryKey: ['deposits', { status: 'DEPOSITED', forCheckout: true }],
    queryFn: () => listDeposits({ status: 'DEPOSITED' }),
    enabled: open,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (values: { targetId: string; expectedCheckoutAt?: string; reason?: string }) =>
      createCheckout({
        contractId: mode === 'contract' ? values.targetId : undefined,
        depositId: mode === 'deposit' ? values.targetId : undefined,
        expectedCheckoutAt: values.expectedCheckoutAt ? new Date(values.expectedCheckoutAt).toISOString() : undefined,
        reason: values.reason,
      }),
    onSuccess: (checkout) => {
      message.success('Đã tạo yêu cầu trả phòng.');
      form.resetFields();
      onCreated(checkout.id);
    },
    onError: (error) => message.error(displayError(error)),
  });

  return (
    <Modal
      title="Tạo yêu cầu trả phòng"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
        <Form.Item label="Loại hồ sơ">
          <Select
            value={mode}
            onChange={(value) => {
              setMode(value);
              form.setFieldValue('targetId', undefined);
            }}
            options={[
              { value: 'contract', label: 'Đã ký hợp đồng' },
              { value: 'deposit', label: 'Chỉ mới đặt cọc' },
            ]}
          />
        </Form.Item>
        <Form.Item name="targetId" label={mode === 'contract' ? 'Hợp đồng' : 'Phiếu cọc'} rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            loading={mode === 'contract' ? contractsQuery.isLoading : depositsQuery.isLoading}
            options={
              mode === 'contract'
                ? (contractsQuery.data ?? []).map((contract) => ({
                    value: contract.id,
                    label: `${contract.id} · ${contract.customer.fullName ?? ''}`,
                  }))
                : (depositsQuery.data ?? []).map((deposit) => ({
                    value: deposit.id,
                    label: `${deposit.id} · ${deposit.customer.fullName ?? ''}`,
                  }))
            }
          />
        </Form.Item>
        <Form.Item name="expectedCheckoutAt" label="Ngày trả dự kiến">
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="reason" label="Lý do trả phòng">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function CheckoutDrawer({
  checkoutId,
  onClose,
}: {
  checkoutId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const canViewFinance =
    employee?.role === 'MANAGER' || employee?.role === 'ACCOUNTANT';
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const query = useQuery({
    queryKey: ['checkout', checkoutId],
    queryFn: () => getCheckout(checkoutId!),
    enabled: Boolean(checkoutId),
    retry: false,
  });
  const checkout = query.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['checkout', checkoutId] });
    void queryClient.invalidateQueries({ queryKey: ['checkouts'] });
  };
  const runner = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      message.success('Đã cập nhật yêu cầu.');
      invalidate();
    },
    onError: (error) => message.error(displayError(error)),
  });
  const run = (fn: () => Promise<unknown>) => runner.mutate(fn);
  const has = (action: string) => checkout?.availableActions.includes(action);

  return (
    <Drawer
      title={checkout ? `Yêu cầu ${checkout.id}` : 'Chi tiết'}
      width={820}
      open={Boolean(checkoutId)}
      onClose={onClose}
      destroyOnClose
    >
      {checkout && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            {has('submit') && (
              <Button type="primary" onClick={() => run(() => submitCheckout(checkout.id))}>
                Gửi kiểm tra
              </Button>
            )}
            {has('cancel') && (
              <Button danger onClick={() => run(() => cancelCheckout(checkout.id))}>
                Hủy yêu cầu
              </Button>
            )}
            {has('create-inspection') && (
              <Button
                type="primary"
                onClick={() =>
                  run(() => createInspection(checkout.id, {}).then(() => setInspectionOpen(true)))
                }
              >
                Bắt đầu kiểm tra
              </Button>
            )}
            {checkout.inspection && canViewFinance && (
              <Button onClick={() => setInspectionOpen(true)}>Xem kiểm tra</Button>
            )}
            {has('create-settlement') && (
              <Button
                type="primary"
                onClick={() =>
                  run(() =>
                    createSettlement(checkout.id).then(() => {
                      invalidate();
                      setSettlementOpen(true);
                    }),
                  )
                }
              >
                Tạo đối soát
              </Button>
            )}
            {checkout.settlement && canViewFinance && (
              <Button type="primary" onClick={() => setSettlementOpen(true)}>
                Mở đối soát
              </Button>
            )}
          </Space>

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Khách hàng">{customerName(checkout)}</Descriptions.Item>
            <Descriptions.Item label="Loại">
              {checkout.hasContract ? 'Có hợp đồng' : 'Chỉ cọc (80%)'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusMeta[checkout.status].color}>{statusMeta[checkout.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày trả dự kiến">
              {checkout.expectedCheckoutAt
                ? new Date(checkout.expectedCheckoutAt).toLocaleString('vi-VN')
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Lý do" span={2}>
              {checkout.reason ?? '—'}
            </Descriptions.Item>
          </Descriptions>

          <InspectionDrawer
            open={inspectionOpen}
            inspectionId={checkout.inspection?.id ?? null}
            onClose={() => setInspectionOpen(false)}
            onChanged={invalidate}
          />
          <SettlementDrawer
            open={settlementOpen}
            settlementId={checkout.settlement?.id ?? null}
            onClose={() => setSettlementOpen(false)}
            onChanged={invalidate}
          />
        </Space>
      )}
    </Drawer>
  );
}

function InspectionDrawer({
  open,
  inspectionId,
  onClose,
  onChanged,
}: {
  open: boolean;
  inspectionId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [rows, setRows] = useState<
    { result: string; description: string; quantity: number; estimatedCost: string }[]
  >([]);
  const query = useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: () => getInspection(inspectionId!),
    enabled: open && Boolean(inspectionId),
    retry: false,
  });
  const inspection = query.data;
  const isCompleted = inspection?.status === 'COMPLETED';

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
    onChanged();
  };
  const saveMutation = useMutation({
    mutationFn: () =>
      Promise.all([
        updateInspection(inspectionId!, {
          sanitationCondition: form.getFieldValue('sanitationCondition'),
          areaCondition: form.getFieldValue('areaCondition'),
        }),
        putInspectionItems(
          inspectionId!,
          rows.map((row) => ({
            result: row.result,
            description: row.description || null,
            quantity: row.quantity ?? null,
            estimatedCost: row.estimatedCost || null,
          })),
        ),
      ]),
    onSuccess: () => {
      message.success('Đã lưu biên bản kiểm tra.');
      invalidate();
    },
    onError: (error) => message.error(displayError(error)),
  });
  const completeMutation = useMutation({
    mutationFn: () => completeInspection(inspectionId!),
    onSuccess: () => {
      message.success('Đã hoàn tất kiểm tra.');
      invalidate();
      onClose();
    },
    onError: (error) => message.error(displayError(error)),
  });

  useEffect(() => {
    if (open && inspection) {
      form.setFieldsValue({
        sanitationCondition: inspection.sanitationCondition,
        areaCondition: inspection.areaCondition,
      });
      setRows(
        inspection.items.map((item) => ({
          result: item.result,
          description: item.description ?? '',
          quantity: item.quantity ?? 1,
          estimatedCost: item.estimatedCost ?? '',
        })),
      );
    }
  }, [open, inspection, form]);

  return (
    <Drawer
      title="Kiểm tra trả phòng"
      width={720}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {query.isLoading && (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <Spin size="large" />
        </div>
      )}
      {query.isError && (
        <Alert type="error" showIcon message="Không thể tải biên bản kiểm tra." />
      )}
      {inspection && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Tag color={isCompleted ? 'green' : 'gold'}>{inspection.status}</Tag>
          <Form form={form} layout="vertical" disabled={isCompleted}>
            <Form.Item name="sanitationCondition" label="Tình trạng vệ sinh">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="areaCondition" label="Tình trạng khu vực">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>

          <div>
            <Space style={{ marginBottom: 8 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Tài sản hư hỏng / mất
              </Typography.Title>
              {!isCompleted && (
                <Button
                  size="small"
                  onClick={() =>
                    setRows([...rows, { result: 'DAMAGED', description: '', quantity: 1, estimatedCost: '' }])
                  }
                >
                  Thêm dòng
                </Button>
              )}
            </Space>
            <Table
              rowKey={(_, index) => String(index)}
              size="small"
              pagination={false}
              dataSource={rows}
              columns={[
                {
                  title: 'Kết quả',
                  render: (_, row, index) => (
                    <Select
                      disabled={isCompleted}
                      value={row.result}
                      style={{ width: 150 }}
                      onChange={(value) =>
                        setRows((prev) => prev.map((item, i) => (i === index ? { ...item, result: value } : item)))
                      }
                      options={inspectionResults.map((value) => ({ value, label: value }))}
                    />
                  ),
                },
                {
                  title: 'Mô tả',
                  render: (_, row, index) => (
                    <Input
                      disabled={isCompleted}
                      value={row.description}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, description: e.target.value } : item)),
                        )
                      }
                    />
                  ),
                },
                {
                  title: 'SL',
                  render: (_, row, index) => (
                    <InputNumber
                      disabled={isCompleted}
                      min={0}
                      value={row.quantity}
                      onChange={(value) =>
                        setRows((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, quantity: value ?? 0 } : item)),
                        )
                      }
                    />
                  ),
                },
                {
                  title: 'Chi phí dự kiến',
                  render: (_, row, index) => (
                    <MoneyInput
                      disabled={isCompleted}
                      value={row.estimatedCost || undefined}
                      onChange={(value) =>
                        setRows((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, estimatedCost: value ?? '' }
                              : item,
                          ),
                        )
                      }
                    />
                  ),
                },
                {
                  title: '',
                  render: (_, __, index) =>
                    !isCompleted ? (
                      <Button
                        type="link"
                        danger
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Xóa
                      </Button>
                    ) : null,
                },
              ]}
            />
          </div>

          {!isCompleted && (
            <Space>
              <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
                Lưu biên bản
              </Button>
              <Button type="primary" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>
                Hoàn tất kiểm tra
              </Button>
            </Space>
          )}
        </Space>
      )}
    </Drawer>
  );
}
