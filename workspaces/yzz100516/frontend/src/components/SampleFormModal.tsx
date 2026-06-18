import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, DatePicker, message, Alert, Tag, Space } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Sample, SampleCreate, SampleUpdate, BatchCheckResult } from '../types';
import { sampleApi } from '../services/api';
import { purposeOptions, statusMap } from '../utils';

const { TextArea } = Input;

interface Props {
  visible: boolean;
  sample: Sample | null;
  onCancel: () => void;
  onOk: () => void;
}

function SampleFormModal({ visible, sample, onCancel, onOk }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [batchWarning, setBatchWarning] = useState<string | null>(null);
  const [batchInfo, setBatchInfo] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      if (sample) {
        form.setFieldsValue({
          ...sample,
          out_time: sample.out_time ? dayjs(sample.out_time) : undefined,
          expected_return_time: sample.expected_return_time
            ? dayjs(sample.expected_return_time)
            : undefined,
        });
      } else {
        form.resetFields();
      }
      setBatchWarning(null);
      setBatchInfo(null);
    }
  }, [visible, sample, form]);

  const handleBatchChange = async (value: string) => {
    if (!value || value.trim().length < 3) {
      setBatchWarning(null);
      setBatchInfo(null);
      return;
    }
    try {
      const result = await sampleApi.batchCheck(value.trim());
      if (result.existing_count > 0 && (!sample || result.existing_samples.some((s: any) => s.id !== sample.id))) {
        setBatchWarning(`该批次已有 ${result.existing_count} 个样品在申请/在外，请注意合并或检查`);
        setBatchInfo(result);
      } else {
        setBatchWarning(null);
        setBatchInfo(null);
      }
    } catch (error) {
      // ignore
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: SampleCreate | SampleUpdate = {
        ...values,
        out_time: values.out_time ? values.out_time.toISOString() : undefined,
        expected_return_time: values.expected_return_time
          ? values.expected_return_time.toISOString()
          : undefined,
      };

      if (sample) {
        await sampleApi.update(sample.id, data as SampleUpdate);
        message.success('更新成功');
      } else {
        const result = await sampleApi.create(data as SampleCreate);
        if (result.batch_warning && result.batch_duplicate_info) {
          message.warning({
            content: (
              <span>
                创建成功！该批次号 <strong>{result.batch_duplicate_info.batch_number}</strong> 已有
                <strong> {result.batch_duplicate_info.existing_count} </strong>
                个样品在申请/在外，请留意是否需要合并处理。
              </span>
            ),
            duration: 6,
          });
        } else {
          message.success('创建成功');
        }
      }

      onOk();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.response?.data?.detail || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={sample ? '编辑样品申请' : '新建样品申请'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="sample_name"
          label="样品名称"
          rules={[{ required: true, message: '请输入样品名称' }]}
        >
          <Input placeholder="请输入样品名称" maxLength={200} />
        </Form.Item>

        <Form.Item
          name="batch_number"
          label="批次号"
          rules={[{ required: true, message: '请输入批次号' }]}
        >
          <Input placeholder="请输入批次号" maxLength={100} onBlur={(e) => handleBatchChange(e.target.value)} />
        </Form.Item>

        {batchWarning && batchInfo && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            style={{ marginBottom: 16 }}
            message={batchWarning}
            description={
              <div style={{ marginTop: 8 }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {batchInfo.existing_samples?.slice(0, 3).map((s: any) => (
                    <div key={s.id} style={{ fontSize: 12 }}>
                      <span style={{ marginRight: 8 }}>
                        <Tag color={statusMap[s.status]?.color} style={{ fontSize: 11 }}>
                          {statusMap[s.status]?.label}
                        </Tag>
                      </span>
                      <code style={{ background: '#fffbe6', padding: '2px 6px', borderRadius: 3 }}>
                        {s.sample_no}
                      </code>
                      <span style={{ margin: '0 6px', color: '#666' }}>
                        {s.sample_name}
                      </span>
                      <span style={{ color: '#999' }}>- {s.applicant}</span>
                    </div>
                  ))}
                  {batchInfo.existing_samples?.length > 3 && (
                    <div style={{ fontSize: 12, color: '#999' }}>
                      还有 {batchInfo.existing_samples.length - 3} 个样品...
                    </div>
                  )}
                </Space>
              </div>
            }
          />
        )}

        <Form.Item name="purpose" label="用途" rules={[{ required: true, message: '请选择用途' }]}>
          <Select placeholder="请选择用途" options={purposeOptions} />
        </Form.Item>

        <Form.Item name="purpose_detail" label="用途说明">
          <TextArea rows={3} placeholder="请输入用途详细说明" maxLength={500} showCount />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            name="applicant"
            label="申请人"
            rules={[{ required: true, message: '请输入申请人' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="请输入申请人" maxLength={100} />
          </Form.Item>

          <Form.Item name="department" label="部门" style={{ flex: 1 }}>
            <Input placeholder="请输入部门" maxLength={100} />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="quantity" label="数量" initialValue={1} style={{ flex: 1 }}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="unit" label="单位" initialValue="件" style={{ flex: 1 }}>
            <Input placeholder="件/个/套等" maxLength={20} />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="out_time" label="出区时间" style={{ flex: 1 }}>
            <DatePicker showTime style={{ width: '100%' }} placeholder="选择出区时间" />
          </Form.Item>

          <Form.Item name="expected_return_time" label="预计归还时间" style={{ flex: 1 }}>
            <DatePicker showTime style={{ width: '100%' }} placeholder="选择预计归还时间" />
          </Form.Item>
        </div>

        <Form.Item name="customs_documents" label="海关资料">
          <TextArea rows={2} placeholder="请输入海关备案资料说明" maxLength={500} />
        </Form.Item>

        <Form.Item name="remark" label="备注">
          <TextArea rows={2} placeholder="请输入备注信息" maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default SampleFormModal;
