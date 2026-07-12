import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
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

import { useAuth } from '../features/auth/AuthProvider';
import { createDepositFromViewing } from '../features/deposits/deposits-api';
import { listRentalRequests } from '../features/rental-requests/rental-request-api';
import { getRoomAvailability, listRooms } from '../features/rooms/rooms-api';
import {
  cancelViewing,
  confirmViewing,
  confirmVisited,
  createViewing,
  getViewing,
  listViewings,
  noShowViewing,
  recordResult,
  rescheduleViewing,
  type Viewing,
  type ViewingResult,
  type ViewingStatus,
} from '../features/viewings/viewings-api';
import { ApiError } from '../lib/api-client';

const statusMeta: Record<ViewingStatus, { label: string; color: string }> = {
  SCHEDULED: { label: 'Đã lên lịch', color: 'blue' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'cyan' },
  VISITED: { label: 'Đã xem', color: 'green' },
  RESULT_RECORDED: { label: 'Đã có kết quả', color: 'purple' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
  NO_SHOW: { label: 'Không đến', color: 'red' },
};

const resultOptions: { value: ViewingResult; label: string }[] = [
  { value: 'CUSTOMER_WANTS_DEPOSIT', label: 'Khách muốn đặt cọc' },
  { value: 'WANTS_MORE_VIEWINGS', label: 'Muốn xem thêm' },
  { value: 'WANTS_TO_CHANGE_CRITERIA', label: 'Muốn đổi tiêu chí' },
  { value: 'UNDECIDED', label: 'Chưa quyết định' },
  { value: 'NOT_INTERESTED', label: 'Không quan tâm' },
];

function displayError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Thao tác không thành công.';
}

function toIso(local: string | undefined) {
  return local ? new Date(local).toISOString() : undefined;
}

function customerName(viewing: Viewing) {
  return (
    viewing.rentalRequest.representative.fullName ??
    viewing.rentalRequest.representative.organizationName ??
    '—'
  );
}

export function ViewingsPage() {
  const { employee, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {},
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const viewingsQuery = useQuery({
    queryKey: ['viewings', filters],
    queryFn: () => listViewings(filters),
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });

  return (
    <Card
      title="Lịch xem phòng"
      extra={
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Tạo lịch xem
        </Button>
      }
    >
      <Form
        layout="inline"
        className="filter-form"
        onFinish={(values) => setFilters(values)}
      >
        <Form.Item name="rentalRequestId">
          <Input placeholder="Mã yêu cầu" allowClear />
        </Form.Item>
        <Form.Item name="status">
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 170 }}
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
      {viewingsQuery.isError && (
        <Typography.Text type="danger">
          Không thể tải danh sách lịch xem.
        </Typography.Text>
      )}
      <Table<Viewing>
        rowKey="id"
        loading={viewingsQuery.isLoading}
        dataSource={viewingsQuery.data ?? []}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Mã lịch', dataIndex: 'id', width: 200 },
          { title: 'Khách hàng', render: (_, row) => customerName(row) },
          {
            title: 'Thời gian',
            render: (_, row) => new Date(row.startsAt).toLocaleString('vi-VN'),
          },
          {
            title: 'Phòng',
            render: (_, row) =>
              row.details.map((detail) => detail.room.name).join(', '),
          },
          {
            title: 'Trạng thái',
            render: (_, row) => (
              <Tag color={statusMeta[row.status].color}>
                {statusMeta[row.status].label}
              </Tag>
            ),
          },
          { title: 'Sale', render: (_, row) => row.saleEmployee.fullName },
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

      <CreateViewingModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['viewings'] });
        }}
      />

      <ViewingDetailDrawer
        viewingId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </Card>
  );
}

function CreateViewingModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const requestsQuery = useQuery({
    queryKey: ['rental-requests', { forViewing: true }],
    queryFn: () => listRentalRequests({}),
    enabled: open,
    retry: false,
  });
  const roomsQuery = useQuery({
    queryKey: ['rooms', { forViewing: true }],
    queryFn: () => listRooms({}),
    enabled: open,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (values: {
      rentalRequestId: string;
      startsAt: string;
      endsAt?: string;
      roomIds: string[];
      notificationChannel?: string;
      note?: string;
    }) =>
      createViewing({
        ...values,
        startsAt: toIso(values.startsAt)!,
        endsAt: toIso(values.endsAt),
      }),
    onSuccess: () => {
      message.success('Đã tạo lịch xem.');
      form.resetFields();
      onSaved();
    },
    onError: (error) => message.error(displayError(error)),
  });
  const rentalRequests = requestsQuery.data?.data ?? [];

  return (
    <Modal
      title="Tạo lịch xem"
      open={open}
      width={640}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
        <Form.Item
          name="rentalRequestId"
          label="Yêu cầu thuê"
          rules={[{ required: true, message: 'Chọn yêu cầu thuê.' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={requestsQuery.isLoading}
            placeholder="Chọn yêu cầu thuê"
            options={rentalRequests
              .filter((request) =>
                ['ACTIVE', 'VIEWING'].includes(request.status),
              )
              .map((request) => ({
                value: request.id,
                label: `${request.id} · ${
                  request.representative.fullName ??
                  request.representative.organizationName ??
                  ''
                }`,
              }))}
          />
        </Form.Item>
        <Space>
          <Form.Item
            name="startsAt"
            label="Bắt đầu"
            rules={[{ required: true, message: 'Chọn thời gian bắt đầu.' }]}
          >
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="endsAt" label="Kết thúc">
            <Input type="datetime-local" />
          </Form.Item>
        </Space>
        <Form.Item
          name="roomIds"
          label="Phòng sẽ xem"
          rules={[{ required: true, message: 'Chọn ít nhất một phòng.' }]}
        >
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            loading={roomsQuery.isLoading}
            placeholder="Chọn phòng"
            options={(roomsQuery.data ?? []).map((room) => ({
              value: room.id,
              label: `${room.name} (${room.availableBeds}/${room.totalBeds} trống)`,
            }))}
          />
        </Form.Item>
        <Form.Item name="notificationChannel" label="Kênh thông báo (mô phỏng)">
          <Select
            allowClear
            options={[
              { value: 'PHONE', label: 'Điện thoại' },
              { value: 'ZALO', label: 'Zalo' },
              { value: 'EMAIL', label: 'Email' },
            ]}
          />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ViewingDetailDrawer({
  viewingId,
  onClose,
}: {
  viewingId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const query = useQuery({
    queryKey: ['viewing', viewingId],
    queryFn: () => getViewing(viewingId!),
    enabled: Boolean(viewingId),
    retry: false,
  });
  const viewing = query.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['viewing', viewingId] });
    void queryClient.invalidateQueries({ queryKey: ['viewings'] });
  };

  const actionMutation = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      message.success('Đã cập nhật lịch xem.');
      invalidate();
    },
    onError: (error) => message.error(displayError(error)),
  });

  return (
    <Drawer
      title="Chi tiết lịch xem"
      width={640}
      open={Boolean(viewingId)}
      onClose={onClose}
      destroyOnClose
    >
      {viewing && (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            {viewing.status === 'SCHEDULED' && (
              <Button
                onClick={() =>
                  actionMutation.mutate(() => confirmViewing(viewing.id))
                }
              >
                Xác nhận lịch
              </Button>
            )}
            {['SCHEDULED', 'CONFIRMED'].includes(viewing.status) && (
              <>
                <Button onClick={() => setRescheduleOpen(true)}>
                  Đổi lịch
                </Button>
                <Button
                  danger
                  onClick={() =>
                    actionMutation.mutate(() => cancelViewing(viewing.id))
                  }
                >
                  Hủy lịch
                </Button>
              </>
            )}
            {viewing.status === 'CONFIRMED' && (
              <>
                <Button
                  onClick={() =>
                    actionMutation.mutate(() => confirmVisited(viewing.id))
                  }
                >
                  Khách đã xem
                </Button>
                <Button
                  onClick={() =>
                    actionMutation.mutate(() => noShowViewing(viewing.id))
                  }
                >
                  Khách không đến
                </Button>
              </>
            )}
            {viewing.status === 'VISITED' && (
              <Button type="primary" onClick={() => setResultOpen(true)}>
                Ghi nhận kết quả
              </Button>
            )}
            {viewing.status === 'RESULT_RECORDED' &&
              viewing.finalResult === 'CUSTOMER_WANTS_DEPOSIT' && (
                <Button type="primary" onClick={() => setDepositOpen(true)}>
                  Tạo phiếu cọc
                </Button>
              )}
          </Space>

          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Mã lịch">{viewing.id}</Descriptions.Item>
            <Descriptions.Item label="Khách hàng">
              {customerName(viewing)}
            </Descriptions.Item>
            <Descriptions.Item label="Yêu cầu thuê">
              {viewing.rentalRequestId}
            </Descriptions.Item>
            <Descriptions.Item label="Bắt đầu">
              {new Date(viewing.startsAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Kết thúc">
              {viewing.endsAt
                ? new Date(viewing.endsAt).toLocaleString('vi-VN')
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusMeta[viewing.status].color}>
                {statusMeta[viewing.status].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Kết quả">
              {viewing.finalResult
                ? resultOptions.find((r) => r.value === viewing.finalResult)
                    ?.label
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú">
              {viewing.note ?? '—'}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5}>Phòng trong lịch</Typography.Title>
            <Table
              rowKey="roomId"
              size="small"
              pagination={false}
              dataSource={viewing.details}
              columns={[
                { title: 'Phòng', render: (_, row) => row.room.name },
                {
                  title: 'Khách quan tâm',
                  render: (_, row) => (row.customerInterested ? 'Có' : '—'),
                },
              ]}
            />
          </div>

          <RescheduleModal
            open={rescheduleOpen}
            onClose={() => setRescheduleOpen(false)}
            onSubmit={(values) => {
              actionMutation.mutate(() =>
                rescheduleViewing(viewing.id, {
                  startsAt: toIso(values.startsAt)!,
                  endsAt: toIso(values.endsAt),
                  reason: values.reason,
                }),
              );
              setRescheduleOpen(false);
            }}
          />
          <ResultModal
            open={resultOpen}
            rooms={viewing.details.map((detail) => detail.room)}
            onClose={() => setResultOpen(false)}
            onSubmit={(values) => {
              actionMutation.mutate(() => recordResult(viewing.id, values));
              setResultOpen(false);
            }}
          />
          <CreateDepositModal
            open={depositOpen}
            viewingId={viewing.id}
            roomId={
              viewing.details.find((detail) => detail.customerInterested)
                ?.roomId ?? viewing.details[0]?.roomId
            }
            onClose={() => setDepositOpen(false)}
            onCreated={() => {
              setDepositOpen(false);
              invalidate();
              message.success('Đã tạo phiếu cọc. Mở mục Đặt cọc để tiếp tục.');
            }}
          />
        </Space>
      )}
    </Drawer>
  );
}

function CreateDepositModal({
  open,
  viewingId,
  roomId,
  onClose,
  onCreated,
}: {
  open: boolean;
  viewingId: string;
  roomId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const availabilityQuery = useQuery({
    queryKey: ['room-availability', roomId],
    queryFn: () => getRoomAvailability(roomId!),
    enabled: open && Boolean(roomId),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => createDepositFromViewing(viewingId, selected),
    onSuccess: () => {
      setSelected([]);
      onCreated();
    },
    onError: (error) => message.error(displayError(error)),
  });
  const availableBeds = (availabilityQuery.data?.beds ?? []).filter(
    (bed) => bed.businessStatus === 'AVAILABLE',
  );

  return (
    <Modal
      title="Tạo phiếu cọc"
      open={open}
      onCancel={onClose}
      okText="Tạo phiếu cọc"
      okButtonProps={{ disabled: selected.length === 0 }}
      confirmLoading={mutation.isPending}
      onOk={() => mutation.mutate()}
    >
      <Typography.Paragraph>
        Chọn các giường khách muốn đặt cọc (chỉ hiển thị giường còn trống).
      </Typography.Paragraph>
      <Select
        mode="multiple"
        style={{ width: '100%' }}
        placeholder="Chọn giường"
        loading={availabilityQuery.isLoading}
        value={selected}
        onChange={setSelected}
        options={availableBeds.map((bed) => ({
          value: bed.id,
          label: `${bed.name} · ${bed.monthlyRent}`,
        }))}
      />
    </Modal>
  );
}

function RescheduleModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: {
    startsAt: string;
    endsAt?: string;
    reason?: string;
  }) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="Đổi lịch"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="startsAt"
          label="Bắt đầu"
          rules={[{ required: true, message: 'Chọn thời gian bắt đầu.' }]}
        >
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="endsAt" label="Kết thúc">
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="reason" label="Lý do">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ResultModal({
  open,
  rooms,
  onClose,
  onSubmit,
}: {
  open: boolean;
  rooms: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (values: {
    result: ViewingResult;
    selectedRoomId?: string;
    followUpDate?: string;
    note?: string;
  }) => void;
}) {
  const [form] = Form.useForm();
  const result = Form.useWatch('result', form);
  return (
    <Modal
      title="Ghi nhận kết quả xem"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="result"
          label="Kết quả"
          rules={[{ required: true, message: 'Chọn kết quả.' }]}
        >
          <Select options={resultOptions} />
        </Form.Item>
        {result === 'CUSTOMER_WANTS_DEPOSIT' && (
          <Form.Item
            name="selectedRoomId"
            label="Phòng khách chọn"
            rules={[{ required: true, message: 'Chọn phòng khách quan tâm.' }]}
          >
            <Select
              options={rooms.map((room) => ({
                value: room.id,
                label: room.name,
              }))}
            />
          </Form.Item>
        )}
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
