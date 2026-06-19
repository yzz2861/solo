import React, { useState, useEffect } from 'react'
import { Row, Col, Card, DatePicker, Button, Space, Table, Tag, Statistic, message, Select } from 'antd'
import { ReloadOutlined, SearchOutlined, TeamOutlined, PieChartOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import api from '../api.js'
const { RangePicker } = DatePicker
const { Option } = Select

export default function CommunityView() {
  const [dateRange, setDateRange] = useState([dayjs().subtract(1, 'month'), dayjs()])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewType, setViewType] = useState('table')
  const [searchText, setSearchText] = useState('')

  const loadData = async () => {
    if (!dateRange || dateRange.length !== 2) return
    setLoading(true)
    try {
      const result = await api.getElderlyUsageReport(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      )
      setData(result)
    } catch (e) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dateRange])

  const filteredData = data.filter(d => 
    !searchText.trim() || 
    d.name.includes(searchText.trim()) ||
    (d.phone && d.phone.includes(searchText.trim())) ||
    (d.address && d.address.includes(searchText.trim()))
  )

  const totalStats = {
    elderly_count: data.length,
    total_purchase: data.reduce((s, d) => s + d.total_purchase_count, 0),
    total_redeem: data.reduce((s, d) => s + d.total_redeem_count, 0),
    cash_amount: data.reduce((s, d) => s + d.cash_amount, 0),
    subsidy_amount: data.reduce((s, d) => s + d.subsidy_amount, 0),
    credit_amount: data.reduce((s, d) => s + d.credit_amount, 0),
    total_amount: data.reduce((s, d) => s + d.total_amount, 0),
    subsidy_users: data.filter(d => d.subsidy_purchase_count > 0).length,
    credit_users: data.filter(d => d.credit_purchase_count > 0).length,
    no_purchase: data.filter(d => d.total_purchase_count === 0).length
  }

  const ageGroups = {
    '60-69岁': data.filter(d => d.age >= 60 && d.age < 70).length,
    '70-79岁': data.filter(d => d.age >= 70 && d.age < 80).length,
    '80-89岁': data.filter(d => d.age >= 80 && d.age < 90).length,
    '90岁以上': data.filter(d => d.age >= 90).length,
    '其他': data.filter(d => !d.age || d.age < 60).length
  }

  const mealTypeData = [
    { value: totalStats.cash_amount, name: '现金支付', itemStyle: { color: '#52c41a' } },
    { value: totalStats.subsidy_amount, name: '补贴支付', itemStyle: { color: '#1677ff' } },
    { value: totalStats.credit_amount, name: '赊账支付', itemStyle: { color: '#faad14' } }
  ]

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: mealTypeData,
      label: { formatter: '{b}: {d}%' }
    }]
  }

  const barOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['购票数量', '核销数量'] },
    xAxis: { 
      type: 'category', 
      data: filteredData.slice(0, 15).map(d => d.name),
      axisLabel: { rotate: 45 }
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '购票数量',
        type: 'bar',
        data: filteredData.slice(0, 15).map(d => d.total_purchase_count),
        itemStyle: { color: '#1677ff' }
      },
      {
        name: '核销数量',
        type: 'bar',
        data: filteredData.slice(0, 15).map(d => d.total_redeem_count),
        itemStyle: { color: '#52c41a' }
      }
    ]
  }

  const columns = [
    { title: '姓名', dataIndex: 'name', width: 100, fixed: 'left', render: v => <strong>{v}</strong> },
    { title: '性别', dataIndex: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', width: 60, render: v => v || '-' },
    { title: '电话', dataIndex: 'phone', width: 120, render: v => v || '-' },
    { title: '住址', dataIndex: 'address', ellipsis: true, width: 150 },
    { 
      title: '现金购票', 
      children: [
        { title: '张数', dataIndex: 'cash_purchase_count', width: 70, align: 'right' },
        { title: '金额', dataIndex: 'cash_amount', width: 90, align: 'right', render: v => `¥${v.toFixed(2)}` }
      ]
    },
    { 
      title: '补贴购票', 
      children: [
        { title: '张数', dataIndex: 'subsidy_purchase_count', width: 70, align: 'right', render: v => v > 0 ? <Tag color="blue">{v}</Tag> : v },
        { title: '金额', dataIndex: 'subsidy_amount', width: 90, align: 'right', render: v => `¥${v.toFixed(2)}` }
      ]
    },
    { 
      title: '赊账购票', 
      children: [
        { title: '张数', dataIndex: 'credit_purchase_count', width: 70, align: 'right', render: v => v > 0 ? <Tag color="orange">{v}</Tag> : v },
        { title: '金额', dataIndex: 'credit_amount', width: 90, align: 'right', render: v => `¥${v.toFixed(2)}` }
      ]
    },
    { title: '总购票', dataIndex: 'total_purchase_count', width: 80, align: 'right' },
    { title: '总核销', dataIndex: 'total_redeem_count', width: 80, align: 'right', render: v => <strong style={{ color: '#52c41a' }}>{v}</strong> },
    { title: '消费合计', dataIndex: 'total_amount', width: 100, align: 'right', render: v => <strong>¥{v.toFixed(2)}</strong> }
  ]

  return (
    <div>
      <Card bordered>
        <Space wrap style={{ marginBottom: 16 }}>
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>统计时段：</span>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            size="large"
            style={{ width: 350 }}
          />
          <Select value={viewType} onChange={setViewType} size="large" style={{ width: 150 }}>
            <Option value="table">📋 表格视图</Option>
            <Option value="chart">📊 图表视图</Option>
          </Select>
          <Button icon={<ReloadOutlined />} size="large" onClick={loadData}>刷新</Button>
        </Space>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="登记老人总数"
                value={totalStats.elderly_count}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title={`期间购票总张数`}
                value={totalStats.total_purchase}
                suffix="张"
                valueStyle={{ color: '#722ed1' }}
              />
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                核销：{totalStats.total_redeem}张
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="期间消费总额"
                value={totalStats.total_amount}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="使用补贴老人"
                value={totalStats.subsidy_users}
                suffix="人"
                valueStyle={{ color: '#1677ff' }}
              />
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                其中赊账：{totalStats.credit_users}人
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12}>
            <Card size="small" title="年龄分布">
              <Row gutter={[8, 8]}>
                {Object.entries(ageGroups).map(([k, v]) => (
                  <Col span={12} key={k}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: '#888' }}>{k}</div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1677ff' }}>{v}人</div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card size="small" title="支付方式占比">
              <ReactECharts option={pieOption} style={{ height: 280 }} />
            </Card>
          </Col>
        </Row>

        {viewType === 'chart' && (
          <Card title="购票/核销 Top 15 老人" size="small" style={{ marginBottom: 16 }}>
            <ReactECharts option={barOption} style={{ height: 400 }} />
          </Card>
        )}

        {totalStats.no_purchase > 0 && (
          <Card 
            title={`期间未消费老人 (${totalStats.no_purchase}人)`} 
            size="small" 
            style={{ marginBottom: 16 }}
          >
            <Space wrap>
              {data.filter(d => d.total_purchase_count === 0).map(d => (
                <Tag key={d.id} color="default" style={{ fontSize: 14, padding: '4px 12px' }}>
                  {d.name}
                </Tag>
              ))}
            </Space>
          </Card>
        )}

        <Card title="老人领取明细" size="small"
          extra={
            <Input
              placeholder="搜索姓名/电话/住址"
              allowClear
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
          }
        >
          <Table
            size="small"
            dataSource={filteredData}
            rowKey="id"
            columns={columns}
            loading={loading}
            scroll={{ x: 1400 }}
            pagination={{ 
              pageSize: 20, 
              showSizeChanger: true,
              showTotal: total => `共 ${total} 位老人`
            }}
            summary={pageData => {
              const cash = pageData.reduce((s, r) => s + r.cash_amount, 0)
              const subsidy = pageData.reduce((s, r) => s + r.subsidy_amount, 0)
              const credit = pageData.reduce((s, r) => s + r.credit_amount, 0)
              const total = cash + subsidy + credit
              const purchaseCount = pageData.reduce((s, r) => s + r.total_purchase_count, 0)
              const redeemCount = pageData.reduce((s, r) => s + r.total_redeem_count, 0)
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}><strong>本页合计</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">{pageData.reduce((s,r)=>s+r.cash_purchase_count,0)}张</Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">¥{cash.toFixed(2)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">{pageData.reduce((s,r)=>s+r.subsidy_purchase_count,0)}张</Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right">¥{subsidy.toFixed(2)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right">{pageData.reduce((s,r)=>s+r.credit_purchase_count,0)}张</Table.Summary.Cell>
                  <Table.Summary.Cell index={10} align="right">¥{credit.toFixed(2)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={11} align="right"><strong>{purchaseCount}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={12} align="right"><strong style={{color:'#52c41a'}}>{redeemCount}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={13} align="right"><strong>¥{total.toFixed(2)}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              )
            }}
          />
        </Card>

        <Card size="small" title="统计汇总" style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic 
                title="现金收入总额" 
                value={totalStats.cash_amount} 
                prefix="¥" 
                precision={2}
                valueStyle={{ color: '#52c41a' }} 
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic 
                title="补贴支出总额" 
                value={totalStats.subsidy_amount} 
                prefix="¥" 
                precision={2}
                valueStyle={{ color: '#1677ff' }} 
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic 
                title="赊账总额" 
                value={totalStats.credit_amount} 
                prefix="¥" 
                precision={2}
                valueStyle={{ color: '#faad14' }} 
              />
            </Col>
          </Row>
        </Card>
      </Card>
    </div>
  )
}
