import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Button, Input, Space, message, Modal } from 'antd'
import { SearchOutlined, UserOutlined, FileProtectOutlined, WalletOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api.js'

export default function Dashboard({ onRefresh }) {
  const [stats, setStats] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [balanceDetail, setBalanceDetail] = useState(null)
  const [balanceModalVisible, setBalanceModalVisible] = useState(false)
  const [selectedElderly, setSelectedElderly] = useState(null)
  const [recentTransactions, setRecentTransactions] = useState([])

  const loadStats = async () => {
    try {
      const [data, transactions] = await Promise.all([
        api.getDashboardStats(),
        api.getTransactions({ start_date: dayjs().format('YYYY-MM-DD') })
      ])
      setStats(data)
      setRecentTransactions(transactions.filter(t => t.transaction_type !== 'refund').slice(0, 10))
      if (onRefresh) onRefresh()
    } catch (e) {
      message.error('加载数据失败')
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleSearch = async () => {
    if (!searchText.trim()) {
      message.warning('请输入老人姓名')
      return
    }
    try {
      const result = await api.searchElderly(searchText.trim())
      if (result.length === 0) {
        message.warning('未找到该老人')
        setSearchResult(null)
        return
      }
      if (result.length === 1) {
        await showBalance(result[0])
      } else {
        setSearchResult(result)
      }
    } catch (e) {
      message.error('搜索失败')
    }
  }

  const showBalance = async (elderly) => {
    try {
      const balance = await api.getElderlyBalance(elderly.id)
      setSelectedElderly(elderly)
      setBalanceDetail(balance)
      setBalanceModalVisible(true)
      setSearchResult(null)
    } catch (e) {
      message.error('获取余额失败')
    }
  }

  const paymentTypeMap = { cash: '现金', subsidy: '补贴', credit: '赊账', free: '免费' }
  const typeMap = { purchase: '购票', redeem: '核销', refund: '退票' }

  return (
    <div>
      <Space style={{ marginBottom: 24 }} size="large" wrap>
        <Input.Search
          placeholder="输入老人姓名快速查余额..."
          allowClear
          size="large"
          style={{ width: 400 }}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onSearch={handleSearch}
          enterButton={<Button type="primary" icon={<SearchOutlined />}>查余额</Button>}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        />
        <Button icon={<ReloadOutlined />} onClick={loadStats}>刷新数据</Button>
      </Space>

      {searchResult && searchResult.length > 0 && (
        <Card title="找到多位老人，请选择" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {searchResult.map(e => (
              <Col xs={24} sm={12} md={8} lg={6} key={e.id}>
                <Card size="small" hoverable onClick={() => showBalance(e)}>
                  <Card.Meta
                    avatar={<UserOutlined style={{ fontSize: 24, color: '#1677ff' }} />}
                    title={e.name}
                    description={
                      <Space direction="vertical" size={0}>
                        <span>{e.gender || ''} {e.age || ''}岁</span>
                        <span style={{ fontSize: 12, color: '#888' }}>{e.phone || ''}</span>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {stats && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="登记老人总数"
                  value={stats.elderly_count}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="未使用饭票总数"
                  value={stats.active_ticket_count}
                  prefix={<FileProtectOutlined />}
                  suffix="张"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="今日购票金额"
                  value={stats.today_purchases.cash + stats.today_purchases.subsidy + stats.today_purchases.credit}
                  precision={2}
                  prefix="¥"
                  suffix="元"
                  valueStyle={{ color: '#722ed1' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                  <Tag color="green">现金 ¥{stats.today_purchases.cash}</Tag>
                  <Tag color="blue">补贴 ¥{stats.today_purchases.subsidy}</Tag>
                  <Tag color="orange">赊账 ¥{stats.today_purchases.credit}</Tag>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="今日核销"
                  value={stats.today_redemptions.count}
                  suffix="餐"
                  valueStyle={{ color: '#fa8c16' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                  <Space>
                    <span>早 {stats.today_redemptions.breakfast}</span>
                    <span>午 {stats.today_redemptions.lunch}</span>
                    <span>晚 {stats.today_redemptions.dinner}</span>
                  </Space>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card className="stat-card" bordered={stats.expiring_subsidy_count > 0} style={{ borderColor: stats.expiring_subsidy_count > 0 ? '#faad14' : undefined }}>
                <Statistic
                  title="7天内过期补贴"
                  value={stats.expiring_subsidy_count}
                  suffix="项"
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stat-card" bordered={stats.expired_subsidy_count > 0} style={{ borderColor: stats.expired_subsidy_count > 0 ? '#ff4d4f' : undefined }}>
                <Statistic
                  title="已过期补贴"
                  value={stats.expired_subsidy_count}
                  suffix="项"
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stat-card" bordered={stats.over_credit_count > 0} style={{ borderColor: stats.over_credit_count > 0 ? '#ff4d4f' : undefined }}>
                <Statistic
                  title="赊账超限老人"
                  value={stats.over_credit_count}
                  prefix={<WalletOutlined />}
                  suffix="人"
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Card title="今日交易记录" extra={<Button size="small" onClick={loadStats}>刷新</Button>}>
        <Table
          size="small"
          dataSource={recentTransactions}
          rowKey="id"
          pagination={false}
          columns={[
            { title: '时间', dataIndex: 'created_at', width: 160, render: t => t?.slice(11, 19) },
            { title: '老人', dataIndex: 'elderly_name', width: 100 },
            { title: '类型', dataIndex: 'transaction_type', width: 70, render: t => 
              <Tag color={t === 'purchase' ? 'blue' : t === 'redeem' ? 'green' : 'red'}>{typeMap[t]}</Tag>
            },
            { title: '票种', dataIndex: 'ticket_type_name', width: 100 },
            { title: '数量', dataIndex: 'quantity', width: 60 },
            { title: '餐次', dataIndex: 'meal_type', width: 70, render: m => m || '-' },
            { title: '支付方式', dataIndex: 'payment_type', width: 80, render: p => 
              <Tag color={p === 'cash' ? 'green' : p === 'subsidy' ? 'blue' : p === 'credit' ? 'orange' : 'default'}>{paymentTypeMap[p]}</Tag>
            },
            { title: '金额', dataIndex: 'total_amount', width: 80, render: (v, r) => 
              r.transaction_type === 'refund' ? <span style={{ color: 'red' }}>-¥{Math.abs(v).toFixed(2)}</span> : `¥${v.toFixed(2)}`
            },
            { title: '经手人', dataIndex: 'handler_name', width: 80, render: v => v || '-' },
          ]}
        />
      </Card>

      <Modal
        title={selectedElderly ? `${selectedElderly.name} - 余额详情` : '余额详情'}
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
                  <Statistic title="赊账余额" value={balanceDetail.credit_balance} prefix="¥" precision={2} valueStyle={{ color: balanceDetail.credit_balance > 0 ? '#ff4d4f' : undefined }} />
                </Col>
              </Row>
            </Card>

            <h4 style={{ marginBottom: 12 }}>各票种明细</h4>
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
