import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Divider,
  Row,
  Col,
  List,
  Input,
  Select,
  Modal,
  Form,
  Popconfirm,
  Tooltip,
  Alert,
  Descriptions,
  Tabs,
  Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  ExportOutlined,
  ReloadOutlined,
  FileTextOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { summaryAPI, exportAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const severityMap = {
  high: { color: 'red', icon: <ExclamationCircleOutlined />, text: '高风险' },
  medium: { color: 'orange', icon: <WarningOutlined />, text: '中风险' },
  low: { color: 'blue', icon: <InfoCircleOutlined />, text: '低风险' }
};

const categoryMap = {
  visit_time: { label: '就诊时间', color: 'blue' },
  accident_time: { label: '事故时间', color: 'orange' },
  accident_desc: { label: '事故描述', color: 'orange' },
  expense_item: { label: '费用项目', color: 'green' },
  expense_total: { label: '费用合计', color: 'green' }
};

const SummaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editItemModal, setEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [addItemModal, setAddItemModal] = useState(false);
  const [addForm] = Form.useForm();
  const [exportModal, setExportModal] = useState(false);
  const [exportContent, setExportContent] = useState(null);
  const [exportType, setExportType] = useState('customer');
  const [addMissingModal, setAddMissingModal] = useState(false);
  const [addFollowupModal, setAddFollowupModal] = useState(false);
  const [addForm2] = Form.useForm();
  const [addForm3] = Form.useForm();
  const { isSupervisor } = useAuth();

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await summaryAPI.get(id);
      setSummaryData(res.data);
    } catch (err) {
      message.error('获取摘要详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [id]);

  const handleEditItem = (item) => {
    setEditingItem(item);
    setEditValue(item.value);
    setEditReason('');
    setEditItemModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      message.warning('值不能为空');
      return;
    }
    try {
      const res = await summaryAPI.updateItem(editingItem.id, {
        value: editValue,
        reason: editReason || '人工修正'
      });
      setSummaryData(res.data);
      message.success('修改成功');
      setEditItemModal(false);
    } catch (err) {
      message.error('修改失败');
    }
  };

  const handleDeleteItem = async (item) => {
    try {
      const res = await summaryAPI.deleteItem(item.id, { reason: '人工删除' });
      setSummaryData(res.data);
      message.success('删除成功');
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleAddItem = async (values) => {
    try {
      const res = await summaryAPI.addItem(id, values);
      setSummaryData(res.data);
      message.success('添加成功');
      setAddItemModal(false);
      addForm.resetFields();
    } catch (err) {
      message.error('添加失败');
    }
  };

  const handleResolveConflict = async (conflict, resolved) => {
    try {
      const res = await summaryAPI.resolveConflict(conflict.id, resolved);
      setSummaryData(res.data);
      message.success(resolved ? '已标记为已解决' : '已取消解决标记');
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleUpdateMissing = async (item, field, value) => {
    try {
      const res = await summaryAPI.updateMissing(item.id, { [field]: value });
      setSummaryData(res.data);
    } catch (err) {
      message.error('更新失败');
    }
  };

  const handleUpdateFollowup = async (point, field, value) => {
    try {
      const res = await summaryAPI.updateFollowup(point.id, { [field]: value });
      setSummaryData(res.data);
    } catch (err) {
      message.error('更新失败');
    }
  };

  const handleAddMissing = async (values) => {
    try {
      const res = await summaryAPI.addMissing(id, values);
      setSummaryData(res.data);
      message.success('添加成功');
      setAddMissingModal(false);
      addForm2.resetFields();
    } catch (err) {
      message.error('添加失败');
    }
  };

  const handleAddFollowup = async (values) => {
    try {
      const res = await summaryAPI.addFollowup(id, values);
      setSummaryData(res.data);
      message.success('添加成功');
      setAddFollowupModal(false);
      addForm3.resetFields();
    } catch (err) {
      message.error('添加失败');
    }
  };

  const handleDeleteMissing = async (item) => {
    try {
      const res = await summaryAPI.deleteMissing(item.id);
      setSummaryData(res.data);
      message.success('删除成功');
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleDeleteFollowup = async (point) => {
    try {
      const res = await summaryAPI.deleteFollowup(point.id);
      setSummaryData(res.data);
      message.success('删除成功');
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleExport = async (type) => {
    setExportType(type);
    try {
      const res = type === 'customer' 
        ? await exportAPI.customer(id)
        : await exportAPI.internal(id);
      setExportContent(res.data);
      setExportModal(true);
    } catch (err) {
      message.error('导出失败');
    }
  };

  const handleDownload = () => {
    if (!exportContent) return;
    const blob = new Blob([exportContent.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportContent.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const claimId = summaryData.summary.claim_id;
      const res = await summaryAPI.generate(claimId);
      setSummaryData(res.data);
      message.success('摘要已重新生成');
    } catch (err) {
      message.error(err.response?.data?.error || '重新生成失败');
    } finally {
      setLoading(false);
    }
  };

  const renderSummaryItem = (item) => {
    const cat = categoryMap[item.category] || { label: item.category, color: 'default' };
    return (
      <div 
        key={item.id} 
        style={{ 
          padding: 12, 
          marginBottom: 8, 
          borderRadius: 4,
          background: item.is_manual ? '#fffbe6' : '#fafafa',
          border: item.is_manual ? '1px solid #ffe58f' : '1px solid #f0f0f0'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4 }}>
              <Tag color={cat.color}>{cat.label}</Tag>
              <Text strong>{item.key}</Text>
              {item.is_manual && <Tag color="gold" style={{ marginLeft: 8 }}>人工</Tag>}
              <Tooltip title={`置信度: ${(item.confidence * 100).toFixed(0)}%`}>
                <span className="confidence-bar">
                  <span 
                    className="confidence-fill" 
                    style={{ width: `${item.confidence * 100}%` }}
                  />
                </span>
              </Tooltip>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 4 }}>
              {item.value}
            </div>
            <div className="source-ref">
              来源：{item.source_ref}
            </div>
          </div>
          <Space style={{ marginLeft: 16 }}>
            <Button 
              type="link" 
              icon={<EditOutlined />}
              onClick={() => handleEditItem(item)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除此项？"
              onConfirm={() => handleDeleteItem(item)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        </div>
      </div>
    );
  };

  if (!summaryData) {
    return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>;
  }

  const { summary, structured, conflicts, missing_items, follow_up_points, revisions, reviews } = summaryData;

  const unresolvedConflicts = conflicts.filter(c => !c.resolved);
  const highRiskCount = unresolvedConflicts.filter(c => c.severity === 'high').length;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/claims/${summary.claim_id}`)}>
          返回案件
        </Button>
      </Space>

      {highRiskCount > 0 && (
        <Alert
          message={`存在 ${highRiskCount} 个高风险冲突，请重点关注`}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {summary.has_manual_revision && (
        <Alert
          message="该摘要包含人工改判记录"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card 
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              摘要核对 - <Tag color="blue">{summary.claim_no}</Tag>
            </Title>
            <Tag color={summary.status === 'reviewed' ? 'green' : 'blue'}>
              {summary.status === 'reviewed' ? '主管已审核' : '待处理'}
            </Tag>
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleRegenerate}
              loading={loading}
            >
              重新生成
            </Button>
            <Button 
              type="primary" 
              icon={<ExportOutlined />}
              onClick={() => handleExport('customer')}
            >
              导出客户版
            </Button>
            <Button 
              icon={<ExportOutlined />}
              onClick={() => handleExport('internal')}
            >
              导出内部版
            </Button>
          </Space>
        }
        loading={loading}
      >
        <Descriptions column={4} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="客户姓名">{summary.customer_name}</Descriptions.Item>
          <Descriptions.Item label="事故日期">{summary.accident_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="生成人">{summary.generator_name}</Descriptions.Item>
          <Descriptions.Item label="生成时间">{dayjs(summary.generated_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        </Descriptions>

        <Tabs defaultActiveKey="1">
          <TabPane tab={<span><FileTextOutlined />提取信息</span>} key="1">
            <Row gutter={24}>
              <Col span={12}>
                <div className="summary-section">
                  <div className="summary-section-title">
                    <Space>
                      <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
                      事故信息
                    </Space>
                    <Button 
                      type="link" 
                      icon={<PlusOutlined />}
                      onClick={() => {
                        addForm.setFieldsValue({ category: 'accident_time' });
                        setAddItemModal(true);
                      }}
                      size="small"
                    >
                      添加
                    </Button>
                  </div>
                  {[...structured.accident_time, ...structured.accident_description].length > 0 ? (
                    [...structured.accident_time, ...structured.accident_description].map(renderSummaryItem)
                  ) : (
                    <Empty description="未提取到事故信息" />
                  )}
                </div>

                <div className="summary-section">
                  <div className="summary-section-title">
                    <Space>
                      <FileTextOutlined style={{ color: '#1890ff' }} />
                      就诊时间
                    </Space>
                    <Button 
                      type="link" 
                      icon={<PlusOutlined />}
                      onClick={() => {
                        addForm.setFieldsValue({ category: 'visit_time' });
                        setAddItemModal(true);
                      }}
                      size="small"
                    >
                      添加
                    </Button>
                  </div>
                  {structured.visit_times.length > 0 ? (
                    structured.visit_times.map(renderSummaryItem)
                  ) : (
                    <Empty description="未提取到就诊时间" />
                  )}
                </div>
              </Col>

              <Col span={12}>
                <div className="summary-section">
                  <div className="summary-section-title">
                    <Space>
                      <FileTextOutlined style={{ color: '#52c41a' }} />
                      费用项目
                    </Space>
                    <Button 
                      type="link" 
                      icon={<PlusOutlined />}
                      onClick={() => {
                        addForm.setFieldsValue({ category: 'expense_item' });
                        setAddItemModal(true);
                      }}
                      size="small"
                    >
                      添加
                    </Button>
                  </div>
                  {structured.expense_items.length > 0 ? (
                    structured.expense_items.map(renderSummaryItem)
                  ) : (
                    <Empty description="未提取到费用项目" />
                  )}
                </div>

                <div className="summary-section">
                  <div className="summary-section-title">
                    <Space>
                      <FileTextOutlined style={{ color: '#52c41a' }} />
                      费用合计
                    </Space>
                    <Button 
                      type="link" 
                      icon={<PlusOutlined />}
                      onClick={() => {
                        addForm.setFieldsValue({ category: 'expense_total' });
                        setAddItemModal(true);
                      }}
                      size="small"
                    >
                      添加
                    </Button>
                  </div>
                  {structured.expense_totals.length > 0 ? (
                    structured.expense_totals.map(renderSummaryItem)
                  ) : (
                    <Empty description="未提取到费用合计" />
                  )}
                </div>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab={<span><WarningOutlined />冲突检测 ({unresolvedConflicts.length})</span>} key="2">
            {conflicts.length > 0 ? (
              conflicts.map(conflict => {
                const sev = severityMap[conflict.severity];
                return (
                  <div 
                    key={conflict.id}
                    className={`conflict-${conflict.severity}`}
                    style={{ 
                      padding: 16, 
                      marginBottom: 12, 
                      background: '#fff',
                      border: '1px solid #f0f0f0',
                      borderRadius: 4,
                      opacity: conflict.resolved ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Space style={{ marginBottom: 8 }}>
                          <Tag color={sev.color}>
                            {sev.icon} {sev.text}
                          </Tag>
                          <Tag>{conflict.conflict_type}</Tag>
                          {conflict.resolved && <Tag color="green"><CheckOutlined /> 已解决</Tag>}
                        </Space>
                        <Paragraph style={{ marginBottom: 4, fontSize: 15 }}>
                          {conflict.description}
                        </Paragraph>
                        {conflict.source_ref && (
                          <div className="source-ref">来源：{conflict.source_ref}</div>
                        )}
                      </div>
                      <Space>
                        {conflict.resolved ? (
                          <Button 
                            icon={<CloseOutlined />}
                            onClick={() => handleResolveConflict(conflict, false)}
                            size="small"
                          >
                            取消解决
                          </Button>
                        ) : (
                          <Button 
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => handleResolveConflict(conflict, true)}
                            size="small"
                          >
                            标记已解决
                          </Button>
                        )}
                      </Space>
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty description="未检测到冲突" />
            )}
          </TabPane>

          <TabPane tab={<span>缺失附件 ({missing_items.length})</span>} key="3">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setAddMissingModal(true)}
                size="small"
              >
                添加缺失项
              </Button>
            </div>
            {missing_items.length > 0 ? (
              <List
                dataSource={missing_items}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title="确定删除此项？"
                        onConfirm={() => handleDeleteMissing(item)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="link" danger size="small">删除</Button>
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        item.priority === 'required' 
                          ? <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                          : <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 20 }} />
                      }
                      title={
                        <Space>
                          <Input
                            value={item.item_name}
                            onChange={(e) => handleUpdateMissing(item, 'item_name', e.target.value)}
                            style={{ width: 200 }}
                            size="small"
                          />
                          <Select
                            value={item.priority}
                            onChange={(v) => handleUpdateMissing(item, 'priority', v)}
                            size="small"
                          >
                            <Option value="required">必备</Option>
                            <Option value="optional">可选</Option>
                          </Select>
                          <Tag color={item.priority === 'required' ? 'red' : 'blue'}>
                            {item.priority === 'required' ? '必备' : '可选'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Input
                          value={item.reason || ''}
                          onChange={(e) => handleUpdateMissing(item, 'reason', e.target.value)}
                          placeholder="补充说明原因..."
                          size="small"
                        />
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="材料齐全，无缺失" />
            )}
          </TabPane>

          <TabPane tab={<span>需要追问 ({follow_up_points.length})</span>} key="4">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setAddFollowupModal(true)}
                size="small"
              >
                添加追问点
              </Button>
            </div>
            {follow_up_points.length > 0 ? (
              <List
                dataSource={follow_up_points}
                renderItem={point => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title="确定删除此项？"
                        onConfirm={() => handleDeleteFollowup(point)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="link" danger size="small">删除</Button>
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <TextArea
                          value={point.question}
                          onChange={(e) => handleUpdateFollowup(point, 'question', e.target.value)}
                          rows={2}
                          size="small"
                        />
                      }
                      description={
                        <Input
                          value={point.reason || ''}
                          onChange={(e) => handleUpdateFollowup(point, 'reason', e.target.value)}
                          placeholder="原因说明..."
                          size="small"
                        />
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无需要追问的问题" />
            )}
          </TabPane>

          <TabPane tab={<span>改判记录 ({revisions.length})</span>} key="5">
            {revisions.length > 0 ? (
              revisions.map(rev => (
                <div key={rev.id} className="revision-history">
                  <Space style={{ marginBottom: 8 }}>
                    <Tag color="orange">{rev.field_name}</Tag>
                    <Tag>{rev.reason}</Tag>
                    <Text type="secondary">
                      {rev.reviser_name} · {dayjs(rev.revised_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </Space>
                  <div>
                    <Text delete type="danger">原值：{rev.old_value || '(空)'}</Text>
                  </div>
                  <div>
                    <Text type="success">新值：{rev.new_value || '(已删除)'}</Text>
                  </div>
                </div>
              ))
            ) : (
              <Empty description="暂无改判记录" />
            )}
          </TabPane>

          {isSupervisor() && (
            <TabPane tab={<span>主管审核 ({reviews.length})</span>} key="6">
              {reviews.length > 0 ? (
                reviews.map(review => {
                  const sev = severityMap[review.risk_level];
                  return (
                    <div key={review.id} style={{ padding: 16, background: '#fafafa', borderRadius: 4, marginBottom: 12 }}>
                      <Space style={{ marginBottom: 8 }}>
                        <Tag color={sev.color}>{sev.icon} {sev.text}</Tag>
                        {review.approved ? <Tag color="green"><CheckOutlined /> 已通过</Tag> : <Tag color="orange">待确认</Tag>}
                        <Text type="secondary">
                          {review.supervisor_name} · {dayjs(review.reviewed_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </Space>
                      {review.risk_notes && (
                        <Paragraph style={{ marginBottom: 0 }}>{review.risk_notes}</Paragraph>
                      )}
                    </div>
                  );
                })
              ) : (
                <Empty description="暂无审核记录" />
              )}
            </TabPane>
          )}
        </Tabs>
      </Card>

      <Modal
        title="编辑摘要项"
        open={editItemModal}
        onCancel={() => setEditItemModal(false)}
        onOk={handleSaveEdit}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            {categoryMap[editingItem?.category]?.label} - {editingItem?.key}
          </Text>
        </div>
        <Form layout="vertical">
          <Form.Item label="值">
            <TextArea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
              autoSize
            />
          </Form.Item>
          <Form.Item label="修改原因">
            <Input
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="请输入修改原因"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加摘要项"
        open={addItemModal}
        onCancel={() => setAddItemModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddItem}>
          <Form.Item
            label="分类"
            name="category"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select>
              <Option value="visit_time">就诊时间</Option>
              <Option value="accident_time">事故时间</Option>
              <Option value="accident_desc">事故描述</Option>
              <Option value="expense_item">费用项目</Option>
              <Option value="expense_total">费用合计</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="键名"
            name="key"
            rules={[{ required: true, message: '请输入键名' }]}
          >
            <Input placeholder="如：就诊日期、CT检查费等" />
          </Form.Item>
          <Form.Item
            label="值"
            name="value"
            rules={[{ required: true, message: '请输入值' }]}
          >
            <TextArea rows={3} placeholder="请输入值" />
          </Form.Item>
          <Form.Item
            label="来源"
            name="source_ref"
          >
            <Input placeholder="如：病历.pdf 第3行" />
          </Form.Item>
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setAddItemModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">添加</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加缺失项"
        open={addMissingModal}
        onCancel={() => setAddMissingModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={addForm2} layout="vertical" onFinish={handleAddMissing}>
          <Form.Item
            label="缺失材料名称"
            name="item_name"
            rules={[{ required: true, message: '请输入材料名称' }]}
          >
            <Input placeholder="如：诊断证明、费用明细等" />
          </Form.Item>
          <Form.Item
            label="原因说明"
            name="reason"
          >
            <Input placeholder="为什么需要这份材料" />
          </Form.Item>
          <Form.Item
            label="优先级"
            name="priority"
            initialValue="required"
          >
            <Select>
              <Option value="required">必备</Option>
              <Option value="optional">可选</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setAddMissingModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">添加</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加追问点"
        open={addFollowupModal}
        onCancel={() => setAddFollowupModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={addForm3} layout="vertical" onFinish={handleAddFollowup}>
          <Form.Item
            label="问题"
            name="question"
            rules={[{ required: true, message: '请输入问题' }]}
          >
            <TextArea rows={3} placeholder="需要向客户追问的问题" />
          </Form.Item>
          <Form.Item
            label="原因"
            name="reason"
          >
            <Input placeholder="为什么需要追问这个问题" />
          </Form.Item>
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setAddFollowupModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">添加</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={exportType === 'customer' ? '客户版补件通知' : '内部版审核报告'}
        open={exportModal}
        onCancel={() => setExportModal(false)}
        width={800}
        footer={
          <Space>
            <Button onClick={() => setExportModal(false)}>关闭</Button>
            <Button type="primary" icon={<ExportOutlined />} onClick={handleDownload}>
              下载文件
            </Button>
          </Space>
        }
      >
        {exportContent && (
          <div className="export-preview">{exportContent.content}</div>
        )}
      </Modal>
    </div>
  );
};

export default SummaryDetail;
