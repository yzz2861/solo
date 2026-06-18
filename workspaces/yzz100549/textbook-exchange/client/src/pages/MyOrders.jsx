import { useState, useEffect } from 'react'
import { api, statusLabels, formatDate } from '../utils/api.js'

function MyOrders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchName, setSearchName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 15000)
    return () => clearInterval(interval)
  }, [filter, searchName])

  async function loadOrders() {
    setLoading(true)
    try {
      const params = {}
      if (filter !== 'all') params.status = filter
      if (searchName) params.buyer_name = searchName

      const data = await api.getOrders(params)
      setOrders(data)
    } catch (e) {
      console.error('加载订单失败:', e)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="card">
        <h2>我的预订</h2>

        <div className="filter-bar">
          <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
            <div
              className={`tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              全部
            </div>
            <div
              className={`tab ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              待取书
            </div>
            <div
              className={`tab ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              已完成
            </div>
            <div
              className={`tab ${filter === 'expired' ? 'active' : ''}`}
              onClick={() => setFilter('expired')}
            >
              已过期
            </div>
          </div>

          <div className="spacer" />

          <input
            type="text"
            placeholder="搜索预订人姓名..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ width: 200 }}
          />
        </div>

        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>暂无预订记录</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>教材名称</th>
                <th>课程</th>
                <th>版本</th>
                <th>预订人</th>
                <th>取书码</th>
                <th>价格</th>
                <th>状态</th>
                <th>预订时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.textbook_title}</td>
                  <td>{order.course_name || '-'}</td>
                  <td>{order.textbook_edition || '-'}</td>
                  <td>{order.buyer_name}</td>
                  <td>
                    {order.pickup_code && (
                      <span style={{ fontWeight: 700, color: '#667eea' }}>
                        {order.pickup_code}
                      </span>
                    )}
                  </td>
                  <td>¥{order.actual_price.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge status-${order.status}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td>{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>取书须知</h3>
        <ul style={{ paddingLeft: 20, fontSize: 14, color: '#555', lineHeight: 2 }}>
          <li>请在预订后 24 小时内完成取书，超时将自动释放库存</li>
          <li>取书时请出示取书码，由工作人员现场核验</li>
          <li>取书前请仔细核对教材版本、成色等信息</li>
          <li>如版本不符，可现场取消预订，不收取任何费用</li>
          <li>支持旧书换购抵扣，详情请咨询工作人员</li>
        </ul>
      </div>
    </div>
  )
}

export default MyOrders
