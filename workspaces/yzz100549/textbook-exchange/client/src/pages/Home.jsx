import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, statusLabels, conditionLabels, formatDate } from '../utils/api.js'

function Home() {
  const [textbooks, setTextbooks] = useState([])
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({
    status: 'on_shelf',
    course_id: '',
    keyword: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadTextbooks()
  }, [filters])

  async function loadData() {
    try {
      const [coursesData, statsData] = await Promise.all([
        api.getCourses(),
        api.getTextbookStats(),
      ])
      setCourses(coursesData)
      setStats(statsData)
    } catch (e) {
      console.error('加载数据失败:', e)
    }
  }

  async function loadTextbooks() {
    setLoading(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.course_id) params.course_id = filters.course_id
      if (filters.keyword) params.keyword = filters.keyword

      const data = await api.getTextbooks(params)
      setTextbooks(data)
    } catch (e) {
      console.error('加载教材失败:', e)
    }
    setLoading(false)
  }

  return (
    <div>
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="number">{stats.total}</div>
            <div className="label">总教材数</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.on_shelf}</div>
            <div className="label">在售</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.locked}</div>
            <div className="label">已预订</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.picked_up}</div>
            <div className="label">已取书</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="filter-bar">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">全部状态</option>
            <option value="on_shelf">在售</option>
            <option value="locked">已预订</option>
            <option value="picked_up">已取书</option>
            <option value="cancelled">已取消</option>
            <option value="refunded">已退款</option>
          </select>

          <select
            value={filters.course_id}
            onChange={(e) => setFilters({ ...filters, course_id: e.target.value })}
          >
            <option value="">全部课程</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="搜索教材名称或版本..."
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            style={{ flex: 1, minWidth: 200 }}
          />

          <div className="spacer" />

          <Link to="/register" className="btn btn-primary">
            + 登记教材
          </Link>
        </div>

        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : textbooks.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📚</div>
            <p>暂无符合条件的教材</p>
          </div>
        ) : (
          <div className="book-grid">
            {textbooks.map(book => (
              <div key={book.id} className="book-card">
                <span className={`status-badge status-${book.status}`}>
                  {statusLabels[book.status]}
                </span>
                <h3 style={{ marginTop: 8 }}>{book.title}</h3>
                <div className="meta">
                  {book.course_name && <span>课程: {book.course_name}</span>}
                  {book.edition && <span> | 版本: {book.edition}</span>}
                </div>
                <div className="meta">
                  成色: {conditionLabels[book.condition] || book.condition}
                </div>
                {book.version_note && (
                  <div className="meta" style={{ color: '#e65100' }}>
                    版本说明: {book.version_note}
                  </div>
                )}
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="price">¥{book.price.toFixed(2)}</span>
                  {book.trade_in_value > 0 && (
                    <span style={{ fontSize: 12, color: '#2e7d32' }}>
                      换书抵扣 ¥{book.trade_in_value.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="actions">
                  <Link to={`/book/${book.id}`} className="btn btn-secondary btn-small" style={{ flex: 1, textAlign: 'center' }}>
                    查看详情
                  </Link>
                  {book.status === 'on_shelf' && (
                    <Link to={`/book/${book.id}`} className="btn btn-primary btn-small" style={{ flex: 1, textAlign: 'center' }}>
                      立即预订
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
