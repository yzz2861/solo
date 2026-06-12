import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Progress,
  List,
  Avatar
} from 'antd';
import {
  FileTextOutlined,
  AuditOutlined,
  SafetyOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { supervisorAPI } from '../api';

const { Title } = Typography;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await supervisorAPI.statistics();
      setStats(res.data);
    } catch (err) {
      // message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const riskLevelColor = (level) => {
    const colors = { high: '#ff4d4f', medium: '#faad14', low: '#1890ff' };
    return colors[level] || '#8c8c8c';
  };

  if (!stats) {
    return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>;
  }

  const statCards = [
    {
      title: '总案件数',
      value: stats.total_claims,
      icon: <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      color: '#e6f7ff'
    },
    {
      title: '已生成摘要',
      value: stats.total_summaries,
      icon: <AuditOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      color: '#f6ffed'
    },
    {
      title: '含人工改判',
      value: stats.revised_summaries,
      icon: <EditOutlined style={{ fontSize: 24, color: '#faad14' }} />,
      color: '#fffbe6',
      onClick: () => navigate('/revisions')
    },
    {
      title: '待审核',
      value: stats.pending_review,
      icon: <SafetyOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      color: '#f9f0ff',
      onClick: () => navigate('/revisions')
    },
    {
      title: '高风险待处理',
      value: stats.high_risk_pending,
      icon: <ExclamationCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />,
      color: '#fff1f0',
      onClick: () => navigate('/revisions')
    },
    {
      title: '已审核通过',
      value: stats.reviewed_summaries,
      icon: <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      color: '#f6ffed'
    }
  ];

  const adjusterColumns = [
    {
      title: '理赔员',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          {text}
        </Space>
      )
    },
    {
      title: '案件数',
      dataIndex: 'claim_count',
      key: 'claim_count'
    },
    {
      title: '摘要数',
      dataIndex: 'summary_count',
      key: 'summary_count'
    },
    {
      title: '改判数',
      dataIndex: 'revised_count',
      key: 'revised_count',
      render: (count, record) => (
        <Space>
          {count}
          {record.summary_count > 0 && (
            <Progress 
              percent={Math.round(count / record.summary_count * 100)} 
              size="small" 
              showInfo={false}
              strokeColor="#faad14"
            />
          )}
        </Space>
      )
    },
    {
      title: '改判率',
      key: 'rate',
      render: (_, record) => (
        <Tag color={record.summary_count > 0 && count / record.summary_count > 0.3 ? 'red' : 'green'}>
          {record.summary_count > 0 
            ? `${Math.round(count / record.summary_count * 100)}%` 
            : '-'}
        </Tag>
      )
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>数据概览</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, idx) => (
          <Col span={8} key={idx}>
            <Card 
              hoverable
              onClick={card.onClick}
              style={{ 
                background: card.color,
                cursor: card.onClick ? 'pointer' : 'default'
              }}
              className="card-hover"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Statistic
                    title={card.title}
                    value={card.value}
                    valueStyle={{ fontSize: 32, fontWeight: 600 }}
                  />
                </div>
                <div style={{ opacity: 0.8 }}>
                  {card.icon}
                </div>
              </div>
              {card.onClick && (
                <div style={{ marginTop: 8, color: '#1890ff', fontSize: 12 }}>
                  点击查看详情 <ArrowRightOutlined />
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card 
            title={
              <Space>
                <UserOutlined />
                理赔员绩效
              </Space>
            }
          >
            <Table
              columns={adjusterColumns}
              dataSource={stats.adjuster_performance}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card 
            title={
              <Space>
                <EditOutlined />
                最近改判记录
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/revisions')}>
                查看全部
              </Button>
            }
          >
            {stats.recent_revisions && stats.recent_revisions.length > 0 ? (
              <List
                dataSource={stats.recent_revisions}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Space>
                          <Tag color="blue">{item.claim_no}</Tag>
                          <Tag color="orange">{item.field_name}</Tag>
                          <span>{item.reviser_name}</span>
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>
                            {dayjs(item.revised_at).format('YYYY-MM-DD HH:mm')} · {item.reason}
                          </div>
                          <div>
                            <span style={{ textDecoration: 'line-through', color: '#ff4d4f' }}>
                              {item.old_value || '(空)'}
                            </span>
                            <span style={{ margin: '0 8px' }}>→</span>
                            <span style={{ color: '#52c41a' }}>
                              {item.new_value || '(已删除)'}
                            </span>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
                暂无改判记录
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
