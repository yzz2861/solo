import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'

function ReportsPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportingAll, setExportingAll] = useState(false)
  const [exportingAnomaly, setExportingAnomaly] = useState(false)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      setLoading(true)
      const data = await api.getReportSummary()
      setSummary(data)
    } catch (err) {
      console.error('加载报告摘要失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportAll = async () => {
    try {
      setExportingAll(true)
      await api.downloadFile('/reports/export', 'SLA审计报告.xlsx')
    } catch (err) {
      alert('导出失败: ' + err.message)
    } finally {
      setExportingAll(false)
    }
  }

  const handleExportAnomaly = async () => {
    try {
      setExportingAnomaly(true)
      await api.downloadFile('/reports/export?anomaly_only=true', 'SLA异常审计报告.xlsx')
    } catch (err) {
      alert('导出失败: ' + err.message)
    } finally {
      setExportingAnomaly(false)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1>审计报告</h1>
        <p>生成并导出SLA审计报告，支持全量和仅异常两种模式</p>
      </div>

      <div className="stat-cards">
        <div className="stat-card primary">
          <div className="stat-value">{summary?.total_tickets || 0}</div>
          <div className="stat-label">总工单数</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{summary?.with_anomalies || 0}</div>
          <div className="stat-label">有异常工单</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">{summary?.sla_violations || 0}</div>
          <div className="stat-label">SLA超时</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{summary?.duplicate_escalations || 0}</div>
          <div className="stat-label">重复升级</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{summary?.time_abnormal || 0}</div>
          <div className="stat-label">时间异常</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{summary?.review_rate || '0%'}</div>
          <div className="stat-label">复核完成率</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>导出报告</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ padding: '20px', border: '1px solid #ebeef5', borderRadius: '8px', flex: '1', minWidth: '250px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>📊 完整审计报告</h3>
            <p style={{ fontSize: '13px', color: '#909399', marginBottom: '16px', lineHeight: '1.6' }}>
              导出所有工单的完整SLA审计报告，包含工单信息、异常检测、复核状态等全部字段。
            </p>
            <button
              className="btn btn-primary"
              onClick={handleExportAll}
              disabled={exportingAll}
            >
              {exportingAll ? '导出中...' : '导出完整报告'}
            </button>
          </div>

          <div style={{ padding: '20px', border: '1px solid #fde2e2', borderRadius: '8px', background: '#fef0f0', flex: '1', minWidth: '250px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '8px', color: '#f56c6c' }}>⚠️ 异常工单报告</h3>
            <p style={{ fontSize: '13px', color: '#e6a23c', marginBottom: '16px', lineHeight: '1.6' }}>
              仅导出存在异常的工单，包括SLA超时、重复升级、时间异常等问题工单。
            </p>
            <button
              className="btn btn-warning"
              onClick={handleExportAnomaly}
              disabled={exportingAnomaly}
            >
              {exportingAnomaly ? '导出中...' : '导出异常报告'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <div className="card-title">按优先级分布</div>
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
                    <td>
                      <span style={{ color: stats.sla_violated > 0 ? '#f56c6c' : '#67c23a' }}>
                        {stats.sla_violated}
                      </span>
                    </td>
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
          <div className="card-title">按数据来源分布</div>
          {summary?.source_stats && Object.keys(summary.source_stats).length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>来源</th>
                  <th>工单数</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.source_stats).map(([source, count]) => {
                  const total = summary.total_tickets || 1
                  return (
                    <tr key={source}>
                      <td>
                        <span className={`tag ${source === 'system' ? 'tag-info' : 'tag-warning'}`}>
                          {source === 'system' ? '系统工单' : source === 'supplement' ? '人工补录' : source}
                        </span>
                      </td>
                      <td>{count}</td>
                      <td>{((count / total) * 100).toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty">暂无数据</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title">责任归属统计</div>
        {summary?.responsible_stats && Object.keys(summary.responsible_stats).length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>责任方</th>
                <th>工单数</th>
                <th>占已复核比例</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.responsible_stats)
                .sort((a, b) => b[1] - a[1])
                .map(([party, count]) => {
                  const reviewed = summary.reviewed_count || 1
                  return (
                    <tr key={party}>
                      <td>{party}</td>
                      <td>{count}</td>
                      <td>{((count / reviewed) * 100).toFixed(1)}%</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        ) : (
          <div className="empty">暂无复核数据，请先对工单进行复核</div>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <span>报告内容说明</span>
        </div>
        <div style={{ fontSize: '13px', color: '#606266', lineHeight: '1.8' }}>
          <p><strong>导出的Excel报告包含以下字段：</strong></p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>工单号、标题、类型、优先级</li>
            <li>创建时间、创建人、工单来源、当前状态</li>
            <li>首次回复时间、升级次数、回复次数</li>
            <li>是否SLA超时、是否有异常、异常类型</li>
            <li>复核状态、复核意见、责任归属、复核人、复核时间</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            <strong>报告生成时间：</strong> {new Date().toLocaleString('zh-CN')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
