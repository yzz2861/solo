import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space } from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { sampleApi } from '../services/api';
import type { Statistics, Sample } from '../types';
import { statusMap, formatDate } from '../utils';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [recentSamples, setRecentSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, samplesData] = await Promise.all([
        sampleApi.statistics(),
        sampleApi.list({ limit: 10 }),
      ]);
      setStats(statsData);
      setRecentSamples(samplesData.items);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats
    ? [
        {
          title: '样品总数',
          value: stats.total,
          icon: <FileTextOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
          color: '#1890ff',
        },
        {
          title: '待审批',
          value: stats.pending_approval,
          icon: <ClockCircleOutlined style={{ fontSize: 32, color: '#faad14' }} />,
          color: '#faad14',
        },
        {
          title: '在外样品',
          value: stats.out,
          icon: <CheckCircleOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
          color: '#722ed1',
        },
        {
          title: '超期样品',
          value: stats.overdue,
          icon: <ExclamationCircleOutlined style={{ fontSize: 32, color: '#f5222d' }} />,
          color: '#f5222d',
        },
        {
          title: '已归还',
          value: stats.returned,
          icon: <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
          color: '#52c41a',
        },
        {
          title: '已销毁',
          value: stats.destroyed,
          icon: <DeleteOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />,
          color: '#8c8c8c',
        },
      ]
    : [];

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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text: string) => formatDate(text),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, index) => (
          <Col span={4} key={index}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                valueStyle={{ color: card.color }}
                prefix={card.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="最近申请"
        extra={
          <Button type="link" onClick={() => navigate('/samples')}>
            查看全部 <ArrowRightOutlined />
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={recentSamples}
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}

export default Dashboard;
