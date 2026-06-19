import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Tabs, Tag, Card, DatePicker, Alert, Popconfirm, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api.js'
const { Option } = Select

export default function TicketManagement({ onAlertsChange }) {
  const [ticketTypes, setTicketTypes] = useState([])
  const [subsidies, setSubsidies] = useState([])
  const [elderly, setElderly] = useState([])
  const [loading, setLoading] = useState(false)
  const [ticketModalVisible, setTicketModalVisible] = useState(false)
  const [subsidyModalVisible, setSubsidyModalVisible] = useState(false)
  const [editingTicket, setEditingTicket] = useState(null)
  const [ticketForm] = Form.useForm()
  const [subsidyForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('tickets')

  const loadData = async () => {
    setLoading(true)
    try {
      const [types, subs, eld] = await Promise.all([
        api.getTicketTypes(),
        api.getSubsidy(),
        api.getElderly()
      ])
      setTicketTypes(types)
      setSubsidies(subs)
      setElderly(eld)
      if (onAlertsChange) onAlertsChange()
    } catch (e) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddTicket = () => {
    setEditingTicket(null)
    ticketForm.resetFields()
    ticketForm.setFieldsValue({ is_active: true })
    setTicketModalVisible(true)
  }

  const handleEditTicket = (item) => {
    setEditingTicket(item)
    ticketForm.setFieldsValue(item)
    setTicketModalVisible(true)
  }

  const handleDeleteTicket = async (id) => {
    try {
      await api.deleteTicketType(id)
      message.success('已停用')
      loadData()
    } catch (e) {
      message.error('操作失败')
    }
  }

  const handleTicketSubmit = async (values) => {
    try {
      if (editingTicket) {
        await api.updateTicketType(editingTicket.id, values)
        message.success('更新成功')
      } else {
        await api.addTicketType(values)
        message.success('添加成功')
      }
      setTicketModalVisible(false)
      loadData()
    } catch (e) {
      message.error('保存失败')
    }
  }

  const handleAddSubsidy = () => {
    subsidyForm.resetFields()
    subsidyForm.setFieldsValue({
      subsidy_type: '民政补贴',
      valid_from: dayjs(),
      valid_to: dayjs().add(1, 'month')
    })
    setSubsidyModalVisible(true)
  }

  const checkSubsidyConflict = async (values) => {
    if (!values.elderly_id || !values.ticket_type_id || !values.valid_from || !values.valid_to) return
    try {
      const result = await api.checkSubsidyConflict(
        values.elderly_id,
        values.ticket_type_id,
        values.valid_from.format('YYYY-MM-DD'),
        values.valid_to.format('YYYY-MM-DD')
      )
      if (result.hasConflict) {
        message.warning('该老人在此时间段内已有同类型有效补贴！')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubsidySubmit = async (values) => {
    const formatted = {
      ...values,
      valid_from: values.valid_from.format('YYYY-MM-DD'),
      valid_to: values.valid_to.format('YYYY-MM-DD')
    }
    
    const conflict = await api.checkSubsidyConflict(
      formatted.elderly_id,
      formatted.ticket_type_id,
      formatted.valid_from,
      formatted.valid_to
    )
    if (conflict.hasConflict) {
      Modal.confirm({
        title: '检测到重复补贴',
        icon: <WarningOutlined style={{ color: '#faad14' }} />,
        content: '该老人在此时间段内已有同类型有效补贴，是否仍要添加？',
        okText: '继续添加',
        cancelText: '取消',
        okType: 'warning',
        onOk: async () => {
          await doAddSubsidy(formatted)
        }
      })
    } else {
      await doAddSubsidy(formatted)
    }
  }

  const doAddSubsidy = async (formatted) => {
    try {
      await api.addSubsidy(formatted)
      message.success('补贴添加成功')
      setSubsidyModalVisible(false)
      loadData()
    } catch (e) {
      message.error('添加失败：' + e.message)
    }
  }

  const ticketColumns = [
    { title: '票种名称', dataIndex: 'name', width: 150, render: v => <strong>{v}</strong> },
    { title: '价格', dataIndex: 'price', width: 100, render: v => `¥${v.toFixed(2)}` },
    { title: '适用餐次', dataIndex: 'meal_type', width: 100, render: v => <Tag color="blue">{v}</Tag> },
    { title: '说明', dataIndex: 'description' },
    { title: '状态', dataIndex: 'is_active', width: 80, render: v => v ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag> },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => handleEditTicket(record)}>编辑</Button>
          <Popconfirm title="确认停用该票种吗？" onConfirm={() => handleDeleteTicket(record.id)}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>停用</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const subsidyColumns = [
    { 
      title: '状态', 
      dataIndex: 'is_expired', 
      width: 80, 
      render: (v, r) => {
        if (v) return <Tag color="red" icon={<ClockCircleOutlined />}>已过期</Tag>
        if (r.remaining_quantity <= 0) return <Tag color="default">已用完</Tag>
        if (dayjs(r.valid_to).diff(dayjs(), 'day') <= 7) return <Tag color="orange" icon={<WarningOutlined />}>即将过期</Tag>
        return <Tag color="green" icon={<CheckCircleOutlined />}>有效</Tag>
      }
    },
    { title: '老人姓名', dataIndex: 'elderly_name', width: 100 },
    { title: '票种', dataIndex: 'ticket_type_name', width: 120 },
    { title: '补贴类型', dataIndex: 'subsidy_type', width: 100, render: v => <Tag color="purple">{v}</Tag> },
    { title: '总数量', dataIndex: 'quantity', width: 80 },
    { title: '已用', dataIndex: 'used_quantity', width: 80 },
    { title: '剩余', dataIndex: 'remaining_quantity', width: 80, render: v => <strong style={{ color: v > 0 ? '#52c41a' : '#999' }}>{v}</strong> },
    { title: '有效期', width: 220, render: (_, r) => `${r.valid_from} ~ ${r.valid_to}` },
    { title: '备注', dataIndex: 'notes', ellipsis: true }
  ]

  const expiredCount = subsidies.filter(s => s.is_expired && s.remaining_quantity > 0).length
  const expiringCount = subsidies.filter(s => !s.is_expired && s.remaining_quantity > 0 && dayjs(s.valid_to).diff(dayjs(), 'day') <= 7).length

  const tabItems = [
    {
      key: 'tickets',
      label: '票种管理',
      children: (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTicket}>添加票种</Button>
              <Button onClick={loadData}>刷新</Button>
            </Space>
          </Card>
          <Card>
            <Table
              rowKey="id"
              loading={loading}
              dataSource={ticketTypes}
              columns={ticketColumns}
              pagination={false}
            />
          </Card>
        </>
      )
    },
    {
      key: 'subsidy',
      label: '补贴资格',
      children: (
        <>
          {(expiredCount > 0 || expiringCount > 0) && (
            <Alert
              message={`有 ${expiredCount} 项补贴已过期，${expiringCount} 项补贴将在7天内过期，请及时处理！`}
              type={expiredCount > 0 ? 'error' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSubsidy}>添加补贴</Button>
              <Button onClick={loadData}>刷新</Button>
            </Space>
          </Card>
          <Card>
            <Table
              rowKey="id"
              loading={loading}
              dataSource={subsidies}
              columns={subsidyColumns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
            />
          </Card>
        </>
      )
    }
  ]

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Modal
        title={editingTicket ? '编辑票种' : '添加票种'}
        open={ticketModalVisible}
        onCancel={() => setTicketModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={ticketForm} layout="vertical" onFinish={handleTicketSubmit}>
          <Form.Item name="name" label="票种名称" rules={[{ required: true }]}>
            <Input placeholder="如：午餐票" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label="价格(元)" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="meal_type" label="适用餐次" rules={[{ required: true }]}>
                <Select placeholder="选择餐次">
                  <Option value="早餐">早餐</Option>
                  <Option value="午餐">午餐</Option>
                  <Option value="晚餐">晚餐</Option>
                  <Option value="通用">通用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} placeholder="票种说明" />
          </Form.Item>
          <Form.Item name="is_active" label="启用状态" valuePropName="checked">
            <Select>
              <Option value={1}>启用</Option>
              <Option value={0}>停用</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setTicketModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加补贴"
        open={subsidyModalVisible}
        onCancel={() => setSubsidyModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form form={subsidyForm} layout="vertical" onFinish={handleSubsidySubmit} onValuesChange={checkSubsidyConflict}>
          <Form.Item name="elderly_id" label="老人" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="选择老人"
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {elderly.map(e => (
                <Option key={e.id} value={e.id}>{e.name} ({e.gender} {e.age || ''}岁)</Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ticket_type_id" label="票种" rules={[{ required: true }]}>
                <Select placeholder="选择票种">
                  {ticketTypes.map(t => (
                    <Option key={t.id} value={t.id}>{t.name} (¥{t.price})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quantity" label="数量(张)" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="补贴数量" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="valid_from" label="有效期开始" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="valid_to" label="有效期结束" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="subsidy_type" label="补贴类型">
            <Select>
              <Option value="民政补贴">民政补贴</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setSubsidyModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
