import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
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
  approveEligibility,
  approveResident,
  confirmArrival,
  confirmInitialPayment,
  confirmPaperSigning,
  createContractFromDeposit,
  createInitialPayment,
  getContract,
  listContracts,
  recordInitialPayment,
  recordPaperContract,
  rejectResident,
  stopCheckIn,
  submitEligibilityReview,
  submitHandover,
  updateResidents,
  type Contract,
  type ContractStatus,
} from '../features/checkin/checkin-api';
import { listDeposits } from '../features/deposits/deposits-api';
import { ApiError } from '../lib/api-client';
import { HandoverDrawer } from './HandoverDrawer';

const statusMeta: Record<ContractStatus, { label: string; color: string }> = {
  CHECKIN_DRAFT: { label: 'Nháp nhận phòng', color: 'default' },
  ARRIVED: { label: 'Khách đã đến', color: 'blue' },
  WAITING_ELIGIBILITY: { label: 'Chờ duyệt cư trú', color: 'gold' },
  ELIGIBILITY_APPROVED: { label: 'Đã duyệt cư trú', color: 'cyan' },
  CHECKIN_STOPPED: { label: 'Dừng nhận phòng', color: 'red' },
  PAPER_SIGNED: { label: 'Đã ký hợp đồng', color: 'geekblue' },
  WAITING_INITIAL_PAYMENT: { label: 'Chờ thanh toán đầu', color: 'orange' },
  READY_FOR_HANDOVER: { label: 'Sẵn sàng bàn giao', color: 'purple' },
  ACTIVE: { label: 'Đang hiệu lực', color: 'green' },
  LIQUIDATED: { label: 'Đã thanh lý', color: 'default' },
};

const stepOrder: ContractStatus[] = [
  'CHECKIN_DRAFT',
  'ARRIVED',
  'WAITING_ELIGIBILITY',
  'ELIGIBILITY_APPROVED',
  'PAPER_SIGNED',
  'WAITING_INITIAL_PAYMENT',
  'READY_FOR_HANDOVER',
  'ACTIVE',
];
const stepLabels = [
  'Khách đến',
  'Cư trú',
  'Duyệt',
  'Đã duyệt',
  'Ký HĐ',
  'Thanh toán',
  'Bàn giao',
  'Hiệu lực',
];

function displayError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Thao tác không thành công.';
}
function customerName(contract: Contract) {
  return (
    contract.customer.fullName ?? contract.customer.organizationName ?? '—'
  );
}

export function CheckInPage() {
  const { employee, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {},
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const isSale = employee?.role === 'SALE';

  const query = useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => listContracts(filters),
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });

  return (
    <Card
      title="Nhận phòng và hợp đồng"
      extra={
        isSale ? (
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            Tạo hồ sơ nhận phòng
          </Button>
        ) : null
      }
    >
      <Form
        layout="inline"
        className="filter-form"
        onFinish={(values) => setFilters(values)}
      >
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
          Không thể tải danh sách hồ sơ nhận phòng.
        </Typography.Text>
      )}
      <Table<Contract>
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data ?? []}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Mã hợp đồng', dataIndex: 'id', width: 200 },
          { title: 'Khách hàng', render: (_, row) => customerName(row) },
          {
            title: 'Phòng / giường',
            render: (_, row) =>
              row.depositedBeds
                .map((bed) => `${bed.roomName}·${bed.bedName}`)
                .join(', '),
          },
          {
            title: 'Trạng thái',
            render: (_, row) => (
              <Tag color={statusMeta[row.status].color}>
                {statusMeta[row.status].label}
              </Tag>
            ),
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
      <CreateContractModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['contracts'] });
          setSelectedId(id);
        }}
      />
      <ContractDrawer
        contractId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </Card>
  );
}

function CreateContractModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [depositId, setDepositId] = useState<string | undefined>();
  const depositsQuery = useQuery({
    queryKey: ['deposits', { status: 'DEPOSITED' }],
    queryFn: () => listDeposits({ status: 'DEPOSITED' }),
    enabled: open,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => createContractFromDeposit(depositId!),
    onSuccess: (contract) => {
      message.success('Đã tạo hồ sơ nhận phòng.');
      setDepositId(undefined);
      onCreated(contract.id);
    },
    onError: (error) => message.error(displayError(error)),
  });
  return (
    <Modal
      title="Tạo hồ sơ nhận phòng từ phiếu cọc"
      open={open}
      onCancel={onClose}
      okButtonProps={{ disabled: !depositId }}
      confirmLoading={mutation.isPending}
      onOk={() => mutation.mutate()}
    >
      <Select
        showSearch
        style={{ width: '100%' }}
        placeholder="Chọn phiếu cọc đã đặt cọc"
        loading={depositsQuery.isLoading}
        optionFilterProp="label"
        value={depositId}
        onChange={setDepositId}
        options={(depositsQuery.data ?? []).map((deposit) => ({
          value: deposit.id,
          label: `${deposit.id} · ${
            deposit.customer.fullName ?? deposit.customer.organizationName ?? ''
          }`,
        }))}
      />
    </Modal>
  );
}

