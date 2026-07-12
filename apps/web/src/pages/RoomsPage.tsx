import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
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
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';

import { useAuth } from '../features/auth/AuthProvider';
import { ApiError } from '../lib/api-client';
import {
  addBed,
  createRoom,
  getRoom,
  listAssetTypes,
  listRooms,
  listServices,
  putRoomAssets,
  putRoomServices,
  updateBed,
  updateRoom,
  type Bed,
  type BedBusinessStatus,
  type OperationalStatus,
  type RoomDetail,
  type RoomInput,
  type RoomListItem,
} from '../features/rooms/rooms-api';

const operationalOptions: { value: OperationalStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
  { value: 'OUT_OF_SERVICE', label: 'Ngừng sử dụng' },
];

const operationalLabel: Record<OperationalStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  MAINTENANCE: 'Bảo trì',
  OUT_OF_SERVICE: 'Ngừng sử dụng',
};

const businessStatusMeta: Record<
  BedBusinessStatus,
  { label: string; color: string }
> = {
  AVAILABLE: { label: 'Còn trống', color: 'green' },
  HELD: { label: 'Đang giữ', color: 'gold' },
  DEPOSITED: { label: 'Đã đặt cọc', color: 'blue' },
  OCCUPIED: { label: 'Đang ở', color: 'volcano' },
  MAINTENANCE: { label: 'Bảo trì', color: 'default' },
  OUT_OF_SERVICE: { label: 'Ngừng sử dụng', color: 'default' },
};

function displayError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Thao tác không thành công.';
}

export function RoomsPage() {
  const { employee, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  const isManager = employee?.role === 'MANAGER';
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {},
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roomModalOpen, setRoomModalOpen] = useState(false);

  const roomsQuery = useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => listRooms(filters),
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });

  return (
    <Card
      title="Phòng và giường"
      extra={
        isManager ? (
          <Button type="primary" onClick={() => setRoomModalOpen(true)}>
            Thêm phòng
          </Button>
        ) : null
      }
    >
      <Form
        layout="inline"
        className="filter-form"
        onFinish={(values) => setFilters(values)}
      >
        <Form.Item name="area">
          <Input placeholder="Khu vực" allowClear />
        </Form.Item>
        <Form.Item name="roomType">
          <Input placeholder="Loại phòng" allowClear />
        </Form.Item>
        <Form.Item name="operationalStatus">
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 170 }}
            options={operationalOptions}
          />
        </Form.Item>
        <Form.Item name="hasAvailability">
          <Select
            placeholder="Còn chỗ"
            allowClear
            style={{ width: 130 }}
            options={[{ value: 'true', label: 'Còn chỗ' }]}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button htmlType="submit">Lọc</Button>
            <Button onClick={() => setFilters({})}>Xóa lọc</Button>
          </Space>
        </Form.Item>
      </Form>
      {roomsQuery.isError && (
        <Typography.Text type="danger">
          Không thể tải danh sách phòng.
        </Typography.Text>
      )}
      <Table<RoomListItem>
        rowKey="id"
        loading={roomsQuery.isLoading}
        dataSource={roomsQuery.data ?? []}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Mã phòng', dataIndex: 'id', width: 190 },
          { title: 'Tên phòng', dataIndex: 'name' },
          { title: 'Chi nhánh', render: (_, row) => row.branch.name },
          { title: 'Sức chứa', dataIndex: 'maximumCapacity' },
          {
            title: 'Giường trống',
            render: (_, row) => `${row.availableBeds}/${row.totalBeds}`,
          },
          {
            title: 'Giá thuê',
            render: (_, row) =>
              row.minRent
                ? row.minRent === row.maxRent
                  ? row.minRent
                  : `${row.minRent} - ${row.maxRent}`
                : '—',
          },
          { title: 'Giới tính', render: (_, row) => row.genderPolicy ?? '—' },
          {
            title: 'Trạng thái',
            render: (_, row) => (
              <Tag color={row.operationalStatus === 'ACTIVE' ? 'green' : 'default'}>
                {operationalLabel[row.operationalStatus]}
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

      <RoomFormModal
        open={roomModalOpen}
        branchId={employee?.branchId ?? ''}
        onClose={() => setRoomModalOpen(false)}
        onSaved={() => {
          setRoomModalOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['rooms'] });
        }}
      />

      <RoomDetailDrawer
        roomId={selectedId}
        canManage={isManager}
        onClose={() => setSelectedId(null)}
      />
    </Card>
  );
}

