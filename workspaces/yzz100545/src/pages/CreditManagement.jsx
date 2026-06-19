import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Select, InputNumber, Button, Space, Table, Tag, message, Modal, Input, Alert, Form, Statistic, Popconfirm } from 'antd'
import { SearchOutlined, PlusOutlined, ArrowUpOutlined, ArrowDownOutlined, WarningOutlined, SettingOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api.js'
const { Option } = Select

export default function CreditManagement() {
  const [elderly, setElderly] = useState([])
  const [selectedElderly, setSelectedElderly] = useState(null)
  const [creditRecords, setCreditRecords] = useState([])
  const [allCredits, setAllCredits] = useState([])
  const [creditLimit, setCreditLimit] = useState(200)
  const [searchText, setSearchText] = useState('')
  const [repayModalVisible, setRepayModalVisible] = useState(false)
  const [limitModalVisible, setLimitModalVisible] = useState(false)
  const [balance, setBalance] = useState(null)
  const [form] = Form.useForm()

  const loadData = async () => {
    try {
      const [eld, limit] = await Promise.all([
        api.getElderly(),
        api.getCreditLimit()
      ])
      setElderly(eld)
      setCreditLimit(limit)
      const all = await api.getCredit()
      setAllCredits(all)
    } catch (e) {
      message.error('加载失败')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedElderly) {
      loadElderlyCredit(selectedElderly.id)
      loadBalance(selectedElderly.id)
    } else {
      setCreditRecords([])
      setBalance(null)
    }
  }, [selectedElderly])

  const loadElderlyCredit = async (elderlyId) => {
    try {
      const result = await api.getCredit(elderlyId)
      setCreditRecords(result)
    } catch (e) {
      message.error('加载赊账记录失败')
    }
  }

  const loadBalance = async (elderlyId) => {
    try {
      const result = await api.getElderlyBalance(elderlyId)
      setBalance(result)
    } catch (e) {
      console.error('加载余额失败', e)
    }
  }

  const handleSearch = async () => {
    if (!searchText.trim()) return
    try {
      const result = await api.searchElderly(searchText.trim())
      if (result.length === 0) {
        message.warning('未找到该老人')
        return
      }
      setSelectedElderly(result[0])
    } catch (e) {
      message.error('搜索失败')
    }
  }

  const handleSelectElderly = (elderlyId) => {
    const e = elderly.find(x => x.id === elderlyId)
    setSelectedElderly(e || null)
  }

  const handleRepay = async (values) => {
    try {
      const result = await api.repayCredit({
        elderly_id: selectedElderly.id,
        amount: values.amount,
        operator: values.operator || undefined,
        notes: values.notes
      })
      message.success(
        <span>
          <ArrowDownOutlined /> 还款成功！已还 ¥{result.repaid_amount.toFixed(2)}，
          剩余赊账 ¥{result.new_balance.toFixed(2)}
        </span>
      )
      setRepayModalVisible(false)
      form.resetFields()
      loadElderlyCredit(selectedElderly.id)
      loadBalance(selectedElderly.id)
      loadData()
    } catch (e) {
      message.error(e.message || '还款失败')
    }
  }

  const handleSetLimit = async (newLimit) => {
    try {
      await api.setCreditLimit(newLimit)
      setCreditLimit(newLimit)
      setLimitModalVisible(false)
      message.success('赊账限额已更新')
      loadData()
    } catch (e) {
      message.error('设置失败')
    }
  }

  const overLimitElderly = []
  const creditBalances = {}
  allCredits.forEach(c => {
    if (!creditBalances[c.elderly_id]) {
      creditBalances[c.elderly_id] = { name: c.elderly_name, balance: 0 }
    }
    creditBalances[c.elderly_id].balance += c.credit_type === 'borrow' ? c.amount : -c.amount
  })
  Object.entries(creditBalances).forEach(([id, data]) => {
    if (data.balance > creditLimit) {
      overLimitElderly.push({ id: parseInt(id), ...data })
    }
  })

  const typeMap = { borrow: '赊账', repay: '还款' }

  const columns = [
    { title: '时间', dataIndex: 'created_at', width: 160, render: t => t?.slice(0, 19) },
    { title: '类型', dataIndex: 'credit_type', width: 80, render: t => 
      <Tag color={t === 'borrow' ? 'red' : 'green'} icon={t === 'borrow' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
        {typeMap[t]}
      </Tag>
    },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v, r) => 
      r.credit_type === 'borrow' 
        ? <span style={{ color: '#ff4d4f' }}>+¥{v.toFixed(2)}</span> 
        : <span style={{ color: '#52c41a' }}>-¥{v.toFixed(2)}</span>
    },
    { title: '累计余额', dataIndex: 'balance', width: 120, render: v => 
      <strong style={{ color: v > 0 ? '#ff4d4f' : '#52c41a' }}>¥{v.toFixed(2)}</strong>
    },
    { title: '操作人', dataIndex: 'operator', width: 100, render: v => v || '-' },
    { title: '备注', dataIndex: 'notes' }
  ]

  const totalCredit = Object.values(creditBalances).reduce((s, d) => s + Math.max(0, d.balance), 0)
  const totalRepaid = allCredits.filter(c => c.credit_type === 'repay').reduce((s, c) => s + c.amount, 0)

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic 
              title="赊账总余额" 
              value={totalCredit} 
              prefix="¥" 
              precision={2}
              valueStyle={{ color: '#ff4d4f' }} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic 
              title="累计还款" 
              value={totalRepaid} 
              prefix="¥" 
              precision={2}
              valueStyle={{ color: '#52c41a' }} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card" 
            bordered={overLimitElderly.length > 0} 
            style={{ borderColor: overLimitElderly.length > 0 ? '#ff4d4f' : undefined }}
            extra={
              <Button size="small" icon={<SettingOutlined />} onClick={() => setLimitModalVisible(true)}>
                设置限额
              </Button>
            }
          >
            <Statistic 
              title={`赊账超限 (限额¥${creditLimit})`} 
              value={overLimitElderly.length} 
              suffix="人"
              valueStyle={{ color: overLimitElderly.length > 0 ? '#ff4d4f' : undefined }} 
            />
          </Card>
        </Col>
      </Row>

      {overLimitElderly.length > 0 && (
        <Alert
          message={
            <Space direction="vertical" style={{ width: '100%' }}>
              <span>以下老人赊账已超限，请及时催收：</span>
              <Space wrap>
                {overLimitElderly.map(e => (
                  <Tag key={e.id} color="red" style={{ fontSize: 14, padding: '4px 12px' }}>
                    <WarningOutlined /> {e.name} ¥{e.balance.toFixed(2)}
                  </Tag>
                ))}
              </Space>
            </Space>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="老人赊账明细" bordered>
            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
              <Input
                placeholder="输入老人姓名/电话快速搜索..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                size="large"
                prefix={<SearchOutlined />}
              />
              <Select
                style={{ minWidth: 300 }}
                showSearch
                placeholder="或从列表选择老人"
                value={selectedElderly?.id}
                onChange={handleSelectElderly}
                size="large"
              >
                {elderly.map(e => {
                  const bal = creditBalances[e.id]?.balance || 0
                  const over = bal > creditLimit
                  return (
                    <Option key={e.id} value={e.id}>
                      {e.name} {bal > 0 && `(欠¥${bal.toFixed(2)})`} {over && '⚠️'}
                    </Option>
                  )
                })}
              </Select>
            </Space.Compact>

            {selectedElderly && balance && (
              <Card size="small" style={{ marginBottom: 16, background: balance.credit_balance >= creditLimit ? '#fff1f0' : '#fff7e6' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic 
                      title="当前赊账余额" 
                      value={balance.credit_balance} 
                      prefix="¥" 
                      precision={2}
                      valueStyle={{ color: balance.credit_balance > 0 ? '#ff4d4f' : undefined }} 
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="赊账限额" 
                      value={creditLimit} 
                      prefix="¥" 
                      precision={2}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="剩余额度" 
                      value={Math.max(0, creditLimit - balance.credit_balance)} 
                      prefix="¥" 
                      precision={2}
                      valueStyle={{ color: creditLimit - balance.credit_balance < 0 ? '#ff4d4f' : '#52c41a' }} 
                    />
                  </Col>
                </Row>
                {balance.credit_balance > 0 && (
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <Button type="primary" icon={<ArrowDownOutlined />} onClick={() => setRepayModalVisible(true)}>
                      登记还款
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {selectedElderly && (
              <Table
                size="small"
                dataSource={creditRecords}
                rowKey="id"
                columns={columns}
                pagination={{ pageSize: 10 }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="赊账排行榜 (按余额)" size="small">
            <Table
              size="small"
              dataSource={
                Object.entries(creditBalances)
                  .map(([id, data]) => ({ id: parseInt(id), ...data }))
                  .filter(d => d.balance > 0)
                  .sort((a, b) => b.balance - a.balance)
                  .slice(0, 15)
              }
              rowKey="id"
              pagination={false}
              columns={[
                { title: '排名', width: 60, render: (_, __, idx) => idx + 1 },
                { title: '老人', dataIndex: 'name' },
                { 
                  title: '余额', 
                  dataIndex: 'balance', 
                  render: v => {
                    const over = v > creditLimit
                    return (
                      <Tag color={over ? 'red' : 'orange'}>
                        {over && <WarningOutlined />} ¥{v.toFixed(2)}
                      </Tag>
                    )
                  }
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={`${selectedElderly?.name} - 登记还款`}
        open={repayModalVisible}
        onCancel={() => setRepayModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleRepay}>
          <Form.Item name="amount" label="还款金额(元)" rules={[{ required: true }]}>
            <InputNumber
              min={0.01}
              max={balance?.credit_balance}
              step={1}
              precision={2}
              style={{ width: '100%' }}
              placeholder={`最多可还 ¥${balance?.credit_balance?.toFixed(2)}`}
            />
          </Form.Item>
          <Form.Item name="operator" label="操作人/收款人">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="还款备注" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认还款</Button>
              <Button onClick={() => setRepayModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="设置赊账限额"
        open={limitModalVisible}
        onCancel={() => setLimitModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" initialValues={{ limit: creditLimit }} onFinish={v => handleSetLimit(v.limit)}>
          <Form.Item name="limit" label="每位老人赊账限额(元)" rules={[{ required: true }]}>
            <InputNumber
              min={0}
              step={10}
              style={{ width: '100%' }}
              addonBefore="¥"
            />
          </Form.Item>
          <Alert
            message="修改限额后，超过新限额的老人赊账不会自动清零，但新的赊账会按新限额检查。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存设置</Button>
              <Button onClick={() => setLimitModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