function ContractDrawer({
  contractId,
  onClose,
}: {
  contractId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<string | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const query = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => getContract(contractId!),
    enabled: Boolean(contractId),
    retry: false,
  });
  const contract = query.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
    void queryClient.invalidateQueries({ queryKey: ['contracts'] });
  };
  const runner = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      message.success('Đã cập nhật hồ sơ.');
      invalidate();
    },
    onError: (error) => message.error(displayError(error)),
  });
  const run = (fn: () => Promise<unknown>) => runner.mutate(fn);

  const has = (action: string) => contract?.availableActions.includes(action);

  return (
    <Drawer
      title={contract ? `Hồ sơ ${contract.id}` : 'Chi tiết hồ sơ'}
      width={860}
      open={Boolean(contractId)}
      onClose={onClose}
      destroyOnClose
    >
      {contract && (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Steps
            size="small"
            current={Math.max(0, stepOrder.indexOf(contract.status))}
            items={stepLabels.map((label) => ({ title: label }))}
          />
          <Space wrap>
            {has('confirm-arrival') && (
              <Button
                type="primary"
                onClick={() => run(() => confirmArrival(contract.id))}
              >
                Xác nhận khách đến
              </Button>
            )}
            {has('update-residents') && (
              <Button onClick={() => setModal('residents')}>
                Cập nhật cư trú
              </Button>
            )}
            {has('submit-eligibility-review') && (
              <Button
                onClick={() => run(() => submitEligibilityReview(contract.id))}
              >
                Gửi Manager duyệt
              </Button>
            )}
            {has('approve-eligibility') && (
              <Button
                type="primary"
                onClick={() => run(() => approveEligibility(contract.id))}
              >
                Duyệt điều kiện
              </Button>
            )}
            {has('stop-check-in') && (
              <Button
                danger
                onClick={() => run(() => stopCheckIn(contract.id))}
              >
                Dừng nhận phòng
              </Button>
            )}
            {has('record-paper-contract') && (
              <Button onClick={() => setModal('paper')}>
                Ghi nhận hợp đồng giấy
              </Button>
            )}
            {has('confirm-paper-signing') && (
              <Button
                type="primary"
                onClick={() => run(() => confirmPaperSigning(contract.id))}
              >
                Xác nhận đã ký
              </Button>
            )}
            {has('create-initial-payment') && (
              <Button onClick={() => setModal('initial-payment')}>
                Tạo thanh toán ban đầu
              </Button>
            )}
            {has('record-initial-payment') && (
              <Button onClick={() => setModal('record-payment')}>
                Ghi nhận thanh toán
              </Button>
            )}
            {has('confirm-initial-payment') && (
              <Button
                onClick={() => run(() => confirmInitialPayment(contract.id))}
              >
                Xác nhận đã thu đủ
              </Button>
            )}
            {has('submit-handover') && (
              <Button
                type="primary"
                onClick={() => run(() => submitHandover(contract.id))}
              >
                Chuyển bàn giao
              </Button>
            )}
            {contract.status === 'READY_FOR_HANDOVER' && (
              <Button type="primary" onClick={() => setHandoverOpen(true)}>
                Bàn giao phòng
              </Button>
            )}
            {contract.handover && contract.status !== 'READY_FOR_HANDOVER' && (
              <Button onClick={() => setHandoverOpen(true)}>
                Xem bàn giao
              </Button>
            )}
          </Space>

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Khách hàng">
              {customerName(contract)}
            </Descriptions.Item>
            <Descriptions.Item label="Phiếu cọc">
              {contract.depositId}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusMeta[contract.status].color}>
                {statusMeta[contract.status].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Số HĐ giấy">
              {contract.paperContractNumber ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Bắt đầu">
              {String(contract.startsOn).slice(0, 10)}
            </Descriptions.Item>
            <Descriptions.Item label="Kết thúc">
              {String(contract.endsOn).slice(0, 10)}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng giá thuê tháng">
              {contract.totalMonthlyRent}
            </Descriptions.Item>
            <Descriptions.Item label="Đã ký giấy">
              {contract.paperContractSigned ? 'Rồi' : 'Chưa'}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5}>Thành viên cư trú</Typography.Title>
            <Table
              rowKey="customerId"
              size="small"
              pagination={false}
              dataSource={contract.members}
              columns={[
                { title: 'Họ tên', dataIndex: 'fullName' },
                { title: 'Giấy tờ', dataIndex: 'identityDocumentNumber' },
                { title: 'Giường', dataIndex: 'plannedBedName' },
                {
                  title: 'Đối chiếu',
                  render: (_, row) => (row.identityChecked ? 'Đã' : 'Chưa'),
                },
                {
                  title: 'Điều kiện',
                  render: (_, row) => {
                    const meta = {
                      ELIGIBLE: { color: 'green', label: 'Đủ ĐK' },
                      INELIGIBLE: { color: 'red', label: 'Không đủ' },
                      NOT_REVIEWED: { color: 'default', label: 'Chưa duyệt' },
                    } as const;
                    const key: keyof typeof meta =
                      row.eligibilityResult === 'ELIGIBLE' ||
                      row.eligibilityResult === 'INELIGIBLE'
                        ? row.eligibilityResult
                        : 'NOT_REVIEWED';
                    const info = meta[key];
                    return <Tag color={info.color}>{info.label}</Tag>;
                  },
                },
                {
                  title: '',
                  render: (_, row) =>
                    has('approve-resident') && row.plannedBedId ? (
                      <Space>
                        <Button
                          size="small"
                          onClick={() =>
                            run(() =>
                              approveResident(contract.id, row.customerId),
                            )
                          }
                        >
                          Đủ ĐK
                        </Button>
                        <Button
                          size="small"
                          danger
                          onClick={() => {
                            const reason =
                              window.prompt('Lý do từ chối:') ?? '';
                            if (reason.trim())
                              run(() =>
                                rejectResident(
                                  contract.id,
                                  row.customerId,
                                  reason,
                                ),
                              );
                          }}
                        >
                          Từ chối
                        </Button>
                      </Space>
                    ) : null,
                },
              ]}
            />
          </div>

          {contract.contractBeds.length > 0 && (
            <div>
              <Typography.Title level={5}>
                Giường trong hợp đồng
              </Typography.Title>
              <Table
                rowKey="bedId"
                size="small"
                pagination={false}
                dataSource={contract.contractBeds}
                columns={[
                  { title: 'Giường', dataIndex: 'bedName' },
                  {
                    title: 'Người ở',
                    render: (_, row) => row.residentName ?? '— (trống)',
                  },
                  { title: 'Giá thuê', dataIndex: 'monthlyRent' },
                ]}
              />
            </div>
          )}

          {contract.initialPayment && (
            <Descriptions
              title="Thanh toán ban đầu"
              bordered
              size="small"
              column={2}
            >
              <Descriptions.Item label="Phải thu">
                {contract.initialPayment.amountDue}
              </Descriptions.Item>
              <Descriptions.Item label="Đã thu">
                {contract.initialPayment.amountPaid ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={2}>
                {contract.initialPayment.status}
              </Descriptions.Item>
            </Descriptions>
          )}

          <ResidentsModal
            open={modal === 'residents'}
            contract={contract}
            onClose={() => setModal(null)}
            onSubmit={(residents) => {
              run(() => updateResidents(contract.id, residents));
              setModal(null);
            }}
          />
          <PaperContractModal
            open={modal === 'paper'}
            contract={contract}
            onClose={() => setModal(null)}
            onSubmit={(body) => {
              run(() => recordPaperContract(contract.id, body));
              setModal(null);
            }}
          />
          <InitialPaymentModal
            open={modal === 'initial-payment'}
            onClose={() => setModal(null)}
            onSubmit={(items) => {
              run(() => createInitialPayment(contract.id, items));
              setModal(null);
            }}
          />
          <RecordPaymentModal
            open={modal === 'record-payment'}
            amountDue={contract.initialPayment?.amountDue ?? '0.00'}
            onClose={() => setModal(null)}
            onSubmit={(body) => {
              run(() => recordInitialPayment(contract.id, body));
              setModal(null);
            }}
          />
          <HandoverDrawer
            open={handoverOpen}
            contract={contract}
            onClose={() => setHandoverOpen(false)}
            onChanged={invalidate}
          />
        </Space>
      )}
    </Drawer>
  );
}

