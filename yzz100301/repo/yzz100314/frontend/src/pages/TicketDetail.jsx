import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

function TicketDetail() {
  const { ticketNo } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    review_opinion: '',
    responsible_party: '',
    reviewer: '',
    sla_violation: false,
    violation_type: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTicketDetail()
  }, [ticketNo])

  const loadTicketDetail = async () => {
    try {
      setLoading(true)
      const data = await api.getTicket(ticketNo)
      setTicket(data)
      
      if (data.review) {
        setReviewForm({
          review_opinion: data.review.review_opinion || '',
          responsible_party: data.review.responsible_party || '',
          reviewer: data.review.reviewer || '',
          sla_violation: !!data.review.sla_violation,
          violation_type: data.review.violation_type || '',
        })
      }
    } catch (err) {
      console.error('加载工单详情失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveReview = async () => {
    try {
      setSaving(true)
      await api.updateReview(ticketNo, reviewForm)
      setShowReviewModal(false)
      loadTicketDetail()
    } catch (err) {
      alert('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleExportDetail = async () => {
    try {
      await api.downloadFile(
        `/reports/details/${ticketNo}/export`,
        `工单详情_${ticketNo}.xlsx`
      )
    } catch (err) {
      alert('导出失败: ' + err.message)
    }
  }

  const getPriorityTag = (p) => {
    const map = {
      urgent: { class: 'tag-danger', label: '紧急' },
      high: { class: 'tag-danger', label: '高' },
      normal: { class: 'tag-warning', label: '普通' },
      low: { class: 'tag-default', label: '低' },
    }
    const cfg = map[p] || { class: 'tag-default', label: p || '未知' }
    return <span className={`tag ${cfg.class}`}>{cfg.label}</span>
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!ticket) {
    return <div className="empty">工单不存在</div>
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>工单详情 - {ticket.ticket_no}</h1>
          <p>{ticket.title || '无标题'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-default" onClick={() => navigate('/tickets')}>
            ← 返回列表
          </button>
          <button className="btn btn-default" onClick={handleExportDetail}>
            📥 导出详情
          </button>
          <button className="btn btn-primary" onClick={() => setShowReviewModal(true)}>
            {ticket.review ? '编辑复核' : '添加复核'}
          </button>
        </div>
      </div>

      {ticket.anomalies && ticket.anomalies.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #f56c6c' }}>
          <div className="card-title">
            <span>⚠️ 异常检测</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {ticket.anomalies.map((a, idx) => (
              <div key={idx} style={{ padding: '8px 12px', background: '#fef0f0', borderRadius: '4px', color: '#f56c6c', fontSize: '13px' }}>
                {a.label}
                {a.reply_time && ` (回复: ${a.reply_time})`}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">基本信息</div>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="label">工单号</span>
            <span className="value">{ticket.ticket_no}</span>
          </div>
          <div className="detail-item">
            <span className="label">标题</span>
            <span className="value">{ticket.title || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="label">类型</span>
            <span className="value">{ticket.type || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="label">优先级</span>
            <span className="value">{getPriorityTag(ticket.priority)}</span>
          </div>
          <div className="detail-item">
            <span className="label">创建时间</span>
            <span className="value">{ticket.created_at || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="label">创建人</span>
            <span className="value">{ticket.creator || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="label">当前状态</span>
            <span className="value">{ticket.current_status || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="label">数据来源</span>
            <span className="value">
              <span className={`tag ${ticket.source === 'system' ? 'tag-info' : 'tag-warning'}`}>
                {ticket.source === 'system' ? '系统工单' : ticket.source === 'supplement' ? '人工补录' : ticket.source}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>SLA信息</span>
          {ticket.sla_violated && <span className="tag tag-danger">已超时</span>}
        </div>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="label">首次响应时限</span>
            <span className="value">{(ticket.sla_config?.first_response / 3600000).toFixed(1)} 小时</span>
          </div>
          <div className="detail-item">
            <span className="label">首次回复时间</span>
            <span className="value">{ticket.first_reply_at || '未回复'}</span>
          </div>
          <div className="detail-item">
            <span className="label">升级次数</span>
            <span className="value">{ticket.escalation_count} 次</span>
          </div>
          <div className="detail-item">
            <span className="label">回复次数</span>
            <span className="value">{ticket.reply_count} 次</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>时间线</span>
          <span style={{ fontSize: '12px', color: '#909399', fontWeight: 'normal' }}>
            共 {ticket.timeline?.length || 0} 条记录
          </span>
        </div>
        <div className="timeline">
          {ticket.timeline && ticket.timeline.length > 0 ? (
            ticket.timeline.map((item, idx) => (
              <div key={idx} className={`timeline-item ${item.type}`}>
                <div className="timeline-time">{item.time}</div>
                <div className="timeline-title">{item.label}</div>
                {item.detail && (
                  <div className="timeline-detail">{item.detail}</div>
                )}
                <span className="timeline-source">
                  {item.source === 'system' ? '系统' : item.source === 'escalation_json' ? '升级记录' : item.source === 'supplement' ? '人工补录' : item.source}
                </span>
              </div>
            ))
          ) : (
            <div className="empty">暂无时间线记录</div>
          )}
        </div>
      </div>

      {ticket.review && (
        <div className="card">
          <div className="card-title">
            <span>复核信息</span>
            <span className="tag tag-success">已复核</span>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">复核人</span>
              <span className="value">{ticket.review.reviewer || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="label">责任归属</span>
              <span className="value">{ticket.review.responsible_party || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="label">SLA违规判定</span>
              <span className="value">
                {ticket.review.sla_violation ? (
                  <span className="tag tag-danger">是</span>
                ) : (
                  <span className="tag tag-success">否</span>
                )}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">复核时间</span>
              <span className="value">{ticket.review.reviewed_at || '-'}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="label">复核意见</span>
              <span className="value" style={{ whiteSpace: 'pre-wrap' }}>
                {ticket.review.review_opinion || '-'}
              </span>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="modal-mask" onClick={() => setShowReviewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{ticket.review ? '编辑复核意见' : '添加复核意见'}</h3>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>复核人</label>
                <input
                  type="text"
                  value={reviewForm.reviewer}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewer: e.target.value })}
                  placeholder="请输入复核人姓名"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>责任归属</label>
                  <input
                    type="text"
                    value={reviewForm.responsible_party}
                    onChange={(e) => setReviewForm({ ...reviewForm, responsible_party: e.target.value })}
                    placeholder="如：一线客服、技术部等"
                  />
                </div>
                <div className="form-group">
                  <label>SLA违规判定</label>
                  <select
                    value={reviewForm.sla_violation ? 'yes' : 'no'}
                    onChange={(e) => setReviewForm({ ...reviewForm, sla_violation: e.target.value === 'yes' })}
                  >
                    <option value="no">不构成违规</option>
                    <option value="yes">构成SLA违规</option>
                  </select>
                </div>
              </div>
              {reviewForm.sla_violation && (
                <div className="form-group">
                  <label>违规类型</label>
                  <input
                    type="text"
                    value={reviewForm.violation_type}
                    onChange={(e) => setReviewForm({ ...reviewForm, violation_type: e.target.value })}
                    placeholder="如：首次响应超时、解决超时等"
                  />
                </div>
              )}
              <div className="form-group">
                <label>复核意见</label>
                <textarea
                  value={reviewForm.review_opinion}
                  onChange={(e) => setReviewForm({ ...reviewForm, review_opinion: e.target.value })}
                  placeholder="请输入详细的复核意见..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowReviewModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveReview} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketDetail
