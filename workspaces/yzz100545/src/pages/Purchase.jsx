import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Select, InputNumber, Radio, Input, Button, Space, Table, Tag, message, Modal, Form, Alert, Divider, Statistic } from 'antd'
import { UserOutlined, SearchOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api.js'
const { Option } = Select

export default function Purchase() {
  const [elderly, setElderly] = useState([])
  const [ticketTypes, setTicketTypes] = useState([])
  const [subsidies, setSubsidies] = useState([])
  const [selectedElderly, setSelectedElderly] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [paymentType, setPaymentType] = useState('cash')
  const [selectedSubsidy, setSelectedSubsidy] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [isProxy, setIsProxy] = useState(false)
  const [proxyName, setProxyName] = useState('')
  const [operator, setOperator] = useState('')
  const [balance, setBalance] = useState(null)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [creditLimit, setCreditLimit] = useState(200)
  const [form] = Form.useForm()

  const loadData = async () => {
    try {
      const [eld, types, limit] = await Promise.all([
        api.getElderly(),
        api.getTicketTypes(),
        api.getCreditLimit()
      ])
      setElderly(eld)
      setTicketTypes(types)
      setCreditLimit(limit)
    } catch (e) {
      message.error('加载失败')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedElderly) {
      loadElderlyData(selectedElderly.id)
    } else {
      setSubsidies([])
      setBalance(null)
    }
  }, [selectedElderly])

  useEffect(() => {
    if (selectedElderly && paymentType === 'subsidy') {
      loadSubsidies(selectedElderly.id)
    } else {
      setSubsidies([])
    }
  }, [selectedElderly, paymentType, selectedTicket])

  const loadElderlyData = async (elderlyId) => {
    try {
      const [bal, trans] = await Promise.all([
        api.getElderlyBalance(elderlyId),
        api.getTransactions({ elderly_id: elderlyId, start_date: dayjs().subtract(7, 'day').format('YYYY-MM-DD') })
      ])
      setBalance(bal)
      setRecentTransactions(trans.slice(0, 10))
    } catch (e) {
      console.error('加载老人数据失败', e)
    }
  }

  const loadSubsidies = async (elderlyId) => {
    try {
      let subs = await api.getSubsidy(elderlyId)
      subs = subs.filter(s => !s.is_expired && s.remaining_quantity > 0)
      if (selectedTicket) {
        subs = subs.filter(s => s.ticket_type_id === selectedTicket)
      }
      setSubsidies(subs)
      if (subs.length > 0 && (!selectedSubsidy || !subs.find(s => s.id === selectedSubsidy))) {
        setSelectedSubsidy(subs[0].id)
      }
    } catch (e) {
      console.error('加载补贴失败', e)
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
    setSelectedSubsidy(null)
  }

  const handlePurchase = async () => {
    if (!selectedElderly) {
      message.warning('请先选择老人')
      return
    }
    if (!selectedTicket) {
      message.warning('请选择票种')
      return
    }
    if (paymentType === 'subsidy' && !selectedSubsidy) {
      message.warning('请选择使用的补贴')
      return
    }
    if (isProxy && !proxyName.trim()) {
      message.warning('请输入代买人姓名')
      return
    }

    const ticket = ticketTypes.find(t => t.id === selectedTicket)
    const totalAmount = ticket.price * quantity

    if (paymentType === 'credit' && balance) {
      const newCredit = balance.credit_balance + totalAmount
      if (newCredit > creditLimit) {
        Modal.confirm({
          title: '赊账超限警告',
          icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
          content: `当前赊账 ¥${balance.credit_balance.toFixed(2)}，本次 ¥${totalAmount.toFixed(2)}，累计 ¥${newCredit.toFixed(2)} > 限额 ¥${creditLimit.toFixed(2)}`,
          okText: '确认继续',
          cancelText: '取消',
          okType: 'danger',
          onOk: () => doPurchase()
        })
        return
      }
    }

    await doPurchase()
  }

  const doPurchase = async () => {
    try {
      const ticket = ticketTypes.find(t => t.id === selectedTicket)
      const result = await api.purchaseTicket({
        elderly_id: selectedElderly.id,
        ticket_type_id: selectedTicket,
        quantity,
        payment_type: paymentType,
        operator: operator || undefined,
        handler_name: isProxy ? proxyName.trim() : undefined,
        subsidy_id: paymentType === 'subsidy' ? selectedSubsidy : undefined,
        meal_type: ticket.meal_type
      })

      message.success(
        <span>
          <CheckCircleOutlined /> 购票成功！{selectedElderly.name} 购买 {quantity} 张 {ticket.name}，
          {paymentType === 'cash' ? `实收 ¥${result.total_amount.toFixed(2)}` : 
           paymentType === 'subsidy' ? '使用补贴支付' :
           paymentType === 'credit' ? `赊账 ¥${result.total_amount.toFixed(2)}` : ''}
        </span>
      )

      form.resetFields()
      setQuantity(1)
      setPaymentType('cash')
      setSelectedTicket(null)
      setSelectedSubsidy(null)
      setIsProxy(false)
      setProxyName('')
      loadElderlyData(selectedElderly.id)
      if (paymentType === 'subsidy') {
        loadSubsidies(selectedElderly.id)
      }
    } catch (e) {
      message.error(e.message || '购票失败')
    }
  }

  const selectedTicketInfo = ticketTypes.find(t => t.id === selectedTicket)
  const totalAmount = selectedTicketInfo ? (selectedTicketInfo.price * quantity).toFixed(2) : '0.00'

  const paymentTypeMap = { cash: '现金', subsidy: '补贴', credit: '赊账' }
  const typeMap = { purchase: '购票', redeem: '核销', refund: '退票' }

  return (
    <div>
      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card title="购票操作" bordered>
            <Form form={form} layout="vertical">
              <div style={{ marginBottom: 16 }}>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="输入老人姓名/电话快速搜索..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onPressEnter={handleSearch}
                    size="large"
                    prefix={<SearchOutlined />}
                  />
                  <Button type="primary" onClick={handleSearch} size="large">搜索</Button>
                </Space.Compact>
              </div>

              <Form.Item label="选择老人" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="选择或搜索老人"
                  value={selectedElderly?.id}
                  onChange={handleSelectElderly}
                  optionFilterProp="children"
                  size="large"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {elderly.map(e => (
                    <Option key={e.id} value={e.id}>
                      {e.name} ({e.gender} {e.age || ''}岁) {e.phone || ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedElderly && balance && (
                <Alert
                  style={{ marginBottom: 16 }}
                  message={
                    <Space size="large">
                      <span><UserOutlined /> {selectedElderly.name}</span>
                      <span>剩余饭票: <Tag color="blue">{balance.available_tickets}张</Tag></span>
                      <span>
                        赊账余额: 
                        <Tag color={balance.credit_balance > 0 ? 'red' : 'green'}>
                          ¥{balance.credit_balance.toFixed(2)}
                        </Tag>
                      </span>
                      {balance.credit_balance > 0 && balance.credit_balance >= creditLimit * 0.8 && (
                        <Tag color="orange" icon={<WarningOutlined />}>
                          赊账{balance.credit_balance >= creditLimit ? '已超限' : '即将超限'}
                        </Tag>
                      )}
                    </Space>
                  }
                  type={balance.credit_balance >= creditLimit ? 'error' : balance.credit_balance >= creditLimit * 0.8 ? 'warning' : 'info'}
                  showIcon
                />
              )}

              <Row gutter={16}>
                <Col span={14}>
                  <Form.Item label="选择票种" rules={[{ required: true }]}>
                    <Select
                      placeholder="选择票种"
                      value={selectedTicket}
                      onChange={val => { setSelectedTicket(val); setSelectedSubsidy(null) }}
                      size="large"
                    >
                      {ticketTypes.map(t => (
                        <Option key={t.id} value={t.id}>
                          {t.name} - ¥{t.price.toFixed(2)} ({t.meal_type})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item label="购买数量" rules={[{ required: true }]}>
                    <InputNumber
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={setQuantity}
                      size="large"
                      style={{ width: '100%' }}
                      addonAfter="张"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="支付方式">
                <Radio.Group value={paymentType} onChange={e => { setPaymentType(e.target.value); setSelectedSubsidy(null) }} size="large">
                  <Radio.Button value="cash">💵 现金</Radio.Button>
                  <Radio.Button value="subsidy">🎫 补贴</Radio.Button>
                  <Radio.Button value="credit">💳 赊账</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {paymentType === 'subsidy' && selectedElderly && (
                <Form.Item label="选择使用的补贴" rules={[{ required: true }]}>
                  {subsidies.length > 0 ? (
                    <Select
                      placeholder="选择补贴"
                      value={selectedSubsidy}
                      onChange={setSelectedSubsidy}
                      size="large"
                    >
                      {subsidies.map(s => (
                        <Option key={s.id} value={s.id}>
                          {s.ticket_type_name} 剩{s.remaining_quantity}张 (有效期至{s.valid_to})
                          {dayjs(s.valid_to).diff(dayjs(), 'day') <= 7 && ' ⚠️即将过期'}
                        </Option>
                      ))}
                    </Select>
                  ) : (
                    <Alert message="该老人无有效可用补贴" type="warning" showIcon />
                  )}
                </Form.Item>
              )}

              {paymentType === 'credit' && (
                <Alert
                  message={`赊账限额：¥${creditLimit.toFixed(2)}，${balance ? `当前已欠：¥${balance.credit_balance.toFixed(2)}` : ''}`}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Divider />

              <Form.Item label="代买设置">
                <Radio.Group value={isProxy} onChange={e => setIsProxy(e.target.value)}>
                  <Radio.Button value={false}>本人购买</Radio.Button>
                  <Radio.Button value={true}>志愿者/子女代买</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {isProxy && (
                <Form.Item label="代买人姓名" rules={[{ required: true }]}>
                  <Input
                    placeholder="请输入代买人姓名（志愿者或子女）"
                    value={proxyName}
                    onChange={e => setProxyName(e.target.value)}
                    size="large"
                  />
                </Form.Item>
              )}

              <Form.Item label="收银员/操作人">
                <Input
                  placeholder="选填，记录操作人"
                  value={operator}
                  onChange={e => setOperator(e.target.value)}
                  size="large"
                />
              </Form.Item>

              <Card size="small" style={{ marginBottom: 16, background: '#f6ffed' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="单价" value={selectedTicketInfo?.price || 0} prefix="¥" precision={2} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="数量" value={quantity} suffix="张" />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title={paymentType === 'subsidy' ? '补贴抵扣' : '应付金额'} 
                      value={totalAmount} 
                      prefix="¥" 
                      valueStyle={{ color: paymentType === 'subsidy' ? '#52c41a' : '#1677ff' }}
                    />
                  </Col>
                </Row>
              </Card>

              <Button 
                type="primary" 
                size="large" 
                block 
                onClick={handlePurchase}
                style={{ height: 50, fontSize: 18, fontWeight: 'bold' }}
              >
                确认出票 ({paymentTypeMap[paymentType]})
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          {selectedElderly && (
            <>
              <Card title={`${selectedElderly.name} - 近7天交易`} size="small" style={{ marginBottom: 16 }}>
                <Table
                  size="small"
                  dataSource={recentTransactions}
                  rowKey="id"
                  pagination={false}
                  scroll={{ y: 300 }}
                  columns={[
                    { title: '时间', dataIndex: 'created_at', width: 130, render: t => t?.slice(5, 16) },
                    { title: '类型', dataIndex: 'transaction_type', width: 60, render: t => 
                      <Tag color={t === 'purchase' ? 'blue' : t === 'redeem' ? 'green' : 'red'} size="small">{typeMap[t]}</Tag>
                    },
                    { title: '票种', dataIndex: 'ticket_type_name', width: 80 },
                    { title: '数量', dataIndex: 'quantity', width: 50 },
                    { title: '金额', dataIndex: 'total_amount', width: 80, render: (v, r) => 
                      r.transaction_type === 'refund' ? <span style={{ color: 'red' }}>-¥{Math.abs(v)}</span> : `¥${v}`
                    },
                    { title: '经手', dataIndex: 'handler_name', width: 70, render: v => v || '-' },
                  ]}
                />
              </Card>

              {balance && balance.tickets && balance.tickets.length > 0 && (
                <Card title="当前持有饭票" size="small">
                  <Row gutter={[8, 8]}>
                    {balance.tickets.map(t => (
                      <Col span={12} key={t.name}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, color: '#888' }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{t.meal_type}</div>
                          <Tag color="blue" style={{ fontSize: 16, marginTop: 4 }}>{t.count} 张</Tag>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              )}
            </>
          )}
        </Col>
      </Row>
    </div>
  )
}