function RoomFormModal({
  open,
  branchId,
  room,
  onClose,
  onSaved,
}: {
  open: boolean;
  branchId: string;
  room?: RoomDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const mutation = useMutation({
    mutationFn: (values: RoomInput) =>
      room ? updateRoom(room.id, values) : createRoom(values),
    onSuccess: () => {
      message.success(room ? 'Đã cập nhật phòng.' : 'Đã tạo phòng.');
      form.resetFields();
      onSaved();
    },
    onError: (error) => message.error(displayError(error)),
  });

  return (
    <Modal
      title={room ? 'Sửa phòng' : 'Thêm phòng'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      destroyOnClose
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          room ?? {
            operationalStatus: 'ACTIVE',
            maximumCapacity: 1,
            hasAirConditioner: false,
            hasParking: false,
          }
        }
        onFinish={(values) =>
          mutation.mutate({ ...values, branchId } as RoomInput)
        }
      >
        <Form.Item
          name="name"
          label="Tên phòng"
          rules={[{ required: true, message: 'Nhập tên phòng.' }]}
        >
          <Input maxLength={50} />
        </Form.Item>
        <Space>
          <Form.Item name="area" label="Khu vực">
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="floor" label="Tầng">
            <InputNumber />
          </Form.Item>
          <Form.Item name="roomType" label="Loại phòng">
            <Input maxLength={50} />
          </Form.Item>
        </Space>
        <Space>
          <Form.Item
            name="maximumCapacity"
            label="Sức chứa tối đa"
            rules={[{ required: true, message: 'Nhập sức chứa.' }]}
          >
            <InputNumber min={1} max={100} />
          </Form.Item>
          <Form.Item name="genderPolicy" label="Giới tính áp dụng">
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item
            name="operationalStatus"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select style={{ width: 160 }} options={operationalOptions} />
          </Form.Item>
        </Space>
        <Space>
          <Form.Item
            name="hasAirConditioner"
            label="Điều hòa"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item name="hasParking" label="Gửi xe" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="quietLevel" label="Mức độ yên tĩnh">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="curfew" label="Giờ giấc">
            <Input maxLength={100} />
          </Form.Item>
        </Space>
        <Form.Item name="rules" label="Nội quy">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function RoomDetailDrawer({
  roomId,
  canManage,
  onClose,
}: {
  roomId: string | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [bedModal, setBedModal] = useState<{ open: boolean; bed?: Bed }>({
    open: false,
  });
  const [servicesOpen, setServicesOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);

  const roomQuery = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => getRoom(roomId!),
    enabled: Boolean(roomId),
    retry: false,
  });
  const room = roomQuery.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    void queryClient.invalidateQueries({ queryKey: ['rooms'] });
  };

  return (
    <Drawer
      title={room ? `Phòng ${room.name}` : 'Chi tiết phòng'}
      width={720}
      open={Boolean(roomId)}
      onClose={onClose}
      destroyOnClose
    >
      {room && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {canManage && (
            <Space wrap>
              <Button onClick={() => setEditRoomOpen(true)}>Sửa phòng</Button>
              <Button onClick={() => setBedModal({ open: true })}>
                Thêm giường
              </Button>
              <Button onClick={() => setServicesOpen(true)}>
                Cập nhật dịch vụ
              </Button>
              <Button onClick={() => setAssetsOpen(true)}>
                Cập nhật tài sản
              </Button>
            </Space>
          )}
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Mã phòng">{room.id}</Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">
              {room.branch.name}
            </Descriptions.Item>
            <Descriptions.Item label="Tầng / khu vực">
              {[room.floor, room.area].filter(Boolean).join(' / ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Loại phòng">
              {room.roomType ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Sức chứa">
              {room.maximumCapacity}
            </Descriptions.Item>
            <Descriptions.Item label="Giới tính">
              {room.genderPolicy ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Điều hòa">
              {room.hasAirConditioner ? 'Có' : 'Không'}
            </Descriptions.Item>
            <Descriptions.Item label="Gửi xe">
              {room.hasParking ? 'Có' : 'Không'}
            </Descriptions.Item>
            <Descriptions.Item label="Giờ giấc">
              {room.curfew ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Yên tĩnh">
              {room.quietLevel ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {operationalLabel[room.operationalStatus]}
            </Descriptions.Item>
            <Descriptions.Item label="Nội quy" span={2}>
              {room.rules ?? '—'}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5}>Danh sách giường</Typography.Title>
            <Table<Bed>
              rowKey="id"
              size="small"
              dataSource={room.beds}
              pagination={false}
              columns={[
                { title: 'Tên giường', dataIndex: 'name' },
                { title: 'Giá thuê', dataIndex: 'monthlyRent' },
                {
                  title: 'Vận hành',
                  render: (_, bed) => operationalLabel[bed.operationalStatus],
                },
                {
                  title: 'Kinh doanh',
                  render: (_, bed) => (
                    <Tag color={businessStatusMeta[bed.businessStatus].color}>
                      {businessStatusMeta[bed.businessStatus].label}
                    </Tag>
                  ),
                },
                ...(canManage
                  ? [
                      {
                        title: 'Thao tác',
                        render: (_: unknown, bed: Bed) => (
                          <Button
                            type="link"
                            onClick={() => setBedModal({ open: true, bed })}
                          >
                            Sửa
                          </Button>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          <div>
            <Typography.Title level={5}>Dịch vụ</Typography.Title>
            <Table
              rowKey="serviceId"
              size="small"
              pagination={false}
              dataSource={room.services}
              columns={[
                { title: 'Dịch vụ', render: (_, row) => row.service.name },
                {
                  title: 'Đơn giá',
                  render: (_, row) => row.customPrice ?? row.service.unitPrice,
                },
                { title: 'Ghi chú', dataIndex: 'note' },
              ]}
            />
          </div>

          <div>
            <Typography.Title level={5}>Tài sản phòng</Typography.Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={room.assets}
              columns={[
                { title: 'Loại tài sản', render: (_, row) => row.assetType.name },
                { title: 'Số lượng', dataIndex: 'quantity' },
                { title: 'Tình trạng', dataIndex: 'currentCondition' },
                { title: 'Ghi chú', dataIndex: 'note' },
              ]}
            />
          </div>

          <RoomFormModal
            open={editRoomOpen}
            branchId={room.branchId}
            room={room}
            onClose={() => setEditRoomOpen(false)}
            onSaved={() => {
              setEditRoomOpen(false);
              invalidate();
            }}
          />
          <BedFormModal
            open={bedModal.open}
            roomId={room.id}
            bed={bedModal.bed}
            onClose={() => setBedModal({ open: false })}
            onSaved={() => {
              setBedModal({ open: false });
              invalidate();
            }}
          />
          <RoomServicesModal
            open={servicesOpen}
            room={room}
            onClose={() => setServicesOpen(false)}
            onSaved={() => {
              setServicesOpen(false);
              invalidate();
            }}
          />
          <RoomAssetsModal
            open={assetsOpen}
            room={room}
            onClose={() => setAssetsOpen(false)}
            onSaved={() => {
              setAssetsOpen(false);
              invalidate();
            }}
          />
        </Space>
      )}
    </Drawer>
  );
}

function BedFormModal({
  open,
  roomId,
  bed,
  onClose,
  onSaved,
}: {
  open: boolean;
  roomId: string;
  bed?: Bed;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const mutation = useMutation({
    mutationFn: (values: {
      name: string;
      monthlyRent: string;
      operationalStatus: OperationalStatus;
      note?: string | null;
    }) => (bed ? updateBed(bed.id, values) : addBed(roomId, values)),
    onSuccess: () => {
      message.success(bed ? 'Đã cập nhật giường.' : 'Đã thêm giường.');
      form.resetFields();
      onSaved();
    },
    onError: (error) => message.error(displayError(error)),
  });

  return (
    <Modal
      title={bed ? 'Sửa giường' : 'Thêm giường'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      destroyOnClose
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={bed ?? { operationalStatus: 'ACTIVE' }}
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.Item
          name="name"
          label="Tên giường"
          rules={[{ required: true, message: 'Nhập tên giường.' }]}
        >
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item
          name="monthlyRent"
          label="Giá thuê tháng"
          rules={[
            { required: true, message: 'Nhập giá thuê.' },
            {
              pattern: /^\d+(\.\d{1,2})?$/,
              message: 'Giá không hợp lệ (ví dụ 3000000 hoặc 3000000.00).',
            },
          ]}
        >
          <Input inputMode="decimal" />
        </Form.Item>
        <Form.Item
          name="operationalStatus"
          label="Trạng thái vận hành"
          rules={[{ required: true }]}
        >
          <Select options={operationalOptions} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function RoomServicesModal({
  open,
  room,
  onClose,
  onSaved,
}: {
  open: boolean;
  room: RoomDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: listServices,
    enabled: open,
    retry: false,
  });
  const [selected, setSelected] = useState<string[]>(
    room.services.map((row) => row.serviceId),
  );
  const mutation = useMutation({
    mutationFn: () =>
      putRoomServices(
        room.id,
        selected.map((serviceId) => ({ serviceId })),
      ),
    onSuccess: () => {
      message.success('Đã cập nhật dịch vụ phòng.');
      onSaved();
    },
    onError: (error) => message.error(displayError(error)),
  });

  return (
    <Modal
      title="Cập nhật dịch vụ phòng"
      open={open}
      onCancel={onClose}
      onOk={() => mutation.mutate()}
      confirmLoading={mutation.isPending}
      afterOpenChange={(next) => {
        if (next) setSelected(room.services.map((row) => row.serviceId));
      }}
    >
      <Select
        mode="multiple"
        style={{ width: '100%' }}
        placeholder="Chọn dịch vụ"
        loading={servicesQuery.isLoading}
        value={selected}
        onChange={setSelected}
        optionFilterProp="label"
        options={(servicesQuery.data ?? []).map((service) => ({
          value: service.id,
          label: `${service.name} (${service.unitPrice})`,
        }))}
      />
    </Modal>
  );
}

function RoomAssetsModal({
  open,
  room,
  onClose,
  onSaved,
}: {
  open: boolean;
  room: RoomDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const assetTypesQuery = useQuery({
    queryKey: ['asset-types'],
    queryFn: listAssetTypes,
    enabled: open,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (values: {
      assets: {
        assetTypeId: string;
        quantity: number;
        currentCondition?: string | null;
        note?: string | null;
      }[];
    }) => putRoomAssets(room.id, values.assets ?? []),
    onSuccess: () => {
      message.success('Đã cập nhật tài sản phòng.');
      onSaved();
    },
    onError: (error) => message.error(displayError(error)),
  });

  return (
    <Modal
      title="Cập nhật tài sản phòng"
      open={open}
      width={640}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      afterOpenChange={(next) => {
        if (next)
          form.setFieldsValue({
            assets: room.assets.map((asset) => ({
              assetTypeId: asset.assetTypeId,
              quantity: asset.quantity,
              currentCondition: asset.currentCondition,
              note: asset.note,
            })),
          });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => mutation.mutate(values)}
      >
        <Form.List name="assets">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }}>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" wrap>
                  <Form.Item
                    name={[field.name, 'assetTypeId']}
                    rules={[{ required: true, message: 'Chọn loại tài sản.' }]}
                  >
                    <Select
                      style={{ width: 200 }}
                      placeholder="Loại tài sản"
                      loading={assetTypesQuery.isLoading}
                      options={(assetTypesQuery.data ?? []).map((type) => ({
                        value: type.id,
                        label: type.name,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'quantity']}
                    rules={[{ required: true, message: 'Nhập số lượng.' }]}
                  >
                    <InputNumber min={1} max={1000} placeholder="Số lượng" />
                  </Form.Item>
                  <Form.Item name={[field.name, 'currentCondition']}>
                    <Input placeholder="Tình trạng" />
                  </Form.Item>
                  <Button type="link" danger onClick={() => remove(field.name)}>
                    Xóa
                  </Button>
                </Space>
              ))}
              <Button onClick={() => add({ quantity: 1 })}>Thêm tài sản</Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
