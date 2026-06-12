import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
  Select, 
  Modal, 
  Form, 
  DatePicker,
  message,
  Card,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EyeOutlined, 
  UploadOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { claimAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;
const { Option } = Select;

const ClaimsList = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState();
  const [searchText, setSearchText] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  const navigate = useNavigate();
  const { isSupervisor } = useAuth();

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await claimAPI.list({ 
        status, 
        page, 
        pageSize 
      });
      let data = res.data.claims;
      
      if (searchText) {
        data = data.filter(c => 
          c.claim_no.toLowerCase().includes(searchText.toLowerCase()) ||
          c.customer_name.toLowerCase().includes(searchText.toLowerCase())
        );
      }
      
      setClaims(data);
      setTotal(res.data.total);
    } catch (err) {
      message.error('获取案件列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [page, pageSize, status]);

  const handleCreate = async (values) => {
    try {
      await claimAPI.create({
        ...values,
        accident_date: values.accident_date?.format('YYYY-MM-DD')
      });
      message.success('创建案件成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchClaims();
    } catch (err) {
      message.error(err.response?.data?.error || '创建案件失败');
    }
  };

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
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: '事故日期',
      dataIndex: 'accident_date',
      key: 'accident_date',
      render: (text) => text || '-'
    },
    {
      title: '材料数量',
      dataIndex: 'doc_count',
      key: 'doc_count',
      render: (count) => count || 0
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          pending: { color: 'orange', text: '待处理' },
          processing: { color: 'blue', text: '处理中' },
          completed: { color: 'green', text: '已完成' },
          rejected: { color: 'red', text: '已拒赔' }
        };
        const s = statusMap[status] || statusMap.pending;
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      key: 'creator_name'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/claims/${record.id}`)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            icon={<UploadOutlined />}
            onClick={() => navigate(`/claims/${record.id}/upload`)}
          >
            上传
          </Button>
          {record.has_summary > 0 && (
            <Button 
              type="link" 
              icon={<FileTextOutlined />}
              onClick={() => navigate(`/summaries/${record.id}`)}
            >
              摘要
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>理赔案件</Title>
          <Space>
            <Input
              placeholder="搜索案件号/客户名"
              prefix={<SearchOutlined />}
              style={{ width: 240 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={fetchClaims}
            />
            <Select
              placeholder="筛选状态"
              style={{ width: 140 }}
              allowClear
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
            >
              <Option value="pending">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="completed">已完成</Option>
              <Option value="rejected">已拒赔</Option>
            </Select>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新建案件
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={claims}
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

      <Modal
        title="新建理赔案件"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="客户姓名"
            name="customer_name"
            rules={[{ required: true, message: '请输入客户姓名' }]}
          >
            <Input placeholder="请输入客户姓名" />
          </Form.Item>
          <Form.Item
            label="联系电话"
            name="phone"
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item
            label="事故日期"
            name="accident_date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClaimsList;
