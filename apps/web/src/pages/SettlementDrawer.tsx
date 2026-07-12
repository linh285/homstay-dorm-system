import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';

import {
  calculateSettlement,
  completeCheckout,
  confirmLiquidation,
  confirmNoBalance,
  customerAgreed,
  finalizeSettlement,
  getSettlement,
  putDeductions,
  recordAdditionalPayment,
  recordRefund,
  returnToAccountant,
  settlementDisputed,
  type Settlement,
} from '../features/settlements/settlements-api';
import { ApiError } from '../lib/api-client';

function displayError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Thao tác không thành công.';
}

export function SettlementDrawer({
  settlementId,
  open,
  onClose,
  onChanged,
}: {
  settlementId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['settlement', settlementId],
    queryFn: () => getSettlement(settlementId!),
    enabled: open && Boolean(settlementId),
    retry: false,
  });
  const settlement = query.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ['settlement', settlementId],
    });
    onChanged();
  };
  const runner = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      message.success('Đã cập nhật đối soát.');
      invalidate();
    },
    onError: (error) => message.error(displayError(error)),
  });
  const run = (fn: () => Promise<unknown>) => runner.mutate(fn);
  const has = (action: string) => settlement?.availableActions.includes(action);

  return (
    <Drawer
      title="Đối soát và hoàn cọc"
      width={760}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {settlement && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            {has('update-deductions') && (
              <Button onClick={() => setModal('deductions')}>
                Nhập khấu trừ
              </Button>
            )}
            {has('calculate') && (
              <Button
                onClick={() => run(() => calculateSettlement(settlement.id))}
              >
                Tính lại
              </Button>
            )}
            {has('finalize') && (
              <Button
                type="primary"
                onClick={() => run(() => finalizeSettlement(settlement.id))}
              >
                Chốt đối soát
              </Button>
            )}
            {has('customer-agreed') && (
              <Button
                type="primary"
                onClick={() => run(() => customerAgreed(settlement.id))}
              >
                Khách đồng ý
              </Button>
            )}
            {has('disputed') && (
              <Button danger onClick={() => setModal('disputed')}>
                Khách khiếu nại
              </Button>
            )}
            {has('return-to-accountant') && (
              <Button
                onClick={() => run(() => returnToAccountant(settlement.id))}
              >
                Trả lại kế toán
              </Button>
            )}
            {has('record-refund') && (
              <Button type="primary" onClick={() => setModal('refund')}>
                Hoàn tiền
              </Button>
            )}
            {has('record-additional-payment') && (
              <Button type="primary" onClick={() => setModal('additional')}>
                Thu thêm
              </Button>
            )}
            {has('confirm-no-balance') && (
              <Button
                onClick={() => run(() => confirmNoBalance(settlement.id))}
              >
                Xác nhận không chênh lệch
              </Button>
            )}
            {has('confirm-liquidation') && (
              <Button onClick={() => setModal('liquidation')}>
                Xác nhận thanh lý
              </Button>
            )}
            {has('complete-checkout') && (
              <Button
                type="primary"
                onClick={() => run(() => completeCheckout(settlement.id))}
              >
                Hoàn tất trả phòng
              </Button>
            )}
          </Space>

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Trạng thái" span={2}>
              <Tag>{settlement.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tiền cọc gốc">
              {settlement.originalDepositAmount}
            </Descriptions.Item>
            <Descriptions.Item label="Tỷ lệ hoàn">
              {settlement.refundRate}%
            </Descriptions.Item>
            <Descriptions.Item label="Hoàn cơ bản">
              {settlement.baseRefundAmount}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng khấu trừ">
              {settlement.totalDeductions}
            </Descriptions.Item>
            <Descriptions.Item label="Số dư cuối">
              <strong>{settlement.finalBalance}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Kết quả">
              {settlement.result}
            </Descriptions.Item>
            {settlement.disputeContent && (
              <Descriptions.Item label="Khiếu nại" span={2}>
                {settlement.disputeContent}
              </Descriptions.Item>
            )}
          </Descriptions>

          <div>
            <Typography.Title level={5}>Khoản khấu trừ</Typography.Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={settlement.deductions}
              columns={[
                { title: 'Loại', dataIndex: 'feeType' },
                { title: 'Mô tả', dataIndex: 'description' },
                { title: 'Số tiền', dataIndex: 'amount' },
                { title: 'Nguồn', dataIndex: 'source' },
              ]}
            />
          </div>

          {settlement.payments.length > 0 && (
            <div>
              <Typography.Title level={5}>Giao dịch</Typography.Title>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={settlement.payments}
                columns={[
                  { title: 'Loại', dataIndex: 'paymentType' },
                  { title: 'Chiều', dataIndex: 'direction' },
                  { title: 'Số tiền', dataIndex: 'amountPaid' },
                  { title: 'Trạng thái', dataIndex: 'status' },
                ]}
              />
            </div>
          )}

          <DeductionsModal
            open={modal === 'deductions'}
            settlement={settlement}
            onClose={() => setModal(null)}
            onSubmit={(deductions) => {
              run(() => putDeductions(settlement.id, deductions));
              setModal(null);
            }}
          />
          <DisputeModal
            open={modal === 'disputed'}
            onClose={() => setModal(null)}
            onSubmit={(content) => {
              run(() => settlementDisputed(settlement.id, content));
              setModal(null);
            }}
          />
          <MoneyModal
            open={modal === 'refund'}
            title="Hoàn tiền cho khách"
            defaultAmount={settlement.finalBalance}
            requireEvidence={false}
            onClose={() => setModal(null)}
            onSubmit={(body) => {
              run(() => recordRefund(settlement.id, body));
              setModal(null);
            }}
          />
          <MoneyModal
            open={modal === 'additional'}
            title="Thu thêm từ khách"
            defaultAmount={settlement.finalBalance.replace('-', '')}
            requireEvidence
            onClose={() => setModal(null)}
            onSubmit={(body) => {
              run(() => recordAdditionalPayment(settlement.id, body));
              setModal(null);
            }}
          />
          <LiquidationModal
            open={modal === 'liquidation'}
            onClose={() => setModal(null)}
            onSubmit={(body) => {
              run(() => confirmLiquidation(settlement.id, body));
              setModal(null);
            }}
          />
        </Space>
      )}
    </Drawer>
  );
}

function DeductionsModal({
  open,
  settlement,
  onClose,
  onSubmit,
}: {
  open: boolean;
  settlement: Settlement;
  onClose: () => void;
  onSubmit: (
    deductions: {
      type: string;
      description?: string;
      amount: string;
      source?: string;
    }[],
  ) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Nhập khoản khấu trừ"
      open={open}
      width={680}
      onCancel={onClose}
      onOk={() => form.submit()}
      afterOpenChange={(next) => {
        if (next)
          form.setFieldsValue({
            deductions: settlement.deductions.map((d) => ({
              type: d.feeType,
              description: d.description,
              amount: d.amount,
              source: d.source,
            })),
          });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => onSubmit(v.deductions ?? [])}
      >
        <Form.List name="deductions">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }}>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" wrap>
                  <Form.Item
                    name={[field.name, 'type']}
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="Loại phí" style={{ width: 130 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'description']}>
                    <Input placeholder="Mô tả" />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'amount']}
                    rules={[
                      { required: true },
                      {
                        pattern: /^\d+(\.\d{1,2})?$/,
                        message: 'Sai định dạng',
                      },
                    ]}
                  >
                    <Input placeholder="Số tiền" style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'source']}>
                    <Select
                      allowClear
                      placeholder="Nguồn"
                      style={{ width: 130 }}
                      options={[
                        'DEBT',
                        'INSPECTION',
                        'VIOLATION',
                        'MANUAL',
                      ].map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                  </Form.Item>
                  <Button type="link" danger onClick={() => remove(field.name)}>
                    Xóa
                  </Button>
                </Space>
              ))}
              <Button onClick={() => add({})}>Thêm khoản khấu trừ</Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

function DisputeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Ghi nhận khiếu nại"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={(v) => onSubmit(v.content)}>
        <Form.Item
          name="content"
          label="Nội dung khiếu nại"
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function MoneyModal({
  open,
  title,
  defaultAmount,
  requireEvidence,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  defaultAmount: string;
  requireEvidence: boolean;
  onClose: () => void;
  onSubmit: (body: {
    amount: string;
    method: 'CASH' | 'BANK_TRANSFER';
    paidAt: string;
    transactionReference?: string;
    externalEvidenceChecked: boolean;
  }) => void;
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
      <Form
        form={form}
        layout="vertical"
        initialValues={{ amount: defaultAmount, method: 'BANK_TRANSFER' }}
        onFinish={(v) =>
          onSubmit({
            amount: v.amount,
            method: v.method,
            paidAt: new Date(v.paidAt).toISOString(),
            transactionReference: v.transactionReference,
            externalEvidenceChecked: requireEvidence
              ? Boolean(v.externalEvidenceChecked)
              : true,
          })
        }
      >
        <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
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
        {requireEvidence && (
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
        )}
      </Form>
    </Modal>
  );
}

function LiquidationModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: {
    paperCheckoutSigned: boolean;
    contractLiquidated: boolean;
    keysRecovered: boolean;
    customerLeft: boolean;
  }) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Xác nhận thanh lý"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) =>
          onSubmit({
            paperCheckoutSigned: Boolean(v.paperCheckoutSigned),
            contractLiquidated: Boolean(v.contractLiquidated),
            keysRecovered: Boolean(v.keysRecovered),
            customerLeft: Boolean(v.customerLeft),
          })
        }
      >
        <Form.Item name="paperCheckoutSigned" valuePropName="checked">
          <Checkbox>Biên bản trả phòng giấy đã ký</Checkbox>
        </Form.Item>
        <Form.Item name="contractLiquidated" valuePropName="checked">
          <Checkbox>Hợp đồng đã thanh lý</Checkbox>
        </Form.Item>
        <Form.Item name="keysRecovered" valuePropName="checked">
          <Checkbox>Đã thu hồi khóa/thẻ</Checkbox>
        </Form.Item>
        <Form.Item name="customerLeft" valuePropName="checked">
          <Checkbox>Khách đã rời phòng</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
