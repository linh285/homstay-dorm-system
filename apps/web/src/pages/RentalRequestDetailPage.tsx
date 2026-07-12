import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { FormInstance } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CustomerFields } from '../features/rental-requests/CustomerFields';
import {
  addMember,
  closeRentalRequest,
  createRentalRequest,
  deleteMember,
  getRentalRequest,
  updateMember,
  updateRentalRequest,
  type CustomerInput,
  type RentalRequest,
  type RentalRequestInput,
} from '../features/rental-requests/rental-request-api';
import { useAuth } from '../features/auth/AuthProvider';
import { ApiError } from '../lib/api-client';

const defaultRequest = (branchId: string): RentalRequestInput => ({
  branchId,
  expectedResidents: 1,
  rentalMode: 'SHARED_BEDS',
  expectedCheckInDate: '',
  rentalDurationMonths: 12,
});
const defaultCustomer: CustomerInput = {
  customerType: 'INDIVIDUAL',
  fullName: '',
};

function toCustomerValues(customer: CustomerInput) {
  return { ...customer, birthDate: customer.birthDate?.slice(0, 10) };
}
function toRequestValues(request: RentalRequestInput) {
  return {
    ...request,
    expectedCheckInDate: request.expectedCheckInDate.slice(0, 10),
  };
}
function displayError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Thao tác không thành công.';
}

export function RentalRequestDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { employee, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  const [notice, contextHolder] = message.useMessage();
  const requestQuery = useQuery({
    queryKey: ['rental-request', id],
    queryFn: () => getRentalRequest(id!),
    enabled: !isNew && isInitialized && Boolean(employee),
  });
  const invalidate = async () =>
    queryClient.invalidateQueries({ queryKey: ['rental-request', id] });

  const createMutation = useMutation({
    mutationFn: createRentalRequest,
    onSuccess: async (request) => {
      notice.success('Đã tạo yêu cầu thuê.');
      await navigate(`/rental-requests/${request.id}`);
    },
    onError: (error) => notice.error(displayError(error)),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      requestId,
      input,
    }: {
      requestId: string;
      input: {
        customer?: CustomerInput;
        rentalRequest?: Partial<RentalRequestInput>;
      };
    }) => updateRentalRequest(requestId, input),
    onSuccess: invalidate,
    onError: (error) => notice.error(displayError(error)),
  });
  const closeMutation = useMutation({
    mutationFn: closeRentalRequest,
    onSuccess: invalidate,
    onError: (error) => notice.error(displayError(error)),
  });

  if (!isNew && requestQuery.isLoading) return <Spin />;
  if (!isNew && !requestQuery.data)
    return (
      <Typography.Text type="danger">Không tìm thấy hồ sơ.</Typography.Text>
    );
  const rentalRequest = requestQuery.data;
  const editable =
    !rentalRequest ||
    rentalRequest.status === 'ACTIVE' ||
    rentalRequest.status === 'VIEWING';

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="large" className="rental-detail">
        <Space>
          <Button onClick={() => void navigate('/rental-requests')}>
            Quay lại
          </Button>
          {rentalRequest && <Tag color="blue">{rentalRequest.status}</Tag>}
          {rentalRequest && editable && (
            <Popconfirm
              title="Đóng yêu cầu thuê?"
              onConfirm={() => closeMutation.mutate(rentalRequest.id)}
            >
              <Button danger loading={closeMutation.isPending}>
                Đóng yêu cầu
              </Button>
            </Popconfirm>
          )}
        </Space>
        {isNew ? (
          <CreateRequestForm
            branchId={employee!.branchId!}
            loading={createMutation.isPending}
            onSubmit={(input) => createMutation.mutate(input)}
          />
        ) : (
          <Tabs
            items={[
              {
                key: 'customer',
                label: 'Thông tin khách',
                children: (
                  <CustomerTab
                    rentalRequest={rentalRequest!}
                    editable={editable}
                    onUpdate={(customer) =>
                      updateMutation.mutate({
                        requestId: rentalRequest!.id,
                        input: { customer },
                      })
                    }
                    onRefresh={invalidate}
                  />
                ),
              },
              {
                key: 'needs',
                label: 'Nhu cầu thuê',
                children: (
                  <NeedsTab
                    rentalRequest={rentalRequest!}
                    editable={editable}
                    loading={updateMutation.isPending}
                    onUpdate={(rentalRequestInput) =>
                      updateMutation.mutate({
                        requestId: rentalRequest!.id,
                        input: { rentalRequest: rentalRequestInput },
                      })
                    }
                  />
                ),
              },
            ]}
          />
        )}
      </Space>
    </>
  );
}

