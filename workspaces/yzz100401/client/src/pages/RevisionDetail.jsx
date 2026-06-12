import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Row,
  Col,
  List,
  Modal,
  Form,
  Select,
  Input,
  Descriptions,
  Divider,
  Alert
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { supervisorAPI } from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const severityMap = {
  high: { color: 'red', icon: <ExclamationCircleOutlined />, text: '高风险' },
  medium: { color: 'orange', icon: <WarningOutlined />, text: '中风险' },
  low: { color: 'blue', icon: <InfoCircleOutlined />, text: '低风险' }
};

const RevisionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await supervisorAPI.getRevision(id);
      setSummaryData(res.data);
    } catch (err) {
      message.error('获取详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleReview = async (values) => {
    try {
      await supervisorAPI.review(id, values);
      message.success('审核意见已提交');
      setReviewModalVisible(false);
      form.resetFields();
      loadDetail();
    } catch (err) {
      message.error('提交失败');
    }
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/revisions')}>
          返回列表
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

      <Card 
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              改判审核 - <Tag color="blue">{summary.claim_no}</Tag>
            </Title>
            <Tag color="orange"><EditOutlined /> 含人工改判</Tag>
            {summary.status === 'reviewed' && <Tag color="green"><CheckOutlined /> 已审核</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<SafetyOutlined />}
              onClick={() => setReviewModalVisible(true)}
            >
              提交审核意见
            </Button>
          </Space>
        }
        loading={loading}
      >
        <Descriptions column={4} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="客户姓名">{summary.customer_name}</Descriptions.Item>
          <Descriptions.Item label="事故日期">{summary.accident_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="生成人（理赔员）">{summary.generator_name}</Descriptions.Item>
          <Descriptions.Item label="改判次数">{revisions.length} 次</Descriptions.Item>
        </Descriptions>

        <Divider orientation="left">关键信息</Divider>
        
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="事故信息" size="small">
              {[...structured.accident_time, ...structured.accident_description].map(item => (
                <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <Text strong>{item.key}：</Text>
                    {item.value}
                    {item.is_manual && <Tag color="gold" style={{ marginLeft: 8 }}>人工改判</Tag>}
                  </div>
                  <div className="source-ref">来源：{item.source_ref}</div>
                </div>
              ))}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="费用信息" size="small">
              {[...structured.expense_items, ...structured.expense_totals].map(item => (
                <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <Text strong>{item.key}：</Text>
                    {item.value}
                    {item.is_manual && <Tag color="gold" style={{ marginLeft: 8 }}>人工改判</Tag>}
                  </div>
                  <div className="source-ref">来源：{item.source_ref}</div>
                </div>
              ))}
            </Card>
          </Col>
        </Row>

        <Divider orientation="left">未解决冲突 ({unresolvedConflicts.length})</Divider>
        
        {unresolvedConflicts.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            {unresolvedConflicts.map(conflict => {
              const sev = severityMap[conflict.severity];
              return (
                <div 
                  key={conflict.id}
                  className={`conflict-${conflict.severity}`}
                  style={{ 
                    padding: 12, 
                    marginBottom: 8, 
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderRadius: 4
                  }}
                >
                  <Space style={{ marginBottom: 4 }}>
                    <Tag color={sev.color}>{sev.icon} {sev.text}</Tag>
                    <Tag>{conflict.conflict_type}</Tag>
                  </Space>
                  <Paragraph style={{ marginBottom: 0 }}>{conflict.description}</Paragraph>
                  {conflict.source_ref && (
                    <div className="source-ref">来源：{conflict.source_ref}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Alert message="所有冲突已解决" type="success" showIcon style={{ marginBottom: 24 }} />
        )}

        <Divider orientation="left">改判记录</Divider>
        
        {revisions.length > 0 ? (
          <List
            dataSource={revisions}
            renderItem={rev => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color="orange">{rev.field_name}</Tag>
                      <Tag>{rev.reason}</Tag>
                      <Text type="secondary">
                        {rev.reviser_name} · {dayjs(rev.revised_at).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </Space>
                  }
                  description={
                    <div>
                      <div>
                        <Text delete type="danger">原值：{rev.old_value || '(空)'}</Text>
                      </div>
                      <div>
                        <Text type="success">新值：{rev.new_value || '(已删除)'}</Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: '#8c8c8c' }}>
            暂无改判记录
          </div>
        )}

        {reviews.length > 0 && (
          <>
            <Divider orientation="left">审核记录</Divider>
            {reviews.map(review => {
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
            })}
          </>
        )}
      </Card>

      <Modal
        title="提交审核意见"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Alert
          message="请仔细核对人工改判内容，确认是否存在拒赔风险"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={handleReview}>
          <Form.Item
            label="风险等级"
            name="risk_level"
            rules={[{ required: true, message: '请选择风险等级' }]}
          >
            <Select>
              <Option value="high">高风险 - 存在明显拒赔风险，需重点关注</Option>
              <Option value="medium">中风险 - 存在疑点，需进一步核实</Option>
              <Option value="low">低风险 - 改判合理，无明显风险</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="风险说明"
            name="risk_notes"
            rules={[{ required: true, message: '请输入风险说明' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="请详细说明风险点或审核意见，特别关注是否存在既往症、第三方责任、保险欺诈等拒赔风险..."
            />
          </Form.Item>
          <Form.Item
            label="审核结论"
            name="approved"
            rules={[{ required: true, message: '请选择审核结论' }]}
          >
            <Select>
              <Option value={1}>通过 - 改判合理，可继续理赔流程</Option>
              <Option value={0}>待确认 - 需要理赔员补充说明或修改</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setReviewModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">提交</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RevisionDetail;