function ResidentsModal({
  open,
  contract,
  onClose,
  onSubmit,
}: {
  open: boolean;
  contract: Contract;
  onClose: () => void;
  onSubmit: (
    residents: {
      customerId: string;
      bedId: string;
      identityChecked: boolean;
    }[],
  ) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Cập nhật người cư trú"
      open={open}
      width={640}
      onCancel={onClose}
      onOk={() => form.submit()}
      afterOpenChange={(next) => {
        if (next)
          form.setFieldsValue({
            residents: contract.members.map((member) => ({
              customerId: member.customerId,
              bedId: member.plannedBedId ?? undefined,
              identityChecked: member.identityChecked,
            })),
          });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          onSubmit(
            (values.residents ?? [])
              .filter((row: { bedId?: string }) => row.bedId)
              .map(
                (row: {
                  customerId: string;
                  bedId: string;
                  identityChecked?: boolean;
                }) => ({
                  customerId: row.customerId,
                  bedId: row.bedId,
                  identityChecked: Boolean(row.identityChecked),
                }),
              ),
          )
        }
      >
        <Form.List name="residents">
          {(fields) => (
            <Space orientation="vertical" style={{ width: '100%' }}>
              {fields.map((field, index) => (
                <Space key={field.key} align="baseline" wrap>
                  <Typography.Text
                    style={{ width: 140, display: 'inline-block' }}
                  >
                    {contract.members[index]?.fullName}
                  </Typography.Text>
                  <Form.Item name={[field.name, 'customerId']} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name={[field.name, 'bedId']}>
                    <Select
                      allowClear
                      style={{ width: 200 }}
                      placeholder="Chọn giường"
                      options={contract.depositedBeds.map((bed) => ({
                        value: bed.bedId,
                        label: `${bed.roomName}·${bed.bedName}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'identityChecked']}
                    valuePropName="checked"
                  >
                    <Checkbox>Đã đối chiếu giấy tờ</Checkbox>
                  </Form.Item>
                </Space>
              ))}
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

function PaperContractModal({
  open,
  contract,
  onClose,
  onSubmit,
}: {
  open: boolean;
  contract: Contract;
  onClose: () => void;
  onSubmit: (body: {
    paperContractNumber: string;
    signedDate: string;
    startDate: string;
    endDate: string;
    paymentCycle?: string;
    specialTerms?: string;
  }) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Ghi nhận hợp đồng giấy"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          paymentCycle: 'MONTHLY',
          startDate: String(contract.startsOn).slice(0, 10),
          endDate: String(contract.endsOn).slice(0, 10),
        }}
        onFinish={onSubmit}
      >
        <Form.Item
          name="paperContractNumber"
          label="Số hợp đồng giấy"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="signedDate"
          label="Ngày ký"
          rules={[{ required: true }]}
        >
          <Input type="date" />
        </Form.Item>
        <Space>
          <Form.Item
            name="startDate"
            label="Ngày bắt đầu"
            rules={[{ required: true }]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="endDate"
            label="Ngày kết thúc"
            rules={[{ required: true }]}
          >
            <Input type="date" />
          </Form.Item>
        </Space>
        <Form.Item name="paymentCycle" label="Kỳ thanh toán">
          <Input />
        </Form.Item>
        <Form.Item name="specialTerms" label="Điều khoản đặc biệt">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function InitialPaymentModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    items: {
      type: string;
      description?: string;
      quantity: number;
      unitPrice: string;
    }[],
  ) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Tạo yêu cầu thanh toán ban đầu"
      open={open}
      width={640}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ items: [{ type: 'FIRST_RENT', quantity: 1 }] }}
        onFinish={(values) => onSubmit(values.items)}
      >
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <Space orientation="vertical" style={{ width: '100%' }}>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" wrap>
                  <Form.Item
                    name={[field.name, 'type']}
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="Loại khoản" style={{ width: 140 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'description']}>
                    <Input placeholder="Mô tả" />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'quantity']}
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={1} placeholder="SL" />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'unitPrice']}
                    rules={[
                      { required: true },
                      {
                        pattern: /^\d+(\.\d{1,2})?$/,
                        message: 'Sai định dạng',
                      },
                    ]}
                  >
                    <Input placeholder="Đơn giá" />
                  </Form.Item>
                  <Button type="link" danger onClick={() => remove(field.name)}>
                    Xóa
                  </Button>
                </Space>
              ))}
              <Button onClick={() => add({ quantity: 1 })}>Thêm khoản</Button>
            </Space>
          )}
        </Form.List>
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
  onSubmit: (body: {
    amount: string;
    method: 'CASH' | 'BANK_TRANSFER';
    paidAt: string;
    transactionReference?: string;
    externalEvidenceChecked: boolean;
    note?: string;
  }) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Ghi nhận thanh toán ban đầu"
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
            externalEvidenceChecked: Boolean(v.externalEvidenceChecked),
            note: v.note,
          })
        }
      >
        <Form.Item
          name="amount"
          label="Số tiền thực tế"
          rules={[{ required: true }]}
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
        <Form.Item name="paidAt" label="Thời điểm" rules={[{ required: true }]}>
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="transactionReference" label="Mã giao dịch">
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
          <Checkbox>Đã kiểm tra chứng từ.</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