function CreateRequestForm({
  branchId,
  loading,
  onSubmit,
}: {
  branchId: string;
  loading: boolean;
  onSubmit: (input: {
    customer: CustomerInput;
    rentalRequest: RentalRequestInput;
  }) => void;
}) {
  const [customerForm] = Form.useForm<CustomerInput>();
  const [requestForm] = Form.useForm<RentalRequestInput>();
  useEffect(() => {
    customerForm.setFieldsValue(defaultCustomer);
    requestForm.setFieldsValue(defaultRequest(branchId));
  }, [branchId, customerForm, requestForm]);
  return (
    <Card title="Tạo yêu cầu thuê">
      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Typography.Title level={4}>Thông tin khách</Typography.Title>
          <Form form={customerForm} layout="vertical">
            <CustomerFields form={customerForm} />
          </Form>
        </Col>
        <Col xs={24} lg={12}>
          <Typography.Title level={4}>Nhu cầu thuê</Typography.Title>
          <RentalNeedsFields form={requestForm} branchId={branchId} />
          <Button
            type="primary"
            loading={loading}
            onClick={() =>
              Promise.all([
                customerForm.validateFields(),
                requestForm.validateFields(),
              ]).then(([customer, rentalRequest]) =>
                onSubmit({ customer, rentalRequest }),
              )
            }
          >
            Tạo yêu cầu
          </Button>
        </Col>
      </Row>
    </Card>
  );
}

