import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

import {
  completeHandover,
  createHandover,
  getHandover,
  putHandoverAssets,
  updateHandover,
  type Contract,
} from '../features/checkin/checkin-api';
import { getRoomAssets, type RoomAsset } from '../features/rooms/rooms-api';
import { ApiError } from '../lib/api-client';

function displayError(error: unknown) {
  return error instanceof ApiError ? error.message : 'Thao tác không thành công.';
}

export function HandoverDrawer({
  open,
  contract,
  onClose,
  onChanged,
}: {
  open: boolean;
  contract: Contract;
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const handoverId = contract.handover?.id ?? null;
  const [form] = Form.useForm();

  const handoverQuery = useQuery({
    queryKey: ['handover', handoverId],
    queryFn: () => getHandover(handoverId!),
    enabled: open && Boolean(handoverId),
    retry: false,
  });
  const handover = handoverQuery.data;

  const roomAssetsQuery = useQuery({
    queryKey: ['room-assets', handover?.roomIds],
    queryFn: async () => {
      const lists = await Promise.all(
        (handover?.roomIds ?? []).map((roomId) => getRoomAssets(roomId)),
      );
      return lists.flat();
    },
    enabled: open && Boolean(handover?.roomIds?.length),
    retry: false,
  });

  useEffect(() => {
    if (handover) {
      form.setFieldsValue({
        areaCondition: handover.areaCondition,
        utilitiesGuided: handover.utilitiesGuided,
        safetyGuided: handover.safetyGuided,
        paperHandoverSigned: handover.paperRecordSigned,
      });
    }
  }, [handover, form]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['handover', handoverId] });
    onChanged();
  };

  const createMutation = useMutation({
    mutationFn: () => createHandover(contract.id),
    onSuccess: () => {
      message.success('Đã tạo biên bản bàn giao.');
      onChanged();
    },
    onError: (error) => message.error(displayError(error)),
  });

  const saveMutation = useMutation({
    mutationFn: (values: {
      areaCondition?: string;
      utilitiesGuided?: boolean;
      safetyGuided?: boolean;
      paperHandoverSigned?: boolean;
    }) => updateHandover(handoverId!, values),
    onSuccess: () => {
      message.success('Đã lưu biên bản.');
      invalidate();
    },
    onError: (error) => message.error(displayError(error)),
  });

  const completeMutation = useMutation({
    mutationFn: () => completeHandover(handoverId!),
    onSuccess: () => {
      message.success('Đã hoàn tất bàn giao. Hợp đồng có hiệu lực.');
      invalidate();
      onClose();
    },
    onError: (error) => message.error(displayError(error)),
  });

  const isCompleted = handover?.status === 'COMPLETED';

  return (
    <Drawer
      title="Bàn giao phòng và tài sản"
      width={720}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {!handoverId ? (
        <Space direction="vertical">
          <Typography.Paragraph>
            Chưa có biên bản bàn giao cho hợp đồng này.
          </Typography.Paragraph>
          <Button
            type="primary"
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Tạo biên bản bàn giao
          </Button>
        </Space>
      ) : handover ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="Trạng thái">
              <Tag color={isCompleted ? 'green' : 'gold'}>{handover.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Quản lý">
              {handover.manager.fullName}
            </Descriptions.Item>
          </Descriptions>

          <Form form={form} layout="vertical" disabled={isCompleted}>
            <Form.Item name="areaCondition" label="Hiện trạng khu vực">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="utilitiesGuided" valuePropName="checked">
              <Checkbox>Đã hướng dẫn sử dụng tiện ích</Checkbox>
            </Form.Item>
            <Form.Item name="safetyGuided" valuePropName="checked">
              <Checkbox>Đã hướng dẫn an toàn</Checkbox>
            </Form.Item>
            <Form.Item name="paperHandoverSigned" valuePropName="checked">
              <Checkbox>Biên bản bàn giao giấy đã ký</Checkbox>
            </Form.Item>
            {!isCompleted && (
              <Button
                onClick={() => saveMutation.mutate(form.getFieldsValue())}
                loading={saveMutation.isPending}
              >
                Lưu biên bản
              </Button>
            )}
          </Form>

          <HandoverAssets
            handoverId={handover.id}
            assets={handover.assets}
            options={roomAssetsQuery.data ?? []}
            disabled={isCompleted}
            onSaved={invalidate}
          />

          {!isCompleted && (
            <Button
              type="primary"
              loading={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              Xác nhận bàn giao
            </Button>
          )}
        </Space>
      ) : (
        <Typography.Text>Đang tải…</Typography.Text>
      )}
    </Drawer>
  );
}

function HandoverAssets({
  handoverId,
  assets,
  options,
  disabled,
  onSaved,
}: {
  handoverId: string;
  assets: {
    roomAssetId: string;
    assetTypeName: string;
    standardQuantity: number;
    deliveredQuantity: number;
    conditionAtHandover: string | null;
  }[];
  options: RoomAsset[];
  disabled: boolean;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState(
    () =>
      assets.map((asset) => ({
        roomAssetId: asset.roomAssetId,
        deliveredQuantity: asset.deliveredQuantity,
        conditionAtHandover: asset.conditionAtHandover ?? '',
      })),
  );
  const mutation = useMutation({
    mutationFn: () => putHandoverAssets(handoverId, rows),
    onSuccess: () => {
      message.success('Đã lưu tài sản bàn giao.');
      onSaved();
    },
    onError: (error) => message.error(displayError(error)),
  });

  const addFromOptions = () => {
    const existing = new Set(rows.map((row) => row.roomAssetId));
    const next = options
      .filter((option) => !existing.has(option.id))
      .map((option) => ({
        roomAssetId: option.id,
        deliveredQuantity: option.quantity,
        conditionAtHandover: 'Tốt',
      }));
    setRows([...rows, ...next]);
  };

  const nameFor = (roomAssetId: string) =>
    options.find((option) => option.id === roomAssetId)?.assetType.name ??
    assets.find((asset) => asset.roomAssetId === roomAssetId)?.assetTypeName ??
    roomAssetId;

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Tài sản bàn giao
        </Typography.Title>
        {!disabled && <Button size="small" onClick={addFromOptions}>Thêm từ tài sản phòng</Button>}
      </Space>
      <Table
        rowKey="roomAssetId"
        size="small"
        pagination={false}
        dataSource={rows}
        columns={[
          { title: 'Tài sản', render: (_, row) => nameFor(row.roomAssetId) },
          {
            title: 'Số lượng giao',
            render: (_, row) => (
              <InputNumber
                min={0}
                disabled={disabled}
                value={row.deliveredQuantity}
                onChange={(value) =>
                  setRows((prev) =>
                    prev.map((item) =>
                      item.roomAssetId === row.roomAssetId
                        ? { ...item, deliveredQuantity: value ?? 0 }
                        : item,
                    ),
                  )
                }
              />
            ),
          },
          {
            title: 'Tình trạng',
            render: (_, row) => (
              <Input
                disabled={disabled}
                value={row.conditionAtHandover}
                onChange={(event) =>
                  setRows((prev) =>
                    prev.map((item) =>
                      item.roomAssetId === row.roomAssetId
                        ? { ...item, conditionAtHandover: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            ),
          },
        ]}
      />
      {!disabled && (
        <Button
          style={{ marginTop: 8 }}
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
        >
          Lưu tài sản
        </Button>
      )}
    </div>
  );
}
