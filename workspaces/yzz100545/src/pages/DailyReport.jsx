import React, { useState, useEffect } from 'react'
import { Row, Col, Card, DatePicker, Button, Space, Table, Tag, Statistic, message, Alert } from 'antd'
import { DownloadOutlined, ReloadOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api.js'

export default function DailyReport() {
  const [date, setDate] = useState(dayjs())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadReport = async () => {
    setLoading(true)
    try {
      const result = await api.getDailyReport(date.format('YYYY-MM-DD'))
      setReport(result)
    } catch (e) {
      message.error('加载日报表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [date])

  const handleExport = async () => {
    try {
      const saveResult = await api.showSaveDialog({
        title: '导出日结报表',
        defaultPath: `社区食堂日结_${date.format('YYYYMMDD')}.xlsx`,
        filters: [{ name: 'Excel文件', extensions: ['xlsx'] }]
      })
      
      if (saveResult.canceled) return
      
      await api.exportDailyReport(date.format('YYYY-MM-DD'), saveResult.filePath)
      message.success(`报表已导出到：${saveResult.filePath}`)
    } catch (e) {
      message.error('导出失败：' + e.message)
    }
  }

  const paymentTypeMap = { cash: '现金', subsidy: '补贴', credit: '赊账' }

  const salesColumns = [
    { title: '票种', dataIndex: 'name', width: 120 },
    { title: '餐次', dataIndex: 'meal_type', width: 80, render: m => <Tag color="blue">{m}</Tag> },
    { title: '单价', dataIndex: 'price', width: 80, render: v => `¥${v.toFixed(2)}` },
    { title: '售出数量', dataIndex: 'sold_count', width: 100, render: v => v > 0 ? <strong>{v}张</strong> : v },
    { title: '现金金额', dataIndex: 'cash_amount', width: 100, render: v => `¥${v.toFixed(2)}` },
    { title: '补贴金额', dataIndex: 'subsidy_amount', width: 100, render: v => `¥${v.toFixed(2)}` },
    { title: '赊账金额', dataIndex: 'credit_amount', width: 100, render: v => `¥${v.toFixed(2)}` },
    { 
      title: '合计金额', 
      width: 120, 
      render: (_, r) => <strong>¥{(r.cash_amount + r.subsidy_amount + r.credit_amount).toFixed(2)}</strong> 
    }
  ]

  const abnormalColumns = [
    { title: '时间', dataIndex: 'created_at', width: 160, render: t => t?.slice(11, 19) },
    { title: '老人', dataIndex: 'elderly_name', width: 100 },
    { title: '票种', dataIndex: 'ticket_type_name', width: 120 },
    { title: '票种餐次', dataIndex: 'meal_type', width: 100, render: (_, r) => <Tag color="blue">{r.meal_type}</Tag> },
    { title: '核销餐次', dataIndex: 'meal_type', width: 100, render: v => <Tag color="red">{v}</Tag> },
    { title: '数量', dataIndex: 'quantity', width: 60 },
    { title: '操作人', dataIndex: 'operator', width: 100, render: v => v || '-' },
    { title: '备注', render: () => <Tag color="red"><WarningOutlined /> 餐次不匹配</Tag> }
  ]

  return (
    <div>
      <Card bordered>
        <Space wrap style={{ marginBottom: 16 }}>
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>日结日期：</span>
          <DatePicker
            value={date}
            onChange={setDate}
            size="large"
            style={{ width: 200 }}
          />
          <Button icon={<ReloadOutlined />} size="large" onClick={loadReport}>刷新</Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            size="large" 
            onClick={handleExport}
            disabled={!report}
          >
            导出Excel
          </Button>
        </Space>

        {report && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="现金购票"
                    value={report.cash.amount}
                    precision={2}
                    prefix="¥"
                    suffix={` (${report.cash.count}张)`}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="补贴购票"
                    value={report.subsidy.amount}
                    precision={2}
                    prefix="¥"
                    suffix={` (${report.subsidy.count}张)`}
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="赊账购票"
                    value={report.credit.amount}
                    precision={2}
                    prefix="¥"
                    suffix={` (${report.credit.count}张)`}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="今日还款"
                    value={report.credit_repaid}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={8}>
                <Card className="stat-card">
                  <Statistic
                    title="早餐核销"
                    value={report.redemptions.breakfast_count}
                    suffix="餐"
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="stat-card">
                  <Statistic
                    title="午餐核销"
                    value={report.redemptions.lunch_count}
                    suffix="餐"
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="stat-card">
                  <Statistic
                    title="晚餐核销"
                    value={report.redemptions.dinner_count}
                    suffix="餐"
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12}>
                <Card className="stat-card">
                  <Statistic
                    title="退票"
                    value={report.refunds.count}
                    suffix="张"
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                    金额：¥{report.refunds.amount.toFixed(2)}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card 
                  className="stat-card"
                  bordered={report.abnormal_redemptions.length > 0}
                  style={{ borderColor: report.abnormal_redemptions.length > 0 ? '#ff4d4f' : undefined }}
                >
                  <Statistic
                    title="异常核销"
                    value={report.abnormal_redemptions.length}
                    suffix="笔"
                    valueStyle={{ color: report.abnormal_redemptions.length > 0 ? '#ff4d4f' : '#52c41a' }}
                    prefix={report.abnormal_redemptions.length > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                    票种餐次与核销餐次不匹配
                  </div>
                </Card>
              </Col>
            </Row>

            {report.abnormal_redemptions.length > 0 && (
              <Alert
                message={`发现 ${report.abnormal_redemptions.length} 笔异常核销记录，请核查！`}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Card title="各票种销售明细" size="small" style={{ marginBottom: 16 }}>
              <Table
                size="small"
                dataSource={report.ticket_type_sales}
                rowKey="name"
                columns={salesColumns}
                pagination={false}
                summary={pageData => {
                  const totalCash = pageData.reduce((s, r) => s + r.cash_amount, 0)
                  const totalSubsidy = pageData.reduce((s, r) => s + r.subsidy_amount, 0)
                  const totalCredit = pageData.reduce((s, r) => s + r.credit_amount, 0)
                  const totalCount = pageData.reduce((s, r) => s + r.sold_count, 0)
                  const totalAmount = totalCash + totalSubsidy + totalCredit
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><strong>合计</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={3}><strong>{totalCount}张</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={4}><strong>¥{totalCash.toFixed(2)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={5}><strong>¥{totalSubsidy.toFixed(2)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={6}><strong>¥{totalCredit.toFixed(2)}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={7}><strong>¥{totalAmount.toFixed(2)}</strong></Table.Summary.Cell>
                    </Table.Summary.Row>
                  )
                }}
              />
            </Card>

            {report.abnormal_redemptions.length > 0 && (
              <Card 
                title={<span><WarningOutlined style={{ color: '#ff4d4f' }} /> 异常核销明细（请核查）</span>}
                size="small"
                style={{ marginBottom: 16 }}
              >
                <Table
                  size="small"
                  dataSource={report.abnormal_redemptions}
                  rowKey="id"
                  columns={abnormalColumns}
                  pagination={false}
                />
              </Card>
            )}

            <Card size="small" title="今日现金汇总">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={6}>
                  <Statistic title="现金收入（购票）" value={report.cash.amount} prefix="¥" precision={2} />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic title="现金收入（还款）" value={report.credit_repaid} prefix="¥" precision={2} />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic title="现金支出（退票）" value={report.refunds.amount} prefix="¥" precision={2} valueStyle={{ color: '#ff4d4f' }} />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic 
                    title="应缴现金合计" 
                    value={report.cash.amount + report.credit_repaid - report.refunds.amount} 
                    prefix="¥" 
                    precision={2}
                    valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                  />
                </Col>
              </Row>
            </Card>
          </>
        )}
      </Card>
    </div>
  )
}
