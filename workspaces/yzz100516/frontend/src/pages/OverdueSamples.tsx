import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, Alert } from 'antd';
import { ExclamationCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { OverdueSample } from '../types';
import { sampleApi } from '../services/api';
import { statusMap, formatDate } from '../utils';

function OverdueSamples() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState<OverdueSample[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sampleApi.overdue(true);
      setSamples(data);
    } catch (error) {
      message.error('加载超期样品失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getOverdueLevel = (days: number) => {
    if (days >= 30) return { color: 'red', label: '严重超期' };
    if (days >= 14) return { color: 'orange', label: '超期警告' };
    return { color: 'warning', label: '已超期' };
  };

  const columns = [
    {
      title: '超期天数',
      dataIndex: 'overdue_days',
      key: 'overdue_days',
      width: 100,
      sorter: (a: OverdueSample, b: OverdueSample) => a.overdue_days - b.overdue_days,
      defaultSortOrder: 'descend' as const,
      render: (days: number) => {
        const level = getOverdueLevel(days);
        return (
          <Space>
            <Tag color={level.color} style={{ fontSize: 14, padding: '4px 12px' }}>
              {days} 天
            </Tag>
          </Space>
        );
      },
    },
    {
      title: '严重程度',
      dataIndex: 'overdue_days',
      key: 'level',
      width: 100,
      render: (days: number) => {
        const level = getOverdueLevel(days);
        return <Tag color={level.color}>{level.label}</Tag>;
      },
    },
    {
      title: '样品编号',
      dataIndex: 'sample_no',
      key: 'sample_no',
      width: 140,
      render: (text: string, record: OverdueSample) => (
        <a onClick={() => navigate(`/samples/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '样品名称',
      dataIndex: 'sample_name',
      key: 'sample_name',
    },
    {
      title: '批次号',
      dataIndex: 'batch_number',
      key: 'batch_number',
    },
    {
      title: '申请人',
      dataIndex: 'applicant',
      key: 'applicant',
      width: 100,
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
      render: (text: string) => (
        <span style={{ color: '#f5222d' }}>{formatDate(text)}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = statusMap[status as keyof typeof statusMap];
        return <Tag color={info?.color}>{info?.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: OverdueSample) => (
        <Button type="link" onClick={() => navigate(`/samples/${record.id}`)}>
          处理 <ArrowRightOutlined />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Alert
        message="超期样品需要优先处理，避免海关追问风险"
        description="按超期天数从长到短排序，请优先处理超期时间较长的样品"
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Card
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>超期样品列表</span>
            <Tag color="red">{samples.length} 个</Tag>
          </Space>
        }
        extra={
          <Button onClick={loadData}>刷新</Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={samples}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条超期记录`,
          }}
        />
      </Card>
    </div>
  );
}

export default OverdueSamples;
