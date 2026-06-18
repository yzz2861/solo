import { useState, useEffect } from 'react'
import { api, statusLabels, formatDate, downloadCSV } from '../utils/api.js'

function Settlement() {
  const [activeTab, setActiveTab] = useState('summary')
  const [summary, setSummary] = useState(null)
  const [sellerSettlements, setSellerSettlements] = useState([])
  const [courseSettlements, setCourseSettlements] = useState([])
  const [stuckTextbooks, setStuckTextbooks] = useState([])
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [sellerDetail, setSellerDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [activeTab])

  async function loadData() {
    setLoading(true)
    try {
      if (activeTab === 'summary') {
        const data = await api.getSettlementSummary()
        setSummary(data)
      } else if (activeTab === 'sellers') {
        const data = await api.getSellerSettlements()
        setSellerSettlements(data)
      } else if (activeTab === 'courses') {
        const data = await api.getCourseSettlements()
        setCourseSettlements(data)
      } else if (activeTab === 'stuck') {
        const data = await api.getStuckTextbooks()
        setStuckTextbooks(data)
      }
    } catch (e) {
      console.error('加载数据失败:', e)
    }
    setLoading(false)
  }

  async function loadSellerDetail(sellerId) {
    try {
      const data = await api.getSellerDetail(sellerId)
      setSellerDetail(data)
      setSelectedSeller(sellerId)
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleExportSellerSettlement() {
    try {
      const result = await api.exportSellerSettlement()
      downloadCSV(result.data, result.filename)
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleExportPendingPickup() {
    try {
      const result = await api.exportPendingPickup()
      downloadCSV(result.data, result.filename)
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleExportStuck() {
    try {
      const result = await api.exportStuckTextbooks()
      downloadCSV(result.data, result.filename)
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleExportSellerDetail(sellerId, sellerName) {
    try {
      const result = await api.exportSellerDetail(sellerId)
      downloadCSV(result.data, result.filename)
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="tabs">
          <div
            className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            总览
          </div>
          <div
            className={`tab ${activeTab === 'sellers' ? 'active' : ''}`}
            onClick={() => setActiveTab('sellers')}
          >
            卖家结算
          </div>
          <div
            className={`tab ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            课程对账
          </div>
          <div
            className={`tab ${activeTab === 'stuck' ? 'active' : ''}`}
            onClick={() => setActiveTab('stuck')}
          >
            滞留教材
          </div>
        </div>

        {activeTab === 'summary' && summary && (
          <div>
            <h3>活动数据总览</h3>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="number">{summary.total_textbooks}</div>
                <div className="label">总教材数</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#2e7d32' }}>{summary.picked_up}</div>
                <div className="label">已成交</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#e65100' }}>{summary.on_shelf}</div>
                <div className="label">在售</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#1565c0' }}>{summary.locked}</div>
                <div className="label">预订中</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#c62828' }}>{summary.cancelled}</div>
                <div className="label">已取消/退款</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#667eea' }}>¥{summary.total_sales.toFixed(2)}</div>
                <div className="label">总成交额</div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="number">{summary.total_sellers}</div>
                <div className="label">卖家总数</div>
              </div>
              <div className="stat-card">
                <div className="number">{summary.total_orders}</div>
                <div className="label">总订单数</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#2e7d32' }}>{summary.completed_orders}</div>
                <div className="label">已完成订单</div>
              </div>
              <div className="stat-card">
                <div className="number" style={{ color: '#c62828' }}>{summary.expired_orders}</div>
                <div className="label">超时订单</div>
              </div>
            </div>

            <h3 style={{ marginTop: 24, marginBottom: 12 }}>快速导出</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleExportSellerSettlement}>
                📊 导出卖家结算
              </button>
              <button className="btn btn-secondary" onClick={handleExportPendingPickup}>
                📋 导出待取书
              </button>
              <button className="btn btn-warning" onClick={handleExportStuck}>
                ⚠️ 导出滞留教材
              </button>
            </div>
          </div>
        )}

        {activeTab === 'sellers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ marginBottom: 0 }}>卖家结算明细</h3>
              <button className="btn btn-primary" onClick={handleExportSellerSettlement}>
                导出全部
              </button>
            </div>

            {loading ? (
              <div className="empty-state">加载中...</div>
            ) : sellerSettlements.length === 0 ? (
              <div className="empty-state">暂无卖家数据</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>卖家</th>
                    <th>联系电话</th>
                    <th>学号</th>
                    <th>总教材数</th>
                    <th>已售出</th>
                    <th>在售</th>
                    <th>预订中</th>
                    <th>已取消</th>
                    <th>总金额</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerSettlements.map(s => (
                    <tr key={s.seller_id}>
                      <td><strong>{s.seller_name}</strong></td>
                      <td>{s.seller_phone || '-'}</td>
                      <td>{s.student_id || '-'}</td>
                      <td>{s.total_books}</td>
                      <td style={{ color: '#2e7d32', fontWeight: 500 }}>{s.sold_books}</td>
                      <td>{s.on_shelf_books}</td>
                      <td>{s.locked_books}</td>
                      <td>{s.cancelled_books}</td>
                      <td style={{ color: '#e65100', fontWeight: 600 }}>
                        ¥{s.total_amount.toFixed(2)}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => loadSellerDetail(s.seller_id)}
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'courses' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>课程对账</h3>

            {loading ? (
              <div className="empty-state">加载中...</div>
            ) : courseSettlements.length === 0 ? (
              <div className="empty-state">暂无课程数据</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>课程名称</th>
                    <th>总教材数</th>
                    <th>已售出</th>
                    <th>销售总额</th>
                    <th>在售</th>
                    <th>预订中</th>
                  </tr>
                </thead>
                <tbody>
                  {courseSettlements.map(c => (
                    <tr key={c.course_id}>
                      <td><strong>{c.course_name}</strong></td>
                      <td>{c.total_books}</td>
                      <td style={{ color: '#2e7d32', fontWeight: 500 }}>{c.sold_books}</td>
                      <td style={{ color: '#e65100', fontWeight: 600 }}>
                        ¥{(c.total_sales || 0).toFixed(2)}
                      </td>
                      <td>{c.on_shelf_books}</td>
                      <td>{c.locked_books}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'stuck' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ marginBottom: 0 }}>滞留教材</h3>
              <button className="btn btn-warning" onClick={handleExportStuck}>
                导出滞留名单
              </button>
            </div>

            <div className="alert alert-info">
              以下教材上架时间较久仍未售出，建议联系卖家处理或退回
            </div>

            {loading ? (
              <div className="empty-state">加载中...</div>
            ) : stuckTextbooks.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🎉</div>
                <p>暂无滞留教材</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>教材名称</th>
                    <th>课程</th>
                    <th>价格</th>
                    <th>卖家</th>
                    <th>状态</th>
                    <th>上架时间</th>
                    <th>预订人</th>
                  </tr>
                </thead>
                <tbody>
                  {stuckTextbooks.map(t => (
                    <tr key={t.id}>
                      <td>#{t.id}</td>
                      <td>{t.title}</td>
                      <td>{t.course_name || '-'}</td>
                      <td>¥{t.price.toFixed(2)}</td>
                      <td>
                        {t.seller_name}
                        {t.seller_phone && <div style={{ fontSize: 12, color: '#888' }}>{t.seller_phone}</div>}
                      </td>
                      <td>
                        <span className={`status-badge status-${t.status}`}>
                          {statusLabels[t.status]}
                        </span>
                      </td>
                      <td>{formatDate(t.created_at)}</td>
                      <td>{t.buyer_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selectedSeller && sellerDetail && (
        <div className="modal-overlay" onClick={() => { setSelectedSeller(null); setSellerDetail(null) }}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <h3>卖家明细 - {sellerDetail.seller.name}</h3>

            <div className="settlement-summary">
              <div className="settlement-item">
                <span className="label">总教材数</span>
                <span className="value">{sellerDetail.stats.total_books}</span>
              </div>
              <div className="settlement-item">
                <span className="label">已售出</span>
                <span className="value" style={{ color: '#2e7d32' }}>{sellerDetail.stats.sold_books}</span>
              </div>
              <div className="settlement-item">
                <span className="label">待售</span>
                <span className="value">{sellerDetail.stats.on_shelf_books}</span>
              </div>
              <div className="settlement-item">
                <span className="label">总金额</span>
                <span className="value" style={{ color: '#e65100' }}>¥{sellerDetail.stats.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>教材名称</th>
                    <th>课程</th>
                    <th>价格</th>
                    <th>状态</th>
                    <th>上架时间</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerDetail.textbooks.map(t => (
                    <tr key={t.id}>
                      <td>#{t.id}</td>
                      <td>{t.title}</td>
                      <td>{t.course_name || '-'}</td>
                      <td>¥{t.price.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge status-${t.status}`}>
                          {statusLabels[t.status]}
                        </span>
                      </td>
                      <td>{formatDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleExportSellerDetail(sellerDetail.seller.id, sellerDetail.seller.name)}
              >
                导出明细
              </button>
              <button className="btn btn-secondary" onClick={() => { setSelectedSeller(null); setSellerDetail(null) }}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settlement
