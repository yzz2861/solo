import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Select, InputNumber, Button, Space, Table, Tag, message, Modal, Input, Alert, Tabs, Radio, Popconfirm, Statistic } from 'antd'
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api.js'
const { Option } = Select

export default function Redeem() {
  const [activeTab, setActiveTab] = useState('redeem')
  const [elderly, setElderly] = useState([])
  const [selectedElderly, setSelectedElderly] = useState(null)
  const [unredeemed, setUnredeemed] = useState([])
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [redeemQuantity, setRedeemQuantity] = useState(1)
  const [mealType, setMealType] = useState('午餐')
  const [mealDate, setMealDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [operator, setOperator] = useState('')
  const [searchText, setSearchText] = useState('')
  const [refundSearchText, setRefundSearchText] = useState('')
  const [refundTransactions, setRefundTransactions] = useState([])
  const [refundSelected, setRefundSelected] = useState(null)
  const [balance, setBalance] = useState(null)

  const loadElderly = async () => {
    try {
      const result = await api.getElderly()
      setElderly(result)
    } catch (e) {
      message.error('加载失败')
    }
  }

  useEffect(() => {
    loadElderly()
  }, [])

  useEffect(() => {
    if (selectedElderly && activeTab === 'redeem') {
      loadUnredeemed(selectedElderly.id)
      loadBalance(selectedElderly.id)
    } else if (selectedElderly && activeTab === 'refund') {
      loadRefundable(selectedElderly.id)
      loadBalance(selectedElderly.id)
    }
  }, [selectedElderly, activeTab])

  const loadUnredeemed = async (elderlyId) => {
    try {
      const result = await api.getUnredeemedTickets(elderlyId)
      setUnredeemed(result)
      setSelectedTransaction(null)
      setRedeemQuantity(1)
    } catch (e) {
      message.error('加载未核销票失败')
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

  const loadRefundable = async (elderlyId) => {
    try {
      const [purchases, allTrans] = await Promise.all([
        api.getUnredeemedTickets(elderlyId),
        api.getTransactions({ elderly_id: elderlyId, type: 'purchase' })
      ])
      const refundMap = {}
      allTrans.forEach(t => {
        if (t.transaction_type === 'purchase' && (t.status === 'active' || t.status === 'redeemed')) {
          refundMap[t.id] = { ...t }
        }
      })
      purchases.forEach(p => {
        if (refundMap[p.id]) {
          refundMap[p.id].remaining_quantity = p.remaining_quantity
        }
      })
      const refundable = Object.values(refundMap).map(t => ({
        ...t,
        remaining_quantity: t.remaining_quantity !== undefined ? t.remaining_quantity :
          (t.status === 'active' ? t.quantity : 0)
      }))
      setRefundTransactions(refundable)
    } catch (e) {
      message.error('加载可退票记录失败')
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

  const handleRefundSearch = async () => {
    if (!refundSearchText.trim()) return
    try {
      const result = await api.searchElderly(refundSearchText.trim())
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

  const handleRedeem = async () => {
    if (!selectedElderly) {
      message.warning('请先选择老人')
      return
    }
    if (!selectedTransaction) {
      message.warning('请选择要核销的购票记录')
      return
    }

    const purchase = unredeemed.find(u => u.id === selectedTransaction)
    if (!purchase) return

    if (purchase.meal_type !== '通用' && purchase.meal_type !== mealType) {
      Modal.confirm({
        title: '餐次不匹配警告',
        icon: <WarningOutlined style={{ color: '#faad14' }} />,
        content: `${purchase.ticket_type_name} 仅限 ${purchase.meal_type} 使用，当前核销餐次为 ${mealType}，确认继续？`,
        okText: '确认核销',
        cancelText: '取消',
        okType: 'warning',
        onOk: () => doRedeem()
      })
      return
    }

    await doRedeem()
  }

  const doRedeem = async () => {
    try {
      await api.redeemTicket({
        transaction_id: selectedTransaction,
        quantity: redeemQuantity,
        meal_type: mealType,
        meal_date: mealDate,
        operator: operator || undefined
      })

      message.success(
        <span>
          <CheckCircleOutlined /> 核销成功！{selectedElderly.name} 核销 {redeemQuantity} 张
        </span>
      )

      loadUnredeemed(selectedElderly.id)
      loadBalance(selectedElderly.id)
      setRedeemQuantity(1)
      setSelectedTransaction(null)
    } catch (e) {
      message.error(e.message || '核销失败')
    }
  }

  const handleQuickRedeem = async (transaction) => {
    if (transaction.meal_type !== '通用' && transaction.meal_type !== mealType) {
      Modal.confirm({
        title: '餐次不匹配',
        icon: <WarningOutlined />,
        content: `${transaction.ticket_type_name}(${transaction.meal_type}) 不能用于${mealType}，是否改为${transaction.meal_type}核销？`,
        okText: '使用票种餐次',
        cancelText: '取消',
        onOk: async () => {
          try {
            await api.redeemTicket({
              transaction_id: transaction.id,
              quantity: 1,
              meal_type: transaction.meal_type,
              meal_date: mealDate,
              operator: operator || undefined
            })
            message.success('核销成功！')
            loadUnredeemed(selectedElderly.id)
            loadBalance(selectedElderly.id)
          } catch (e) {
            message.error(e.message)
          }
        }
      })
      return
    }

    try {
      await api.redeemTicket({
        transaction_id: transaction.id,
        quantity: 1,
        meal_type: mealType,
        meal_date: mealDate,
        operator: operator || undefined
      })
      message.success(`核销成功：${transaction.ticket_type_name} × 1`)
      loadUnredeemed(selectedElderly.id)
      loadBalance(selectedElderly.id)
    } catch (e) {
      message.error(e.message)
    }
  }

  const handleRefund = async (transaction, reason) => {
    Modal.confirm({
      title: '确认退票',
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>老人：{selectedElderly.name}</p>
          <p>票种：{transaction.ticket_type_name}</p>
          <p>购票数量：{transaction.quantity}张</p>
          <p>已核销：{transaction.quantity - transaction.remaining_quantity}张</p>
          <p style={{ color: '#faad14' }}>⚠️ 只能退未核销的 {transaction.remaining_quantity} 张</p>
        </div>
      ),
      okText: '确认退票',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await api.refundTicket(transaction.id, reason)
          message.success(
            <span>
              退票成功！退回 {result.refund_quantity} 张，退款 ¥{result.refund_amount.toFixed(2)}
              {transaction.payment_type === 'credit' && '（已冲抵赊账）'}
            </span>
          )
          loadRefundable(selectedElderly.id)
          loadBalance(selectedElderly.id)
        } catch (e) {
          message.error(e.message || '退票失败')
        }
      }
    })
  }

  const getCurrentMealType = () => {
    const hour = dayjs().hour()
    if (hour < 10) return '早餐'
    if (hour < 16) return '午餐'
    return '晚餐'
  }

  useEffect(() => {
    setMealType(getCurrentMealType())
  }, [])

  const paymentTypeMap = { cash: '现金', subsidy: '补贴', credit: '赊账' }

  const redeemColumns = [
    { title: '购票时间', dataIndex: 'created_at', width: 150, render: t => t?.slice(0, 16) },
    { title: '票种', dataIndex: 'ticket_type_name', width: 120 },
    { title: '餐次限制', dataIndex: 'meal_type', width: 90, render: m => 
      <Tag color={m === '通用' ? 'green' : 'blue'}>{m}</Tag>
    },
    { title: '原价', dataIndex: 'price', width: 80, render: v => `¥${v.toFixed(2)}` },
    { title: '购票数量', dataIndex: 'quantity', width: 80 },
    { title: '剩余数量', dataIndex: 'remaining_quantity', width: 80, render: v => <strong style={{ color: '#52c41a' }}>{v}</strong> },
    { title: '支付方式', dataIndex: 'payment_type', width: 80, render: p => 
      <Tag color={p === 'cash' ? 'green' : p === 'subsidy' ? 'blue' : 'orange'}>{paymentTypeMap[p]}</Tag>
    },
    {
      title: '快速核销',
      width: 100,
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<CheckCircleOutlined />}
          onClick={() => handleQuickRedeem(record)}
          disabled={record.remaining_quantity <= 0}
        >
          核销1张
        </Button>
      )
    }
  ]

  const refundColumns = [
    { title: '购票时间', dataIndex: 'created_at', width: 150, render: t => t?.slice(0, 16) },
    { title: '票种', dataIndex: 'ticket_type_name', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 70 },
    { title: '已核销', dataIndex: 'quantity', width: 70, render: (v, r) => v - r.remaining_quantity },
    { title: '可退数量', dataIndex: 'remaining_quantity', width: 80, render: v => 
      <strong style={{ color: v > 0 ? '#52c41a' : '#999' }}>{v}</strong>
    },
    { title: '金额', dataIndex: 'total_amount', width: 100, render: v => `¥${v.toFixed(2)}` },
    { title: '支付方式', dataIndex: 'payment_type', width: 80, render: p => 
      <Tag color={p === 'cash' ? 'green' : p === 'subsidy' ? 'blue' : 'orange'}>{paymentTypeMap[p]}</Tag>
    },
    { title: '状态', dataIndex: 'status', width: 80, render: s => 
      <Tag color={s === 'active' ? 'green' : s === 'redeemed' ? 'blue' : s === 'refunded' ? 'gray' : 'red'}>
        {s === 'active' ? '使用中' : s === 'redeemed' ? '已用完' : s === 'refunded' ? '已退票' : s}
      </Tag>
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="退票原因"
          description={<Input.TextArea id="refundReason" placeholder="请输入退票原因" rows={2} />}
          onConfirm={() => {
            const reason = document.getElementById('refundReason')?.value || '用户退票'
            handleRefund(record, reason)
          }}
          okText="确认退票"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          disabled={record.remaining_quantity <= 0 || record.status === 'refunded'}
        >
          <Button 
            size="small" 
            danger 
            icon={<CloseCircleOutlined />}
            disabled={record.remaining_quantity <= 0 || record.status === 'refunded'}
          >
            退票
          </Button>
        </Popconfirm>
      )
    }
  ]

  const tabItems = [
    {
      key: 'redeem',
      label: '🎫 饭票核销',
      children: (
        <Row gutter={24}>
          <Col xs={24} lg={16}>
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
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {elderly.map(e => (
                  <Option key={e.id} value={e.id}>
                    {e.name} ({e.gender} {e.age || ''}岁)
                  </Option>
                ))}
              </Select>
            </Space.Compact>

            {selectedElderly && (
              <Card 
                size="small" 
                style={{ marginBottom: 16, background: '#f0f5ff' }}
                title={
                  <Space>
                    <span style={{ fontSize: 16, fontWeight: 'bold' }}>{selectedElderly.name}</span>
                    {balance && (
                      <>
                        <Tag color="blue">剩余 {balance.available_tickets} 张</Tag>
                        {balance.credit_balance > 0 && (
                          <Tag color="red">赊账 ¥{balance.credit_balance.toFixed(2)}</Tag>
                        )}
                      </>
                    )}
                  </Space>
                }
                extra={
                  <Space>
                    <span>当前餐次：</span>
                    <Radio.Group value={mealType} onChange={e => setMealType(e.target.value)} size="small">
                      <Radio.Button value="早餐">🌅 早餐</Radio.Button>
                      <Radio.Button value="午餐">☀️ 午餐</Radio.Button>
                      <Radio.Button value="晚餐">🌙 晚餐</Radio.Button>
                    </Radio.Group>
                  </Space>
                }
              >
                {unredeemed.length > 0 ? (
                  <Table
                    size="small"
                    dataSource={unredeemed}
                    rowKey="id"
                    pagination={false}
                    columns={redeemColumns}
                    rowSelection={{
                      type: 'radio',
                      selectedRowKeys: selectedTransaction ? [selectedTransaction] : [],
                      onChange: (keys) => {
                        setSelectedTransaction(keys[0])
                        const t = unredeemed.find(u => u.id === keys[0])
                        if (t) setRedeemQuantity(Math.min(t.remaining_quantity, 1))
                      }
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>
                    该老人暂无未核销的饭票
                  </div>
                )}
              </Card>
            )}

            {selectedElderly && selectedTransaction && (
              <Alert
                message="批量核销"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Space>
                    <span>核销数量：</span>
                    <InputNumber
                      min={1}
                      max={unredeemed.find(u => u.id === selectedTransaction)?.remaining_quantity || 1}
                      value={redeemQuantity}
                      onChange={setRedeemQuantity}
                      size="large"
                    />
                    <span>张</span>
                    <Input
                      placeholder="操作人"
                      value={operator}
                      onChange={e => setOperator(e.target.value)}
                      style={{ width: 150 }}
                    />
                    <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={handleRedeem}>
                      确认核销
                    </Button>
                  </Space>
                }
              />
            )}
          </Col>

          <Col xs={24} lg={8}>
            <Card title="今日核销统计" size="small">
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Statistic title="早餐" value={0} />
                </Col>
                <Col span={12}>
                  <Statistic title="午餐" value={0} />
                </Col>
                <Col span={12}>
                  <Statistic title="晚餐" value={0} />
                </Col>
                <Col span={12}>
                  <Statistic title="合计" value={0} />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'refund',
      label: '↩️ 退票处理',
      children: (
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
              <Input
                placeholder="输入老人姓名/电话快速搜索..."
                value={refundSearchText}
                onChange={e => setRefundSearchText(e.target.value)}
                onPressEnter={handleRefundSearch}
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
                {elderly.map(e => (
                  <Option key={e.id} value={e.id}>
                    {e.name} ({e.gender} {e.age || ''}岁)
                  </Option>
                ))}
              </Select>
            </Space.Compact>

            <Alert
              message="退票规则：只能退回未核销部分；补贴票退回后补贴额度恢复；赊账票退回后冲抵赊账。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {selectedElderly && (
              <Table
                size="small"
                dataSource={refundTransactions}
                rowKey="id"
                columns={refundColumns}
                pagination={{ pageSize: 10 }}
              />
            )}
          </Col>
        </Row>
      )
    }
  ]

  return (
    <div>
      <Card bordered>
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="large" items={tabItems} />
      </Card>
    </div>
  )
}
