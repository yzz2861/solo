import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Tabs,
  Table,
  Tag,
  message,
} from 'antd';
import {
  ExportOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  RollbackOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Sample } from '../types';
import { sampleApi, complianceApi } from '../services/api';
import { statusMap, purposeMap, formatDate } from '../utils';

function Compliance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [outboundSamples, setOutboundSamples] = useState<Sample[]>([]);
  const [returnedSamples, setReturnedSamples] = useState<Sample[]>([]);
  const [destroyedSamples, setDestroyedSamples] = useState<Sample[]>([]);
  const [missingDocsSamples, setMissingDocsSamples] = useState<Sample[]>([]);
  const [summary, setSummary] = useState({
    outbound_count: 0,
    returned_count: 0,
    destroyed_count: 0,
    missing_docs_count: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [outData, returnData, destroyData, missingData, summaryData] = await Promise.all([
        sampleApi.outSamples(),
        sampleApi.list({ status: 'returned', limit: 100 }),
        sampleApi.list({ status: 'destroyed', limit: 100 }),
        sampleApi.missingDocs(),
        complianceApi.summary(),
      ]);
      setOutboundSamples(outData);
      setReturnedSamples(returnData.items);
      setDestroyedSamples(destroyData.items);
      setMissingDocsSamples(missingData);
      setSummary(summaryData);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = () => {
    complianceApi.export();
  };

  const statCards = [
    {
      title: '在外样品',
      value: summary.outbound_count,
      icon: <LogoutOutlined style={{ fontSize: 28, color: '#722ed1' }} />,
      color: '#722ed1',
    },
    {
      title: '已归还',
      value: summary.returned_count,
      icon: <RollbackOutlined style={{ fontSize: 28, color: '#52c41a' }} />,
      color: '#52c41a',
    },
    {
      title: '已销毁',
      value: summary.destroyed_count,
      icon: <DeleteOutlined style={{ fontSize: 28, color: '#8c8c8c' }} />,
      color: '#8c8c8c',
    },
    {
      title: '缺资料',
      value: summary.missing_docs_count,
      icon: <ExclamationCircleOutlined style={{ fontSize: 28, color: '#faad14' }} />,
      color: '#faad14',
    },
  ];

  const baseColumns = [
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
      title: '用途',
      dataIndex: 'purpose',
      key: 'purpose',
      width: 100,
      render: (purpose: string) => purposeMap[purpose as keyof typeof purposeMap] || purpose,
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
  ];

  const outboundColumns = [
    ...baseColumns,
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
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Sample) => (
        <Button
          type="link"
          size="small"
          icon={<PrinterOutlined />}
          onClick={() => complianceApi.releaseOrder(record.id)}
        >
          放行单
        </Button>
      ),
    },
  ];

  const returnedColumns = [
    ...baseColumns,
    {
      title: '出区时间',
      dataIndex: 'out_time',
      key: 'out_time',
      width: 160,
      render: (text: string) => formatDate(text),
    },
    {
      title: '归还时间',
      dataIndex: 'actual_return_time',
      key: 'actual_return_time',
      width: 160,
      render: (text: string) => formatDate(text),
    },
  ];

  const destroyedColumns = [
    ...baseColumns,
    {
      title: '销毁时间',
      dataIndex: 'destroy_time',
      key: 'destroy_time',
      width: 160,
      render: (text: string) => formatDate(text),
    },
    {
      title: '销毁原因',
      dataIndex: 'destroy_reason',
      key: 'destroy_reason',
    },
    {
      title: '操作人',
      dataIndex: 'destroy_operator',
      key: 'destroy_operator',
      width: 100,
    },
  ];

  const missingDocsColumns = [
    ...baseColumns,
    {
      title: '缺失资料',
      key: 'missing',
      width: 120,
      render: () => <Tag color="orange">海关资料不全</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Sample) => (
        <Button type="link" size="small" onClick={() => navigate(`/samples/${record.id}`)}>
          补充资料
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'outbound',
      label: (
        <Space>
          <LogoutOutlined />
          出区清单
          <Tag color="purple">{summary.outbound_count}</Tag>
        </Space>
      ),
      children: (
        <Table
          rowKey="id"
          columns={outboundColumns}
          dataSource={outboundSamples}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'returned',
      label: (
        <Space>
          <RollbackOutlined />
          归还清单
          <Tag color="green">{summary.returned_count}</Tag>
        </Space>
      ),
      children: (
        <Table
          rowKey="id"
          columns={returnedColumns}
          dataSource={returnedSamples}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'destroyed',
      label: (
        <Space>
          <DeleteOutlined />
          销毁清单
          <Tag color="default">{summary.destroyed_count}</Tag>
        </Space>
      ),
      children: (
        <Table
          rowKey="id"
          columns={destroyedColumns}
          dataSource={destroyedSamples}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'missing',
      label: (
        <Space>
          <ExclamationCircleOutlined />
          缺资料清单
          <Tag color="orange">{summary.missing_docs_count}</Tag>
        </Space>
      ),
      children: (
        <Table
          rowKey="id"
          columns={missingDocsColumns}
          dataSource={missingDocsSamples}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, index) => (
          <Col span={6} key={index}>
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
        title={
          <Space>
            <FileSearchOutlined />
            合规管理
          </Space>
        }
        extra={
          <Space>
            <Button onClick={loadData}>刷新</Button>
            <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
        }
      >
        <Tabs items={tabItems} defaultActiveKey="outbound" />
      </Card>
    </div>
  );
}

export default Compliance;
