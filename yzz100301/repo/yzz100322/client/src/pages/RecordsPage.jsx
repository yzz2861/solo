import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Modal,
  Form,
  Input as AntInput,
  message,
  Drawer,
  Descriptions,
  Divider,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  EditOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
  ScheduleOutlined,
  UserOutlined,
  AuditOutlined,
  FilterOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request.js';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = AntInput;

function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [filters, setFilters] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [auditRecord, setAuditRecord] = useState(null);
  const [auditForm] = Form.useForm();
  const [stats, setStats] = useState(null);
  const [batchAuditing, setBatchAuditing] = useState(false);

  useEffect(() => {
    loadRecords();
    loadStats();
  }, [pagination.current, pagination.pageSize, filters]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters
      };

      const res = await request.get('/records', { params });
      if (res.success) {
        setRecords(res.data.list);
        setTotal(res.data.total);
      }
    } catch (err) {
      message.error('加载记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await request.get('/records/anomalies/summary');
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  const handleSearch = (values) => {
    const newFilters = {};
    if (values.keyword) newFilters.keyword = values.keyword;
    if (values.dateRange && values.dateRange.length === 2) {
      newFilters.startDate = values.dateRange[0].format('YYYY-MM-DD');
      newFilters.endDate = values.dateRange[1].format('YYYY-MM-DD');
    }
    if (values.hasReservation) newFilters.hasReservation = values.hasReservation;
    if (values.hasRecognition) newFilters.hasRecognition = values.hasRecognition;
    if (values.hasManualRelease) newFilters.hasManualRelease = values.hasManualRelease;
    if (values.plateMismatch) newFilters.plateMismatch = values.plateMismatch;
    if (values.overtime) newFilters.overtime = values.overtime;
    if (values.auditStatus) newFilters.auditStatus = values.auditStatus;
    if (values.releaseType) newFilters.releaseType = values.releaseType;

    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleViewDetail = async (record) => {
    try {
      const res = await request.get(`/records/${record.id}`);
      if (res.success) {
        setDetailRecord(res.data);
        setDetailVisible(true);
      }
    } catch (err) {
      message.error('加载详情失败');
    }
  };

  const handleAudit = (record) => {
    setAuditRecord(record);
    auditForm.setFieldsValue({
      audit_status: record.audit_status || 'pending',
      audit_opinion: record.audit_opinion || ''
    });
    setAuditModalVisible(true);
  };

  const handleAuditSubmit = async (values) => {
    if (!auditRecord) return;

    try {
      const res = await request.put(`/audit/${auditRecord.id}`, {
        audit_status: values.audit_status,
        audit_opinion: values.audit_opinion,
        auditor: '安保主管'
      });

      if (res.success) {
        message.success('复核意见已更新');
        setAuditModalVisible(false);
        loadRecords();
        loadStats();
      } else {
        message.error(res.error || '更新失败');
      }
    } catch (err) {
      message.error('更新失败: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBatchAudit = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要复核的记录');
      return;
    }

    Modal.confirm({
      title: '批量复核确认',
      content: `确定要将选中的 ${selectedRowKeys.length} 条记录标记为已复核吗？`,
      onOk: async () => {
        setBatchAuditing(true);
        try {
          const res = await request.post('/audit/batch', {
            ids: selectedRowKeys,
            audit_status: 'reviewed',
            audit_opinion: '批量复核通过',
            auditor: '安保主管'
          });

          if (res.success) {
            message.success(res.message);
            setSelectedRowKeys([]);
            loadRecords();
            loadStats();
          }
        } catch (err) {
          message.error('批量复核失败');
        } finally {
          setBatchAuditing(false);
        }
      }
    });
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const url = `/api/export/excel?${params.toString()}`;
    window.open(url, '_blank');
  };

  const getAuditStatusTag = (status) => {
    const map = {
      'pending': { color: 'default', text: '待复核' },
      'normal': { color: 'green', text: '正常放行' },
      'warning': { color: 'orange', text: '需关注' },
      'abnormal': { color: 'red', text: '异常放行' },
      'reviewed': { color: 'blue', text: '已复核' }
    };
    const cfg = map[status] || map['pending'];
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  const getReleaseTypeTag = (type) => {
    if (type === 'manual') return <Tag color="orange">人工放行</Tag>;
    if (type === 'auto') return <Tag color="green">自动放行</Tag>;
    return <Tag>未知</Tag>;
  };

  const columns = [
    {
      title: '车牌号',
      dataIndex: 'plate_number',
      key: 'plate_number',
      width: 120,
      render: (text) => <strong>{text || '-'}</strong>
    },
    {
      title: '预约号',
      dataIndex: 'reservation_no',
      key: 'reservation_no',
      width: 140,
      render: (text) => text || '-'
    },
    {
      title: '访客姓名',
      dataIndex: 'visitor_name',
      key: 'visitor_name',
      width: 100,
      render: (text) => text || '-'
    },
    {
      title: '来访日期',
      dataIndex: 'visit_date',
      key: 'visit_date',
      width: 110
    },
    {
      title: '放行时间',
      dataIndex: 'release_time',
      key: 'release_time',
      width: 160,
      render: (text, record) => text || record.recognize_time || '-'
    },
    {
      title: '放行方式',
      dataIndex: 'release_type',
      key: 'release_type',
      width: 100,
      render: (text) => getReleaseTypeTag(text)
    },
    {
      title: '门岗',
      dataIndex: 'gate',
      key: 'gate',
      width: 80
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
      render: (text) => text || '-'
    },
    {
      title: '状态',
      key: 'status',
      width: 200,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {record.has_reservation ? (
            <Tag icon={<ScheduleOutlined />} color="green">有预约</Tag>
          ) : (
            <Tag icon={<WarningOutlined />} color="red">无预约</Tag>
          )}
          {record.has_recognition ? (
            <Tag icon={<CarOutlined />} color="blue">有识别</Tag>
          ) : (
            <Tag icon={<CloseOutlined />} color="default">无识别</Tag>
          )}
          {record.has_manual_release && (
            <Tag icon={<UserOutlined />} color="orange">人工放</Tag>
          )}
          {!record.plate_matched && (
            <Tag icon={<ExclamationCircleOutlined />} color="warning">车牌不符</Tag>
          )}
          {record.is_overtime && (
            <Tag icon={<ClockCircleOutlined />} color="purple">超时</Tag>
          )}
        </Space>
      )
    },
    {
      title: '复核状态',
      dataIndex: 'audit_status',
      key: 'audit_status',
      width: 100,
      render: (text) => getAuditStatusTag(text)
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleAudit(record)}>
            复核
          </Button>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="总记录数" value={stats?.total || 0} valueStyle={{ fontSize: 20 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="无预约放行" value={stats?.noReservation || 0} valueStyle={{ color: '#ff4d4f', fontSize: 20 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="车牌识别不一致" value={stats?.plateMismatch || 0} valueStyle={{ color: '#fa8c16', fontSize: 20 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="待复核" value={stats?.pendingAudit || 0} valueStyle={{ color: '#faad14', fontSize: 20 }} />
          </Card>
        </Col>
      </Row>

      <Card className="filter-card">
        <FilterForm onSearch={handleSearch} onReset={handleReset} />
      </Card>

      <Card className="table-card">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button type="primary" icon={<AuditOutlined />} onClick={handleBatchAudit} loading={batchAuditing}>
              批量复核 ({selectedRowKeys.length})
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadRecords}>
              刷新
            </Button>
          </Space>
          <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>
            导出审计报告
          </Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize })
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      <Drawer
        title="访客记录详情"
        placement="right"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {detailRecord && (
          <div>
            <Descriptions title="基本信息" bordered column={1} size="small">
              <Descriptions.Item label="车牌号">
                <strong>{detailRecord.record.plate_number || '-'}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="预约号">{detailRecord.record.reservation_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="访客姓名">{detailRecord.record.visitor_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="来访日期">{detailRecord.record.visit_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="来访事由">{detailRecord.record.visit_purpose || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="预约信息" bordered column={1} size="small">
              {detailRecord.reservation ? (
                <>
                  <Descriptions.Item label="预计入场">{detailRecord.reservation.expected_start || '-'}</Descriptions.Item>
                  <Descriptions.Item label="预计离场">{detailRecord.reservation.expected_end || '-'}</Descriptions.Item>
                  <Descriptions.Item label="被访部门">{detailRecord.reservation.host_department || '-'}</Descriptions.Item>
                  <Descriptions.Item label="被访人">{detailRecord.reservation.host_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="访客电话">{detailRecord.reservation.visitor_phone || '-'}</Descriptions.Item>
                </>
              ) : (
                <Descriptions.Item label="状态">
                  <Tag color="red">无预约记录</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Descriptions title="识别信息" bordered column={1} size="small">
              {detailRecord.recognition ? (
                <>
                  <Descriptions.Item label="识别时间">{detailRecord.recognition.recognize_time || '-'}</Descriptions.Item>
                  <Descriptions.Item label="门岗">{detailRecord.recognition.gate || '-'}</Descriptions.Item>
                  <Descriptions.Item label="方向">{detailRecord.recognition.direction || '-'}</Descriptions.Item>
                  <Descriptions.Item label="置信度">
                    {detailRecord.recognition.confidence ? `${(detailRecord.recognition.confidence * 100).toFixed(1)}%` : '-'}
                  </Descriptions.Item>
                </>
              ) : (
                <Descriptions.Item label="状态">
                  <Tag color="default">无识别记录</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Descriptions title="放行信息" bordered column={1} size="small">
              {detailRecord.manualRelease ? (
                <>
                  <Descriptions.Item label="放行时间">{detailRecord.manualRelease.release_time || '-'}</Descriptions.Item>
                  <Descriptions.Item label="放行方式">
                    <Tag color="orange">人工放行</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="门岗">{detailRecord.manualRelease.gate || '-'}</Descriptions.Item>
                  <Descriptions.Item label="操作员">{detailRecord.manualRelease.operator || '-'}</Descriptions.Item>
                  <Descriptions.Item label="放行原因">{detailRecord.manualRelease.reason || '-'}</Descriptions.Item>
                </>
              ) : detailRecord.record.release_type === 'auto' ? (
                <>
                  <Descriptions.Item label="放行时间">{detailRecord.record.release_time || '-'}</Descriptions.Item>
                  <Descriptions.Item label="放行方式">
                    <Tag color="green">自动放行</Tag>
                  </Descriptions.Item>
                </>
              ) : (
                <Descriptions.Item label="状态">
                  <Tag color="default">无放行记录</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Descriptions title="复核信息" bordered column={1} size="small">
              <Descriptions.Item label="复核状态">
                {getAuditStatusTag(detailRecord.record.audit_status)}
              </Descriptions.Item>
              <Descriptions.Item label="复核意见">{detailRecord.record.audit_opinion || '暂无'}</Descriptions.Item>
              <Descriptions.Item label="复核时间">{detailRecord.record.audit_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="复核人">{detailRecord.record.auditor || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="异常标记" bordered column={1} size="small">
              <Descriptions.Item label="有无预约">
                {detailRecord.record.has_reservation ? (
                  <Tag color="green">有预约</Tag>
                ) : (
                  <Tag color="red">无预约</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="车牌一致">
                {detailRecord.record.plate_matched ? (
                  <Tag color="green">一致</Tag>
                ) : (
                  <Tag color="red">不一致</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="是否超时">
                {detailRecord.record.is_overtime ? (
                  <Tag color="purple">超时</Tag>
                ) : (
                  <Tag color="green">正常</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Button type="primary" icon={<EditOutlined />} onClick={() => {
                setDetailVisible(false);
                handleAudit(detailRecord.record);
              }}>
                填写复核意见
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title="复核意见"
        open={auditModalVisible}
        onCancel={() => setAuditModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={auditForm}
          layout="vertical"
          onFinish={handleAuditSubmit}
        >
          <Form.Item
            name="audit_status"
            label="复核状态"
            rules={[{ required: true, message: '请选择复核状态' }]}
          >
            <Select>
              <Option value="pending">待复核</Option>
              <Option value="normal">正常放行</Option>
              <Option value="warning">需关注</Option>
              <Option value="abnormal">异常放行</Option>
              <Option value="reviewed">已复核</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="audit_opinion"
            label="复核意见"
          >
            <TextArea rows={4} placeholder="请输入复核意见..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAuditModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认提交
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function FilterForm({ onSearch, onReset }) {
  const [form] = Form.useForm();

  const handleSearch = () => {
    form.validateFields().then(values => {
      onSearch(values);
    });
  };

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  return (
    <Form
      form={form}
      layout="inline"
      onFinish={handleSearch}
      style={{ rowGap: '8px' }}
    >
      <Form.Item name="keyword" label="关键词">
        <Input placeholder="车牌号/预约号/访客姓名" style={{ width: 200 }} allowClear />
      </Form.Item>
      <Form.Item name="dateRange" label="日期范围">
        <RangePicker />
      </Form.Item>
      <Form.Item name="hasReservation" label="预约状态">
        <Select placeholder="全部" style={{ width: 120 }} allowClear>
          <Option value="1">有预约</Option>
          <Option value="0">无预约</Option>
        </Select>
      </Form.Item>
      <Form.Item name="plateMismatch" label="车牌一致性">
        <Select placeholder="全部" style={{ width: 120 }} allowClear>
          <Option value="1">不一致</Option>
        </Select>
      </Form.Item>
      <Form.Item name="overtime" label="超时停留">
        <Select placeholder="全部" style={{ width: 120 }} allowClear>
          <Option value="1">超时</Option>
        </Select>
      </Form.Item>
      <Form.Item name="auditStatus" label="复核状态">
        <Select placeholder="全部" style={{ width: 120 }} allowClear>
          <Option value="pending">待复核</Option>
          <Option value="normal">正常放行</Option>
          <Option value="warning">需关注</Option>
          <Option value="abnormal">异常放行</Option>
          <Option value="reviewed">已复核</Option>
        </Select>
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            查询
          </Button>
          <Button onClick={handleReset} icon={<ReloadOutlined />}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

export default RecordsPage;
