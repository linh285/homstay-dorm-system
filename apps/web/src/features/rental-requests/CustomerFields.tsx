import { Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';

import type { CustomerType } from './rental-request-api';

type Props = { form: FormInstance; disabled?: boolean; memberOnly?: boolean };

export function CustomerFields({ form, disabled, memberOnly = false }: Props) {
  const customerType = Form.useWatch('customerType', form) as
    CustomerType | undefined;
  return (
    <>
      {!memberOnly && (
        <Form.Item
          name="customerType"
          label="Loại khách"
          rules={[{ required: true }]}
        >
          <Select
            disabled={disabled}
            options={[
              { value: 'INDIVIDUAL', label: 'Cá nhân' },
              { value: 'ORGANIZATION', label: 'Tổ chức' },
            ]}
          />
        </Form.Item>
      )}
      {(memberOnly || customerType === 'INDIVIDUAL') && (
        <Form.Item
          name="fullName"
          label="Họ tên"
          rules={[{ required: true, message: 'Nhập họ tên.' }]}
        >
          <Input disabled={disabled} />
        </Form.Item>
      )}
      {!memberOnly && customerType === 'ORGANIZATION' && (
        <>
          <Form.Item
            name="organizationName"
            label="Tên tổ chức"
            rules={[{ required: true }]}
          >
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item
            name="representativeName"
            label="Người đại diện"
            rules={[{ required: true }]}
          >
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="taxCode" label="Mã số thuế">
            <Input disabled={disabled} />
          </Form.Item>
        </>
      )}
      {(memberOnly || customerType === 'INDIVIDUAL') && (
        <>
          <Form.Item name="birthDate" label="Ngày sinh">
            <Input type="date" disabled={disabled} />
          </Form.Item>
          <Form.Item name="gender" label="Giới tính">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="nationality" label="Quốc tịch">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="identityDocumentType" label="Loại giấy tờ">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="identityDocumentNumber" label="Số giấy tờ">
            <Input disabled={disabled} />
          </Form.Item>
        </>
      )}
      <Form.Item name="phone" label="Điện thoại">
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item name="address" label="Địa chỉ">
        <Input.TextArea disabled={disabled} rows={2} />
      </Form.Item>
    </>
  );
}
