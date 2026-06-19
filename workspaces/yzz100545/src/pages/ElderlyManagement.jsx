import React, { useState, useEffect } from 'react'
import { Table, Button, Input, Space, Modal, Form, InputNumber, Select, message, Popconfirm, Tag, Card, Row, Col, Statistic } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons'
import api from '../api.js'
const { Option } = Select

export default function ElderlyManagement() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()
  const [balanceModalVisible, setBalanceModalVisible] = useState(false)
  const [balanceDetail, setBalanceDetail] = useState(null)
  const [selectedElderly, setSelectedElderly] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await api.getElderly()
      setData(result)
    } catch (e) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearch = async () => {
    if (!searchText.trim()) {
      loadData()
      return
    }
    setLoading(true)
    try {
      const result = await api.searchElderly(searchText.trim())
      setData(result)
    } catch (e) {
      message.error('搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    form.setFieldsValue(item)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteElderly(id)
      message.success('删除成功')
      loadData()
    } catch (e) {
      message.error('删除失败：' + e.message)
    }
  }

  const handleSubmit = async (values) => {
    try {
      if (editingItem) {
        await api.updateElderly(editingItem.id, values)
        message.success('更新成功')
      } else {
        await api.addElderly(values)
        message.success('添加成功')
      }
      setModalVisible(false)
      loadData()
    } catch (e) {
      message.error('保存失败：' + e.message)
    }
  }

  const showBalance = async (elderly) => {
    try {
      const balance = await api.getElderlyBalance(elderly.id)
      setSelectedElderly(elderly)
      setBalanceDetail(balance)
      setBalanceModalVisible(true)
    } catch (e) {
      message.error('获取余额失败')
    }
  }

  const columns = [
    { title: '姓名', dataIndex: 'name', width: 100, render: v => <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{v}</Tag> },
    { title: '性别', dataIndex: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', width: 60 },
    { title: '身份证号', dataIndex: 'id_card', width: 180 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '住址', dataIndex: 'address', ellipsis: true },
    { title: '紧急联系人', dataIndex: 'contact_person', width: 100 },
    { title: '联系电话', dataIndex: 'contact_phone', width: 130 },
    { title: '备注', dataIndex: 'notes', ellipsis: true, width: 120 },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => showBalance(record)}>查余额</Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除该老人吗？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索姓名/电话/身份证"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
          />
          <Button onClick={handleSearch} icon={<SearchOutlined />}>搜索</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加老人</Button>
          <Button onClick={loadData}>刷新</Button>
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 位老人` }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑老人信息' : '添加老人'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
                <Select placeholder="选择">
                  <Option value="男">男</Option>
                  <Option value="女">女</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="age" label="年龄">
                <InputNumber min={0} max={150} style={{ width: '100%' }} placeholder="年龄" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="id_card" label="身份证号">
                <Input placeholder="请输入身份证号" maxLength={18} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="联系电话">
                <Input placeholder="请输入电话" maxLength={11} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="住址">
            <Input placeholder="请输入住址" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact_person" label="紧急联系人">
                <Input placeholder="紧急联系人姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contact_phone" label="紧急联系电话">
                <Input placeholder="紧急联系电话" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedElderly ? `${selectedElderly.name} - 账户详情` : '账户详情'}
        open={balanceModalVisible}
        onCancel={() => setBalanceModalVisible(false)}
        footer={null}
        width={600}
      >
        {balanceDetail && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="剩余饭票" value={balanceDetail.available_tickets} suffix="张" />
                </Col>
                <Col span={8}>
                  <Statistic title="票面余额" value={balanceDetail.balance_amount} prefix="¥" precision={2} />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="赊账余额" 
                    value={balanceDetail.credit_balance} 
                    prefix="¥" 
                    precision={2} 
                    valueStyle={{ color: balanceDetail.credit_balance > 0 ? '#ff4d4f' : undefined }} 
                  />
                </Col>
              </Row>
            </Card>
            <h4 style={{ marginBottom: 12 }}>各票种余额</h4>
            {balanceDetail.tickets && balanceDetail.tickets.length > 0 ? (
              <Table
                size="small"
                dataSource={balanceDetail.tickets}
                rowKey="name"
                pagination={false}
                columns={[
                  { title: '票种', dataIndex: 'name' },
                  { title: '适用餐次', dataIndex: 'meal_type' },
                  { title: '剩余数量', dataIndex: 'count', render: v => <Tag color="blue">{v} 张</Tag> }
                ]}
              />
            ) : (
              <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无剩余饭票</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
