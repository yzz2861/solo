import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../utils/api'

function TicketList() {
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [anomalyType, setAnomalyType] = useState(searchParams.get('anomaly_type') || '')
  const [priority, setPriority] = useState(searchParams.get('priority') || '')
  const [hasReview, setHasReview] = useState(searchParams.get('has_review') || '')
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') || '')

  useEffect(() => {
    loadTickets()
  }, [page, keyword, anomalyType, priority, hasReview])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const params = {
        page,
        page_size: pageSize,
      }
      if (keyword) params.keyword = keyword
      if (anomalyType) params.anomaly_type = anomalyType
      if (priority) params.priority = priority
      if (hasReview) params.has_review = hasReview

      const data = await api.getTickets(params)
      setTickets(data.list)
      setTotal(data.total)
    } catch (err) {
      console.error('加载工单列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setKeyword(keywordInput)
    setPage(1)
    updateUrlParams({ keyword: keywordInput, page: 1 })
  }

  const handleAnomalyChange = (val) => {
    setAnomalyType(val)
    setPage(1)
    updateUrlParams({ anomaly_type: val, page: 1 })
  }

  const handlePriorityChange = (val) => {
    setPriority(val)
    setPage(1)
    updateUrlParams({ priority: val, page: 1 })
  }

  const handleReviewChange = (val) => {
    setHasReview(val)
    setPage(1)
    updateUrlParams({ has_review: val, page: 1 })
  }

  const updateUrlParams = (updates) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value)
      } else {
        newParams.delete(key)
      }
    })
    setSearchParams(newParams)
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

  const getSourceLabel = (s) => {
    const map = {
      system: { class: 'tag-info', label: '系统' },
      supplement: { class: 'tag-warning', label: '补录' },
    }
    const cfg = map[s] || { class: 'tag-default', label: s || '未知' }
    return <span className={`tag ${cfg.class}`}>{cfg.label}</span>
  }

  const totalPages = Math.ceil(total / pageSize)

  const renderPagination = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }

  const goToPage = (p) => {
    if (p < 1 || p > totalPages || p === page) return
    setPage(p)
    updateUrlParams({ page: p })
  }

  return (
    <div>
      <div className="page-header">
        <h1>工单列表</h1>
        <p>查看所有工单，支持按异常类型、优先级等条件筛选</p>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="filter-item">
            <label>关键词：</label>
            <input
              type="text"
              placeholder="工单号/标题"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ width: '200px' }}
            />
            <button className="btn btn-small btn-primary" onClick={handleSearch}>
              搜索
            </button>
          </div>
          <div className="filter-item">
            <label>异常类型：</label>
            <select value={anomalyType} onChange={(e) => handleAnomalyChange(e.target.value)}>
              <option value="">全部</option>
              <option value="all">有异常</option>
              <option value="sla_violation">SLA超时</option>
              <option value="duplicate_escalation">重复升级</option>
              <option value="reply_before_create">回复早于创建</option>
            </select>
          </div>
          <div className="filter-item">
            <label>优先级：</label>
            <select value={priority} onChange={(e) => handlePriorityChange(e.target.value)}>
              <option value="">全部</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="normal">普通</option>
              <option value="low">低</option>
            </select>
          </div>
          <div className="filter-item">
            <label>复核状态：</label>
            <select value={hasReview} onChange={(e) => handleReviewChange(e.target.value)}>
              <option value="">全部</option>
              <option value="yes">已复核</option>
              <option value="no">未复核</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : tickets.length > 0 ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>工单号</th>
                  <th>标题</th>
                  <th>优先级</th>
                  <th>创建时间</th>
                  <th>来源</th>
                  <th>升级次数</th>
                  <th>回复次数</th>
                  <th>异常</th>
                  <th>复核状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/tickets/${t.ticket_no}`} className="link">
                        {t.ticket_no}
                      </Link>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title || '-'}
                    </td>
                    <td>{getPriorityTag(t.priority)}</td>
                    <td>{t.created_at || '-'}</td>
                    <td>{getSourceLabel(t.source)}</td>
                    <td>{t.escalation_count}</td>
                    <td>{t.reply_count}</td>
                    <td>
                      {t.has_anomaly ? (
                        <div className="anomaly-list">
                          {t.sla_violated && <span className="tag tag-danger">SLA超时</span>}
                          {t.escalation_count > 1 && <span className="tag tag-warning">重复升级</span>}
                        </div>
                      ) : (
                        <span className="tag tag-success">正常</span>
                      )}
                    </td>
                    <td>
                      {t.has_review ? (
                        <span className="tag tag-success">已复核</span>
                      ) : (
                        <span className="tag tag-default">未复核</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/tickets/${t.ticket_no}`} className="link">
                        详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button onClick={() => goToPage(1)} disabled={page === 1}>首页</button>
              <button onClick={() => goToPage(page - 1)} disabled={page === 1}>上一页</button>
              {renderPagination().map(p => (
                <button
                  key={p}
                  className={p === page ? 'active' : ''}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              ))}
              <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}>下一页</button>
              <button onClick={() => goToPage(totalPages)} disabled={page === totalPages}>末页</button>
              <span>共 {total} 条，第 {page}/{totalPages} 页</span>
            </div>
          </>
        ) : (
          <div className="empty">暂无工单数据</div>
        )}
      </div>
    </div>
  )
}

export default TicketList