function CustomerTab({
  rentalRequest,
  editable,
  onUpdate,
  onRefresh,
}: {
  rentalRequest: RentalRequest;
  editable: boolean;
  onUpdate: (customer: CustomerInput) => void;
  onRefresh: () => Promise<unknown>;
}) {
  const [form] = Form.useForm<CustomerInput>();
  const [memberForm] = Form.useForm<CustomerInput>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [notice, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  useEffect(
    () => form.setFieldsValue(toCustomerValues(rentalRequest.representative)),
    [form, rentalRequest.representative],
  );
  const refresh = async () => {
    await onRefresh();
    await queryClient.invalidateQueries({ queryKey: ['rental-requests'] });
  };
  const memberMutation = useMutation({
    mutationFn: async (customer: CustomerInput) =>
      editingId
        ? updateMember(rentalRequest.id, editingId, customer)
        : addMember(rentalRequest.id, customer),
    onSuccess: async () => {
      setModalOpen(false);
      await refresh();
    },
    onError: (error) => notice.error(displayError(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (memberId: string) => deleteMember(rentalRequest.id, memberId),
    onSuccess: refresh,
    onError: (error) => notice.error(displayError(error)),
  });
  const openMember = (member?: RentalRequest['members'][number]) => {
    setEditingId(member?.customerId);
    memberForm.setFieldsValue(
      member
        ? { ...toCustomerValues(member.customer), customerType: 'INDIVIDUAL' }
        : { customerType: 'INDIVIDUAL' },
    );
    setModalOpen(true);
  };
  return (
    <>
      {contextHolder}
      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Card title="Khách / người đại diện">
            <Form form={form} layout="vertical">
              <CustomerFields form={form} disabled={!editable} />
              <Button
                type="primary"
                disabled={!editable}
                onClick={() =>
                  form.validateFields().then((customer) => onUpdate(customer))
                }
              >
                Lưu thông tin khách
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Thành viên dự kiến"
            extra={
              <Button
                disabled={
                  !editable ||
                  rentalRequest.members.length >=
                    rentalRequest.expectedResidents
                }
                onClick={() => openMember()}
              >
                Thêm thành viên
              </Button>
            }
          >
            <Table
              rowKey="customerId"
              pagination={false}
              dataSource={rentalRequest.members}
              columns={[
                {
                  title: 'Họ tên',
                  render: (_, member) => member.customer.fullName,
                },
                {
                  title: 'Điện thoại',
                  render: (_, member) => member.customer.phone,
                },
                { title: 'Trạng thái', dataIndex: 'participationStatus' },
                {
                  title: 'Thao tác',
                  render: (_, member) =>
                    editable && (
                      <Space>
                        <Button type="link" onClick={() => openMember(member)}>
                          Sửa
                        </Button>
                        <Popconfirm
                          title="Xóa thành viên?"
                          onConfirm={() =>
                            deleteMutation.mutate(member.customerId)
                          }
                        >
                          <Button type="link" danger>
                            Xóa
                          </Button>
                        </Popconfirm>
                      </Space>
                    ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
      <Modal
        title={editingId ? 'Sửa thành viên' : 'Thêm thành viên'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() =>
          memberForm.validateFields().then((customer) =>
            memberMutation.mutate({
              ...customer,
              customerType: 'INDIVIDUAL',
            }),
          )
        }
        confirmLoading={memberMutation.isPending}
      >
        <Form form={memberForm} layout="vertical">
          <CustomerFields form={memberForm} memberOnly />
        </Form>
      </Modal>
    </>
  );
}

function NeedsTab({
  rentalRequest,
  editable,
  loading,
  onUpdate,
}: {
  rentalRequest: RentalRequest;
  editable: boolean;
  loading: boolean;
  onUpdate: (input: Partial<RentalRequestInput>) => void;
}) {
  const [form] = Form.useForm<RentalRequestInput>();
  useEffect(
    () => form.setFieldsValue(toRequestValues(rentalRequest)),
    [form, rentalRequest],
  );
  return (
    <Card>
      <RentalNeedsFields
        form={form}
        branchId={rentalRequest.branchId}
        disabled={!editable}
      />
      <Button
        type="primary"
        disabled={!editable}
        loading={loading}
        onClick={() => form.validateFields().then((values) => onUpdate(values))}
      >
        Lưu nhu cầu thuê
      </Button>
    </Card>
  );
}

function RentalNeedsFields({
  form,
  branchId,
  disabled,
}: {
  form: FormInstance<RentalRequestInput>;
  branchId: string;
  disabled?: boolean;
}) {
  return (
    <Form form={form} layout="vertical">
      <Form.Item name="branchId" initialValue={branchId} hidden>
        <Input />
      </Form.Item>
      <Form.Item label="Chi nhánh">
        <Input value={branchId} disabled />
      </Form.Item>
      <Form.Item
        name="expectedResidents"
        label="Số người dự kiến"
        rules={[{ required: true }]}
      >
        <InputNumber min={1} disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="rentalMode"
        label="Hình thức thuê"
        rules={[{ required: true }]}
      >
        <Select
          disabled={disabled}
          options={[
            { value: 'WHOLE_ROOM', label: 'Nguyên phòng' },
            { value: 'SHARED_BEDS', label: 'Ở ghép' },
          ]}
        />
      </Form.Item>
      <Form.Item name="preferredRoomType" label="Loại phòng mong muốn">
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="preferredArea" label="Khu vực mong muốn">
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="maximumBudget" label="Ngân sách tối đa">
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="expectedCheckInDate"
        label="Ngày dự kiến vào"
        rules={[{ required: true }]}
      >
        <Input type="date" disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="rentalDurationMonths"
        label="Thời hạn thuê (tháng)"
        rules={[{ required: true }]}
      >
        <InputNumber min={1} disabled={disabled} />
      </Form.Item>
      <Form.Item name="genderRequirement" label="Yêu cầu giới tính">
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="requiresAirConditioner"
        label="Cần điều hòa"
        valuePropName="checked"
      >
        <Switch disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="requiresParking"
        label="Cần gửi xe"
        valuePropName="checked"
      >
        <Switch disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="quietPreference"
        label="Ưu tiên yên tĩnh"
        valuePropName="checked"
      >
        <Switch disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="acceptsSharedBeds"
        label="Chấp nhận ở ghép"
        valuePropName="checked"
      >
        <Switch disabled={disabled} />
      </Form.Item>
      <Form.Item name="livingSchedule" label="Giờ sinh hoạt">
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="note" label="Ghi chú">
        <Input.TextArea disabled={disabled} />
      </Form.Item>
    </Form>
  );
}
