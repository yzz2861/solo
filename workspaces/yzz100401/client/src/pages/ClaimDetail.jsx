import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Descriptions, 
  Button, 
  Space, 
  Table, 
  Tag, 
  message,
  Typography,
  Divider,
  Modal,
  Form,
  Input,
  DatePicker,
  Popconfirm,
  Tooltip
} from 'antd';
import { 
  ArrowLeftOutlined, 
  UploadOutlined, 
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileUnknownOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { claimAPI, documentAPI, summaryAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const PARSE_STATUS_MAP = {
  pending: { color: 'default', text: '待解析', icon: FileUnknownOutlined },
  processing: { color: 'processing', text: '解析中', icon: LoadingOutlined, spin: true },
  success: { color: 'green', text: '解析成功', icon: CheckCircleOutlined },
  failed: { color: 'red', text: '解析失败', icon: CloseCircleOutlined },
  unsupported: { color: 'orange', text: '不支持', icon: ExclamationCircleOutlined }
};

const ClaimDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsingDocs, setParsingDocs] = useState(new Set());
  const pollTimerRef = useRef(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [contentModalVisible, setContentModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docContent, setDocContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [form] = Form.useForm();
  const { isSupervisor } = useAuth();

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await claimAPI.get(id);
      setClaim(res.data.claim);
      setDocuments(res.data.documents);
    } catch (err) {
      message.error('获取案件详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleEdit = async (values) => {
    try {
      await claimAPI.update(id, {
        ...values,
        accident_date: values.accident_date?.format('YYYY-MM-DD')
      });
      message.success('更新成功');
      setEditModalVisible(false);
      fetchDetail();
    } catch (err) {
      message.error(err.response?.data?.error || '更新失败');
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await documentAPI.delete(id, docId);
      message.success('删除成功');
      fetchDetail();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleViewContent = async (doc) => {
    setSelectedDoc(doc);
    try {
      const res = await documentAPI.getContent(id, doc.id);
      const content = res.data.map(c => c.content).join('\n\n');
      setDocContent(content);
      setEditContent(content);
      setContentModalVisible(true);
    } catch (err) {
      setDocContent('');
      setEditContent('');
      setContentModalVisible(true);
    }
  };

  const handleSaveContent = async () => {
    try {
      await documentAPI.saveContent(id, selectedDoc.id, {
        content: editContent,
        page_no: 1
      });
      message.success('保存成功');
      setContentModalVisible(false);
      fetchDetail();
    } catch (err) {
      message.error('保存失败');
    }
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    try {
      const res = await summaryAPI.generate(id);
      message.success('摘要生成成功');
      navigate(`/summaries/${res.data.summary.id}`);
    } catch (err) {
      message.error(err.response?.data?.error || '生成摘要失败');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await documentAPI.list(id);
        setDocuments(res.data);
        
        const parsingDocs = res.data.filter(d => d.parse_status === 'processing' || d.parse_status === 'pending');
        if (parsingDocs.length === 0) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } catch (err) {
        console.error('轮询文档状态失败:', err);
      }
    }, 3000);
  };

  const handleReparse = async (doc) => {
    try {
      setParsingDocs(prev => new Set([...prev, doc.id]));
      await documentAPI.reparse(id, doc.id);
      message.success('已开始重新解析');
      startPolling();
      fetchDetail();
    } catch (err) {
      message.error(err.response?.data?.error || '重新解析失败');
    } finally {
      setParsingDocs(prev => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  useEffect(() => {
    if (documents.some(d => d.parse_status === 'processing' || d.parse_status === 'pending')) {
      startPolling();
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [documents]);

  const docColumns = [
    {
      title: '文件名称',
      dataIndex: 'file_name',
      key: 'file_name',
      ellipsis: true
    },
    {
      title: '类型',
      dataIndex: 'doc_type',
      key: 'doc_type',
      render: (type) => {
        const typeMap = {
          medical: { color: 'blue', text: '病历' },
          invoice: { color: 'green', text: '发票' },
          accident: { color: 'orange', text: '事故说明' },
          photo: { color: 'purple', text: '照片' },
          other: { color: 'default', text: '其他' }
        };
        const t = typeMap[type] || typeMap.other;
        return <Tag color={t.color}>{t.text}</Tag>;
      }
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => size ? `${(size / 1024).toFixed(1)} KB` : '-'
    },
    {
      title: '解析状态',
      dataIndex: 'parse_status',
      key: 'parse_status',
      render: (status, record) => {
        const statusInfo = PARSE_STATUS_MAP[status] || PARSE_STATUS_MAP.pending;
        const StatusIcon = statusInfo.icon;
        const statusTag = (
          <Tag icon={statusInfo.spin ? <StatusIcon spin /> : <StatusIcon />} color={statusInfo.color}>
            {statusInfo.text}
          </Tag>
        );
        
        if (status === 'failed' && record.parse_error) {
          return (
            <Tooltip title={record.parse_error}>
              {statusTag}
            </Tooltip>
          );
        }
        
        if (status === 'success') {
          return (
            <Tooltip title={`${record.page_count || 0} 页，${record.text_length || 0} 字`}>
              {statusTag}
            </Tooltip>
          );
        }
        
        return statusTag;
      }
    },
    {
      title: '上传人',
      dataIndex: 'uploader_name',
      key: 'uploader_name'
    },
    {
      title: '上传时间',
      dataIndex: 'upload_at',
      key: 'upload_at',
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
            onClick={() => handleViewContent(record)}
            disabled={record.parse_status !== 'success' && record.content_pages === 0}
          >
            内容
          </Button>
          {record.parse_status !== 'unsupported' && record.parse_status !== 'processing' && (
            <Tooltip title="重新解析">
              <Button
                type="link"
                icon={<ReloadOutlined />}
                loading={parsingDocs.has(record.id)}
                onClick={() => handleReparse(record)}
              >
                重解析
              </Button>
            </Tooltip>
          )}
          {record.is_duplicate && (
            <Tag color="warning">重复</Tag>
          )}
          <Popconfirm
            title="确定删除该文档？"
            onConfirm={() => handleDeleteDocument(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (!claim) {
    return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>;
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/claims')}>
          返回列表
        </Button>
      </Space>

      <Card title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            案件详情 - <Tag color="blue">{claim.claim_no}</Tag>
          </Title>
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({
                customer_name: claim.customer_name,
                phone: claim.phone,
                accident_date: claim.accident_date ? dayjs(claim.accident_date) : null
              });
              setEditModalVisible(true);
            }}
          >
            编辑案件
          </Button>
        </Space>
      } loading={loading}>
        <Descriptions column={3}>
          <Descriptions.Item label="客户姓名">{claim.customer_name}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{claim.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="事故日期">{claim.accident_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="案件状态">
            <Tag color={claim.status === 'completed' ? 'green' : claim.status === 'processing' ? 'blue' : 'orange'}>
              {claim.status === 'pending' ? '待处理' : claim.status === 'processing' ? '处理中' : claim.status === 'completed' ? '已完成' : '已拒赔'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建人">{claim.creator_name}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(claim.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

      <Card 
        title="上传材料"
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              onClick={() => navigate(`/claims/${id}/upload`)}
            >
              上传材料
            </Button>
            <Button 
              type="primary" 
              icon={<FileTextOutlined />}
              onClick={handleGenerateSummary}
              loading={loading}
              disabled={documents.length === 0}
              danger={documents.some(d => d.content_count === 0)}
            >
              {documents.some(d => d.content_count === 0) ? '存在未录入内容的文档' : '生成摘要'}
            </Button>
          </Space>
        }
      >
        <Table
          columns={docColumns}
          dataSource={documents}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无上传材料' }}
        />
      </Card>

      <Modal
        title="编辑案件信息"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleEdit}>
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
              <Button onClick={() => setEditModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`文档内容 - ${selectedDoc?.file_name}`}
        open={contentModalVisible}
        onCancel={() => setContentModalVisible(false)}
        width={800}
        footer={
          <Space>
            <Button onClick={() => setContentModalVisible(false)}>关闭</Button>
            <Button type="primary" onClick={handleSaveContent}>保存内容</Button>
          </Space>
        }
      >
        <Input.TextArea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="请输入或粘贴文档内容..."
          rows={15}
          style={{ fontFamily: 'Courier New', fontSize: 14, lineHeight: 1.6 }}
        />
        <div style={{ marginTop: 16, color: '#8c8c8c', fontSize: 12 }}>
          提示：您可以手动输入文档内容，或粘贴从OCR识别的文字。系统将根据这些内容自动提取关键信息。
        </div>
      </Modal>
    </div>
  );
};

export default ClaimDetail;
