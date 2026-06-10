import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [anomalySummary, setAnomalySummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [reportSum, anomalySum] = await Promise.all([
        api.getReportSummary(),
        api.getAnomalySummary(),
      ])
      setSummary(reportSum)
      setAnomalySummary(anomalySum)
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1>数据概览</h1>
        <p>客服工单SLA审计系统 - 月底复盘数据总览</p>
      </div>

      <div className="stat-cards">
        <div className="stat-card primary">
          <div className="stat-value">{summary?.total_tickets || 0}</div>
          <div className="stat-label">总工单数</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">{summary?.sla_violations || 0}</div>
          <div className="stat-label">SLA超时工单</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{summary?.duplicate_escalations || 0}</div>
          <div className="stat-label">重复升级工单</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{summary?.time_abnormal || 0}</div>
          <div className="stat-label">时间异常工单</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{summary?.reviewed_count || 0}</div>
          <div className="stat-label">已复核工单</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary?.review_rate || '0%'}</div>
          <div className="stat-label">复核完成率</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <div className="card-title">
            <span>按优先级统计</span>
          </div>
          {summary?.priority_stats && Object.keys(summary.priority_stats).length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>优先级</th>
                  <th>工单数</th>
                  <th>SLA超时</th>
                  <th>超时率</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.priority_stats).map(([priority, stats]) => (
                  <tr key={priority}>
                    <td>
                      <span className={`tag ${priority === 'urgent' || priority === 'high' ? 'tag-danger' : priority === 'normal' ? 'tag-warning' : 'tag-default'}`}>
                        {priority}
                      </span>
                    </td>
                    <td>{stats.total}</td>
                    <td>{stats.sla_violated}</td>
                    <td>
                      {stats.total > 0 ? ((stats.sla_violated / stats.total) * 100).toFixed(1) + '%' : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">暂无数据</div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <span>责任归属统计</span>
            <Link to="/tickets?has_review=yes" className="link">
              查看全部
            </Link>
          </div>
          {summary?.responsible_stats && Object.keys(summary.responsible_stats).length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>责任方</th>
                  <th>工单数</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.responsible_stats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([party, count]) => (
                    <tr key={party}>
                      <td>{party}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">暂无复核数据</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title">
          <span>快捷操作</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/import">
            <button className="btn btn-primary">📥 导入数据</button>
          </Link>
          <Link to="/tickets">
            <button className="btn btn-default">📋 查看工单列表</button>
          </Link>
          <Link to="/tickets?anomaly_type=sla_violation">
            <button className="btn btn-danger">⚠️ SLA超时工单</button>
          </Link>
          <Link to="/tickets?anomaly_type=duplicate_escalation">
            <button className="btn btn-warning">🔄 重复升级工单</button>
          </Link>
          <Link to="/tickets?anomaly_type=reply_before_create">
            <button className="btn btn-warning">⏰ 时间异常工单</button>
          </Link>
          <Link to="/reports">
            <button className="btn btn-success">📑 导出审计报告</button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
