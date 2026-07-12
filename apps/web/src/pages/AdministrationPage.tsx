import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { FormInstance } from 'antd';
import { useEffect, useState } from 'react';

import {
  getBranch,
  getBranches,
  getEmployees,
  updateBranch,
  type BranchUpdate,
} from '../features/administration/administration-api';
import { ApiError } from '../lib/api-client';
import { useAuth } from '../features/auth/AuthProvider';

function BranchForm({ form }: { form: FormInstance<BranchUpdate> }) {
  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="Branch name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="address" label="Address" rules={[{ required: true }]}>
        <Input.TextArea />
      </Form.Item>
      <Form.Item name="phone" label="Phone">
        <Input />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="accountHolderName" label="Account holder">
        <Input />
      </Form.Item>
      <Form.Item name="bankAccountNumber" label="Bank account">
        <Input />
      </Form.Item>
      <Form.Item name="bankName" label="Bank">
        <Input />
      </Form.Item>
      <Form.Item name="bankTransferInstruction" label="Transfer instruction">
        <Input.TextArea />
      </Form.Item>
      <Form.Item name="status" label="Status">
        <Input />
      </Form.Item>
    </Form>
  );
}

export function AdministrationPage() {
  const { employee, isInitialized } = useAuth();
  const client = useQueryClient();
  const [notice, contextHolder] = message.useMessage();
  const [form] = Form.useForm<BranchUpdate>();
  const [editingId, setEditingId] = useState<string>();
  const employees = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });
  const branches = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    enabled: isInitialized && Boolean(employee),
    retry: false,
  });
  const detail = useQuery({
    queryKey: ['branch', editingId],
    queryFn: () => getBranch(editingId!),
    enabled: isInitialized && Boolean(employee) && Boolean(editingId),
    retry: false,
  });
  useEffect(() => {
    if (detail.data) form.setFieldsValue(detail.data);
  }, [detail.data, form]);
  const mutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BranchUpdate }) =>
      updateBranch(id, values),
    onSuccess: async () => {
      setEditingId(undefined);
      await client.invalidateQueries({ queryKey: ['branches'] });
      notice.success('Branch updated.');
    },
    onError: (error) =>
      notice.error(
        error instanceof ApiError ? error.message : 'Unable to update branch.',
      ),
  });
  return (
    <>
      {contextHolder}
      <Card title="Employees and branches">
        <Tabs
          items={[
            {
              key: 'employees',
              label: 'Employees',
              children: employees.isError ? (
                <Alert type="error" message="Unable to load employees." />
              ) : (
                <Table
                  rowKey="id"
                  loading={employees.isLoading}
                  dataSource={employees.data ?? []}
                  pagination={false}
                  columns={[
                    { title: 'ID', dataIndex: 'id' },
                    { title: 'Name', dataIndex: 'fullName' },
                    {
                      title: 'Username',
                      render: (_, row) => row.account?.username ?? '-',
                    },
                    { title: 'Role', dataIndex: 'role' },
                    {
                      title: 'Branch',
                      render: (_, row) => row.branch?.name ?? 'System',
                    },
                    { title: 'Phone', dataIndex: 'phone' },
                    { title: 'Email', dataIndex: 'email' },
                    {
                      title: 'Status',
                      render: (_, row) => <Tag>{row.status}</Tag>,
                    },
                  ]}
                />
              ),
            },
            {
              key: 'branches',
              label: 'Branches',
              children: (
                <Table
                  rowKey="id"
                  loading={branches.isLoading}
                  dataSource={branches.data ?? []}
                  pagination={false}
                  columns={[
                    { title: 'ID', dataIndex: 'id' },
                    { title: 'Name', dataIndex: 'name' },
                    { title: 'Address', dataIndex: 'address' },
                    { title: 'Phone', dataIndex: 'phone' },
                    { title: 'Email', dataIndex: 'email' },
                    {
                      title: 'Status',
                      render: (_, row) => <Tag>{row.status}</Tag>,
                    },
                    {
                      title: 'Action',
                      render: (_, row) => (
                        <Button
                          type="link"
                          onClick={() => setEditingId(row.id)}
                        >
                          View / edit
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title="Branch details"
        open={Boolean(editingId)}
        onCancel={() => setEditingId(undefined)}
        onOk={() =>
          form
            .validateFields()
            .then((values) => mutation.mutate({ id: editingId!, values }))
        }
        confirmLoading={detail.isLoading || mutation.isPending}
      >
        <BranchForm form={form} />
      </Modal>
    </>
  );
}
