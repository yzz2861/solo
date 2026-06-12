import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Typography,
  message
} from 'antd';
import {
  EyeOutlined,
  SearchOutlined,
  EditOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { supervisorAPI } from '../api';

const { Title } = Typography;
const { Option } = Select;

const riskMap = {
  high: { color: 'red', text: '高风险' },
  medium: { color: 'orange', text: '中风险' },
  low: { color: 'blue', text: '低风险' }
};

const RevisionList = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [riskLevel, setRiskLevel] = useState();
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await supervisorAPI.revisions({ 
        page, 
        pageSize,
        risk_level: riskLevel
      });
      let data = res.data.summaries;
      
      if (searchText) {
        data = data.filter(s => 
          s.claim_no.toLowerCase().includes(searchText.toLowerCase()) ||
          s.customer_name.toLowerCase().includes(searchText.toLowerCase()) ||
          s.generator_name.toLowerCase().includes(searchText.toLowerCase())
        );
      }
      
      setSummaries(data);
      setTotal(res.data.total);
    } catch (err) {
      message.error('获取改判列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, riskLevel]);

  const columns = [
    {
      title: '案件编号',
      dataIndex: 'claim_no',
      key: 'claim_no',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '客户姓名',
      dataIndex: 'customer_name',
      key: 'customer_name'
    },
    {
      title: '理赔员',
      dataIndex: 'generator_name',
      key: 'generator_name'
    },
    {
      title: '改判次数',
      dataIndex: 'revision_count',
      key: 'revision_count',
      render: (count) => (
        <Tag color={count > 3 ? 'red' : count > 0 ? 'orange' : 'green'}>
          <EditOutlined /> {count} 次
        </Tag>
      ),
      sorter: (a, b) => a.revision_count - b.revision_count
    },
    {
      title: '当前风险',
      dataIndex: 'current_risk',
      key: 'current_risk',
      render: (risk) => {
        if (!risk) return <Tag color="default">未评估</Tag>;
        const r = riskMap[risk];
        return <Tag color={r.color}><WarningOutlined /> {r.text}</Tag>;
      }
    },
    {
      title: '审核状态',
      key: 'status',
      render: (_, record) => {
        if (record.status === 'reviewed') {
          return <Tag color="green"><CheckCircleOutlined /> 已审核</Tag>;
        }
        return <Tag color="orange"><ClockCircleOutlined /> 待审核</Tag>;
      }
    },
    {
      title: '最后改判时间',
      dataIndex: 'last_revised_at',
      key: 'last_revised_at',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
      sorter: (a, b) => new Date(a.last_revised_at) - new Date(b.last_revised_at)
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => navigate(`/revisions/${record.id}`)}
        >
          审核
        </Button>
      )
    }
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>改判审核</Title>
          <Space>
            <Input
              placeholder="搜索案件号/客户名/理赔员"
              prefix={<SearchOutlined />}
              style={{ width: 240 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={fetchData}
            />
            <Select
              placeholder="风险等级"
              style={{ width: 140 }}
              allowClear
              value={riskLevel}
              onChange={(v) => { setRiskLevel(v); setPage(1); }}
            >
              <Option value="high">高风险</Option>
              <Option value="medium">中风险</Option>
              <Option value="low">低风险</Option>
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={summaries}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            }
          }}
        />
      </Card>
    </div>
  );
};

export default RevisionList;
