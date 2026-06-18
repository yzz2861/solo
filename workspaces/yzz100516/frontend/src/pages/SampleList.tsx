import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Form,
  Modal,
  DatePicker,
  Tag,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { sampleApi, complianceApi } from '../services/api';
import type { Sample, SamplePurpose, SampleStatus } from '../types';
import { statusMap, purposeMap, formatDate, purposeOptions, statusOptions } from '../utils';
import SampleFormModal from '../components/SampleFormModal';

const { RangePicker } = DatePicker;

function SampleList() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSample, setEditingSample] = useState<Sample | null>(null);

  const loadSamples = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params: Record<string, any> = {
        skip: (pagination.current - 1) * pagination.pageSize,
        limit: pagination.pageSize,
      };
      if (values.keyword) params.keyword = values.keyword;
      if (values.status) params.status = values.status;
      if (values.purpose) params.purpose = values.purpose;
      if (values.applicant) params.applicant = values.applicant;
      if (values.batch_number) params.batch_number = values.batch_number;

      const data = await sampleApi.list(params);
      setSamples(data.items);
      setTotal(data.total);
    } catch (error) {
      message.error('加载样品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSamples();
  }, [pagination.current, pagination.pageSize]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    loadSamples();
  };

  const handleReset = () => {
    form.resetFields();
    setPagination((prev) => ({ ...prev, current: 1 }));
    setTimeout(loadSamples, 100);
  };

  const handleCreate = () => {
    setEditingSample(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Sample) => {
    setEditingSample(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await sampleApi.delete(id);
      message.success('删除成功');
      loadSamples();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败');
    }
  };

  const handleModalOk = () => {
    setModalVisible(false);
    loadSamples();
  };

  const handlePrintRelease = (id: number) => {
    complianceApi.releaseOrder(id);
  };

  const columns = [
    {
      title: '样品编号',
      dataIndex: 'sample_no',
      key: 'sample_no',
      width: 140,
      render: (text: string, record: Sample) => (
        <a onClick={() => navigate(`/samples/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '样品名称',
      dataIndex: 'sample_name',
      key: 'sample_name',
      width: 150,
    },
    {
      title: '批次号',
      dataIndex: 'batch_number',
      key: 'batch_number',
      width: 130,
    },
    {
      title: '用途',
      dataIndex: 'purpose',
      key: 'purpose',
      width: 100,
      render: (purpose: SamplePurpose) => purposeMap[purpose] || purpose,
    },
    {
      title: '申请人',
      dataIndex: 'applicant',
      key: 'applicant',
      width: 100,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (qty: number, record: Sample) => `${qty} ${record.unit}`,
    },
    {
      title: '出区时间',
      dataIndex: 'out_time',
      key: 'out_time',
      width: 160,
      render: (text: string) => formatDate(text),
    },
    {
      title: '预计归还',
      dataIndex: 'expected_return_time',
      key: 'expected_return_time',
      width: 160,
      render: (text: string, record: Sample) => {
        if (!text) return '-';
        const isOverdue =
          record.status === 'overdue' ||
          (record.status === 'out' && dayjs().isAfter(dayjs(text)));
        return (
          <span style={{ color: isOverdue ? '#f5222d' : 'inherit' }}>
            {formatDate(text)}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: SampleStatus) => {
        const info = statusMap[status];
        return <Tag color={info?.color}>{info?.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Sample) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => navigate(`/samples/${record.id}`)}>
            详情
          </Button>
          {(record.status === 'pending_approval' || record.status === 'approved') && (
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              编辑
            </Button>
          )}
          {record.approval_status === 'approved' && (
            <Button
              type="link"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handlePrintRelease(record.id)}
            >
              放行单
            </Button>
          )}
          {record.status !== 'out' && record.status !== 'overdue' && (
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="样品名称/编号/批次" style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部状态" style={{ width: 150 }} allowClear options={statusOptions} />
          </Form.Item>
          <Form.Item name="purpose" label="用途">
            <Select placeholder="全部用途" style={{ width: 120 }} allowClear options={purposeOptions} />
          </Form.Item>
          <Form.Item name="applicant" label="申请人">
            <Input placeholder="申请人" style={{ width: 120 }} allowClear />
          </Form.Item>
          <Form.Item name="batch_number" label="批次号">
            <Input placeholder="批次号" style={{ width: 150 }} allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="样品列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建申请
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={samples}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            ...pagination,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
        />
      </Card>

      <SampleFormModal
        visible={modalVisible}
        sample={editingSample}
        onCancel={() => setModalVisible(false)}
        onOk={handleModalOk}
      />
    </div>
  );
}

export default SampleList;
