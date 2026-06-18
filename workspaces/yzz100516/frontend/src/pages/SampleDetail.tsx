import { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  List,
  Upload,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Popconfirm,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  LogoutOutlined,
  RollbackOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { sampleApi, complianceApi } from '../services/api';
import type { Sample } from '../types';
import { statusMap, purposeMap, approvalStatusMap, formatDate, formatFileSize } from '../utils';

function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [destroyModalVisible, setDestroyModalVisible] = useState(false);
  const [approveForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [destroyForm] = Form.useForm();

  const loadSample = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await sampleApi.get(parseInt(id));
      setSample(data);
    } catch (error) {
      message.error('加载样品详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSample();
  }, [id]);

  const handleApprove = async (approved: boolean) => {
    try {
      const values = await approveForm.validateFields();
      setActionLoading(true);
      await sampleApi.approve(parseInt(id!), {
        approved,
        approver: values.approver,
        opinion: values.opinion,
      });
      message.success(approved ? '审批通过' : '已拒绝');
      setApproveModalVisible(false);
      approveForm.resetFields();
      loadSample();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOutbound = async () => {
    try {
      setActionLoading(true);
      await sampleApi.outbound(parseInt(id!), {});
      message.success('已出区');
      loadSample();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '出区失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    try {
      const values = await returnForm.validateFields();
      setActionLoading(true);
      await sampleApi.return(parseInt(id!), {
        return_time: values.return_time?.toISOString(),
        remark: values.remark,
      });
      message.success('归还成功');
      setReturnModalVisible(false);
      returnForm.resetFields();
      loadSample();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('归还失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDestroy = async () => {
    try {
      const values = await destroyForm.validateFields();
      setActionLoading(true);
      await sampleApi.destroy(parseInt(id!), {
        destroy_time: values.destroy_time?.toISOString(),
        reason: values.reason,
        operator: values.operator,
      });
      message.success('销毁成功');
      setDestroyModalVisible(false);
      destroyForm.resetFields();
      loadSample();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('销毁失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await sampleApi.deleteAttachment(parseInt(id!), attachmentId);
      message.success('删除成功');
      loadSample();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    action: `/api/samples/${id}/attachments`,
    showUploadList: false,
    onChange(info) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 上传成功`);
        loadSample();
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`);
      }
    },
  };

  const isOverdue = sample &&
    sample.expected_return_time &&
    (sample.status === 'overdue' ||
      (sample.status === 'out' && dayjs().isAfter(dayjs(sample.expected_return_time))));

  const canEdit = sample?.status === 'pending_approval' || sample?.status === 'approved';
  const canApprove = sample?.approval_status === 'pending';
  const canOutbound = sample?.status === 'approved' && sample?.approval_status === 'approved';
  const canReturn = sample?.status === 'out' || sample?.status === 'overdue';
  const canDestroy = sample?.status !== 'destroyed' && sample?.status !== 'returned';
  const canPrint = sample?.approval_status === 'approved';

  if (!sample && !loading) {
    return <Empty description="样品不存在" />;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/samples')}>
          返回列表
        </Button>
      </div>

      {isOverdue && (
        <Alert
          message="该样品已超期未归还，请尽快处理！"
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        title={
          <Space>
            <span>{sample?.sample_name}</span>
            <Tag color={statusMap[sample?.status as keyof typeof statusMap]?.color}>
              {statusMap[sample?.status as keyof typeof statusMap]?.label}
            </Tag>
          </Space>
        }
        loading={loading}
        extra={
          <Space>
            {canPrint && (
              <Button
                icon={<PrinterOutlined />}
                onClick={() => complianceApi.releaseOrder(sample!.id)}
              >
                打印放行单
              </Button>
            )}
            {canEdit && (
              <Button icon={<EditOutlined />} type="primary">
                编辑
              </Button>
            )}
            {canApprove && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    approveForm.setFieldsValue({ approved: true });
                    setApproveModalVisible(true);
                  }}
                >
                  通过
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => {
                    approveForm.setFieldsValue({ approved: false });
                    setApproveModalVisible(true);
                  }}
                >
                  拒绝
                </Button>
              </>
            )}
            {canOutbound && (
              <Button type="primary" icon={<LogoutOutlined />} onClick={handleOutbound} loading={actionLoading}>
                确认出区
              </Button>
            )}
            {canReturn && (
              <Button type="primary" icon={<RollbackOutlined />} onClick={() => setReturnModalVisible(true)}>
                归还登记
              </Button>
            )}
            {canDestroy && (
              <Popconfirm title="确定要销毁这个样品吗？" onConfirm={() => setDestroyModalVisible(true)}>
                <Button danger icon={<DeleteOutlined />}>
                  销毁
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="样品编号">{sample?.sample_no}</Descriptions.Item>
          <Descriptions.Item label="批次号">{sample?.batch_number}</Descriptions.Item>
          <Descriptions.Item label="用途">
            {purposeMap[sample?.purpose as keyof typeof purposeMap] || sample?.purpose}
          </Descriptions.Item>
          <Descriptions.Item label="申请人">{sample?.applicant}</Descriptions.Item>
          <Descriptions.Item label="部门">{sample?.department || '-'}</Descriptions.Item>
          <Descriptions.Item label="数量">
            {sample?.quantity} {sample?.unit}
          </Descriptions.Item>
          <Descriptions.Item label="出区时间">{formatDate(sample?.out_time)}</Descriptions.Item>
          <Descriptions.Item label="预计归还">
            <span style={{ color: isOverdue ? '#f5222d' : 'inherit' }}>
              {formatDate(sample?.expected_return_time)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="实际归还">{formatDate(sample?.actual_return_time)}</Descriptions.Item>
          <Descriptions.Item label="审批状态">
            <Tag color={approvalStatusMap[sample?.approval_status as keyof typeof approvalStatusMap]?.color}>
              {approvalStatusMap[sample?.approval_status as keyof typeof approvalStatusMap]?.label}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="审批人">{sample?.approver || '-'}</Descriptions.Item>
          <Descriptions.Item label="审批时间">{formatDate(sample?.approval_time)}</Descriptions.Item>
          <Descriptions.Item label="销毁时间">{formatDate(sample?.destroy_time)}</Descriptions.Item>
          <Descriptions.Item label="销毁操作人">{sample?.destroy_operator || '-'}</Descriptions.Item>
          <Descriptions.Item label="用途说明" span={2}>
            {sample?.purpose_detail || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="海关资料" span={2}>
            {sample?.customs_documents || '未填写'}
          </Descriptions.Item>
          <Descriptions.Item label="审批意见" span={2}>
            {sample?.approval_opinion || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="销毁原因" span={2}>
            {sample?.destroy_reason || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            {sample?.remark || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(sample?.created_at)}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{formatDate(sample?.updated_at)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="资料附件" style={{ marginTop: 16 }} extra={
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>上传附件</Button>
        </Upload>
      }>
        {sample?.attachments?.length === 0 ? (
          <Empty description="暂无附件" />
        ) : (
          <List
            dataSource={sample?.attachments}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(sampleApi.getAttachmentUrl(sample!.id, item.id), '_blank')}
                  >
                    下载
                  </Button>,
                  <Popconfirm title="确定删除？" onConfirm={() => handleDeleteAttachment(item.id)}>
                    <Button type="link" size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={item.file_name}
                  description={`${formatFileSize(item.file_size)} · ${formatDate(item.uploaded_at)}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="审批"
        open={approveModalVisible}
        onCancel={() => setApproveModalVisible(false)}
        onOk={() => handleApprove(approveForm.getFieldValue('approved'))}
        confirmLoading={actionLoading}
      >
        <Form form={approveForm} layout="vertical">
          <Form.Item name="approved" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="approver" label="审批人" rules={[{ required: true, message: '请输入审批人' }]}>
            <Input placeholder="请输入审批人姓名" />
          </Form.Item>
          <Form.Item name="opinion" label="审批意见">
            <Input.TextArea rows={3} placeholder="请输入审批意见" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="归还登记"
        open={returnModalVisible}
        onCancel={() => setReturnModalVisible(false)}
        onOk={handleReturn}
        confirmLoading={actionLoading}
      >
        <Form form={returnForm} layout="vertical">
          <Form.Item name="return_time" label="归还时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="默认当前时间" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入归还备注" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="销毁登记"
        open={destroyModalVisible}
        onCancel={() => setDestroyModalVisible(false)}
        onOk={handleDestroy}
        confirmLoading={actionLoading}
      >
        <Form form={destroyForm} layout="vertical">
          <Form.Item name="destroy_time" label="销毁时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="默认当前时间" />
          </Form.Item>
          <Form.Item name="reason" label="销毁原因" rules={[{ required: true, message: '请输入销毁原因' }]}>
            <Input.TextArea rows={3} placeholder="请输入销毁原因" maxLength={500} />
          </Form.Item>
          <Form.Item name="operator" label="操作人" rules={[{ required: true, message: '请输入操作人' }]}>
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SampleDetail;
