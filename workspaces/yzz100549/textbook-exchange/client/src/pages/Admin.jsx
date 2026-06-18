import { useState, useEffect } from 'react'
import { api, statusLabels, conditionLabels, formatDate } from '../utils/api.js'

function Admin() {
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [textbooks, setTextbooks] = useState([])
  const [reminders, setReminders] = useState({ count: 0, orders: [] })
  const [config, setConfig] = useState(null)
  const [showPickupModal, setShowPickupModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [pickupForm, setPickupForm] = useState({
    version_confirmed: true,
    trade_in_used: false,
    trade_in_textbook_id: '',
    trade_in_value: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [activeTab, filter])

  async function loadData() {
    try {
      const [configData, reminderData] = await Promise.all([
        api.getConfig(),
        api.getExpiringReminders(),
      ])
      setConfig(configData)
      setReminders(reminderData)

      if (activeTab === 'orders') {
        const params = {}
        if (filter) params.status = filter
        const ordersData = await api.getOrders(params)
        setOrders(ordersData)
      } else if (activeTab === 'textbooks') {
        const textbooksData = await api.getTextbooks()
        setTextbooks(textbooksData)
      }
    } catch (e) {
      console.error('加载数据失败:', e)
    }
  }

  function openPickupModal(order) {
    setSelectedOrder(order)
    setPickupForm({
      version_confirmed: true,
      trade_in_used: false,
      trade_in_textbook_id: '',
      trade_in_value: '',
    })
    setError('')
    setShowPickupModal(true)
  }

  async function handleConfirmPickup() {
    if (!pickupForm.version_confirmed) {
      if (!confirm('版本未确认，确定要完成取书吗？')) return
    }

    setSubmitting(true)
    setError('')

    try {
      const data = {
        version_confirmed: pickupForm.version_confirmed,
      }

      if (pickupForm.trade_in_used && pickupForm.trade_in_textbook_id) {
        data.trade_in_textbook_id = parseInt(pickupForm.trade_in_textbook_id)
        data.trade_in_value = parseFloat(pickupForm.trade_in_value) || 0
      }

      await api.confirmPickup(selectedOrder.textbook_id, data)
      setShowPickupModal(false)
      alert('取书确认成功！')
      loadData()
    } catch (e) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  async function handleRelease(textbookId) {
    if (!confirm('确定要释放该教材的锁定吗？')) return
    try {
      await api.releaseTextbook(textbookId)
      alert('释放成功')
      loadData()
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleCancel(textbookId) {
    if (!confirm('确定要取消该教材的上架吗？')) return
    try {
      await api.cancelTextbook(textbookId)
      alert('取消成功')
      loadData()
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleRefund(textbookId) {
    const reason = prompt('请输入退款原因：')
    if (reason === null) return
    try {
      await api.refundTextbook(textbookId, reason)
      alert('退款成功')
      loadData()
    } catch (e) {
      alert(e.message)
    }
  }

  const filteredOrders = orders.filter(o => {
    if (!searchKeyword) return true
    const kw = searchKeyword.toLowerCase()
    return (
      o.buyer_name?.toLowerCase().includes(kw) ||
      o.textbook_title?.toLowerCase().includes(kw) ||
      o.pickup_code?.toLowerCase().includes(kw) ||
      String(o.id).includes(kw)
    )
  })

  const filteredTextbooks = textbooks.filter(t => {
    if (!searchKeyword) return true
    const kw = searchKeyword.toLowerCase()
    return (
      t.title?.toLowerCase().includes(kw) ||
      t.seller_name?.toLowerCase().includes(kw) ||
      String(t.id).includes(kw)
    )
  })

  return (
    <div>
      {reminders.count > 0 && (
        <div className="alert alert-warning">
          <strong>⚠️ 待处理提醒：</strong>
          有 {reminders.count} 个订单即将超时，请尽快提醒取书
          <button
            className="btn btn-warning btn-small"
            style={{ marginLeft: 12 }}
            onClick={() => { setActiveTab('orders'); setFilter('pending') }}
          >
            查看
          </button>
        </div>
      )}

      <div className="card">
        <div className="tabs">
          <div
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            订单管理
          </div>
          <div
            className={`tab ${activeTab === 'textbooks' ? 'active' : ''}`}
            onClick={() => setActiveTab('textbooks')}
          >
            教材管理
          </div>
          <div
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            活动设置
          </div>
        </div>

        {activeTab === 'orders' && (
          <div>
            <div className="filter-bar">
              <div style={{ display: 'flex', gap: 4 }}>
                {['pending', 'completed', 'cancelled', 'expired', 'pickup_expired'].map(status => (
                  <button
                    key={status}
                    className={`btn btn-small ${filter === status ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilter(status)}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>

              <div className="spacer" />

              <input
                type="text"
                placeholder="搜索姓名/教材/取书码..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ width: 220 }}
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="empty-state">暂无订单</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>教材</th>
                    <th>预订人</th>
                    <th>取书码</th>
                    <th>价格</th>
                    <th>状态</th>
                    <th>预订时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>
                        <div>{order.textbook_title}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{order.course_name}</div>
                      </td>
                      <td>
                        <div>{order.buyer_name}</div>
                        {order.buyer_phone && (
                          <div style={{ fontSize: 12, color: '#888' }}>{order.buyer_phone}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#667eea', fontSize: 16 }}>
                          {order.pickup_code}
                        </span>
                      </td>
                      <td>¥{order.actual_price.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge status-${order.status}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>
                        {order.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-success btn-small"
                              onClick={() => openPickupModal(order)}
                            >
                              确认取书
                            </button>
                            <button
                              className="btn btn-secondary btn-small"
                              onClick={() => handleRelease(order.textbook_id)}
                            >
                              释放
                            </button>
                          </div>
                        )}
                        {order.status === 'completed' && (
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleRefund(order.textbook_id)}
                          >
                            退款
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'textbooks' && (
          <div>
            <div className="filter-bar">
              <input
                type="text"
                placeholder="搜索教材名称/卖家..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ width: 250 }}
              />
              <div className="spacer" />
              <span style={{ fontSize: 13, color: '#888' }}>
                共 {filteredTextbooks.length} 本教材
              </span>
            </div>

            {filteredTextbooks.length === 0 ? (
              <div className="empty-state">暂无教材</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>教材名称</th>
                    <th>课程</th>
                    <th>版本</th>
                    <th>成色</th>
                    <th>价格</th>
                    <th>卖家</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTextbooks.map(book => (
                    <tr key={book.id}>
                      <td>#{book.id}</td>
                      <td>{book.title}</td>
                      <td>{book.course_name || '-'}</td>
                      <td>{book.edition || '-'}</td>
                      <td>{conditionLabels[book.condition] || book.condition}</td>
                      <td>¥{book.price.toFixed(2)}</td>
                      <td>{book.seller_name}</td>
                      <td>
                        <span className={`status-badge status-${book.status}`}>
                          {statusLabels[book.status]}
                        </span>
                      </td>
                      <td>
                        {book.status === 'locked' && (
                          <button
                            className="btn btn-secondary btn-small"
                            onClick={() => handleRelease(book.id)}
                          >
                            释放
                          </button>
                        )}
                        {(book.status === 'on_shelf' || book.status === 'locked') && (
                          <button
                            className="btn btn-danger btn-small"
                            style={{ marginLeft: 4 }}
                            onClick={() => handleCancel(book.id)}
                          >
                            下架
                          </button>
                        )}
                        {book.status === 'picked_up' && (
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleRefund(book.id)}
                          >
                            退款
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'settings' && config && (
          <SettingsForm config={config} onSaved={() => loadData()} />
        )}
      </div>

      {showPickupModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowPickupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>确认取书</h3>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="settlement-summary">
              <div className="settlement-item">
                <span className="label">教材名称</span>
                <span className="value">{selectedOrder.textbook_title}</span>
              </div>
              <div className="settlement-item">
                <span className="label">取书码</span>
                <span className="value" style={{ color: '#667eea' }}>{selectedOrder.pickup_code}</span>
              </div>
              <div className="settlement-item">
                <span className="label">预订人</span>
                <span className="value">{selectedOrder.buyer_name}</span>
              </div>
              <div className="settlement-item">
                <span className="label">原价</span>
                <span className="value">¥{selectedOrder.textbook_price?.toFixed(2)}</span>
              </div>
            </div>

            {selectedOrder.version_note && (
              <div className="version-warning">
                <strong>⚠️ 版本说明：</strong>{selectedOrder.version_note}
                <br />
                请与买家确认版本是否符合需求
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pickupForm.version_confirmed}
                  onChange={(e) => setPickupForm({ ...pickupForm, version_confirmed: e.target.checked })}
                />
                版本已确认，买家无异议
              </label>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={pickupForm.trade_in_used}
                  onChange={(e) => setPickupForm({ ...pickupForm, trade_in_used: e.target.checked })}
                />
                使用旧书换购抵扣
              </label>

              {pickupForm.trade_in_used && (
                <div className="trade-in-section" style={{ marginTop: 12 }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>旧书教材ID</label>
                      <input
                        type="number"
                        value={pickupForm.trade_in_textbook_id}
                        onChange={(e) => setPickupForm({ ...pickupForm, trade_in_textbook_id: e.target.value })}
                        placeholder="扫描或输入"
                      />
                    </div>
                    <div className="form-group">
                      <label>抵扣金额</label>
                      <input
                        type="number"
                        value={pickupForm.trade_in_value}
                        onChange={(e) => setPickupForm({ ...pickupForm, trade_in_value: e.target.value })}
                        placeholder="元"
                      />
                    </div>
                  </div>
                  {pickupForm.trade_in_value && (
                    <div style={{ fontSize: 14, marginTop: 8 }}>
                      实付金额：
                      <strong style={{ color: '#e65100', fontSize: 18 }}>
                        ¥{(selectedOrder.textbook_price - parseFloat(pickupForm.trade_in_value || 0)).toFixed(2)}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPickupModal(false)}>
                取消
              </button>
              <button className="btn btn-success" onClick={handleConfirmPickup} disabled={submitting}>
                {submitting ? '提交中...' : '确认完成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsForm({ config, onSaved }) {
  const [form, setForm] = useState({
    activity_name: config.activity_name,
    lock_expire_hours: config.lock_expire_hours,
    pickup_expire_hours: config.pickup_expire_hours,
    pickup_location: config.pickup_location,
    status: config.status,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await api.updateConfig(form)
      alert('保存成功')
      onSaved()
    } catch (e) {
      alert(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <div className="form-group">
        <label>活动名称</label>
        <input
          type="text"
          value={form.activity_name}
          onChange={(e) => setForm({ ...form, activity_name: e.target.value })}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>预订超时时间 (小时)</label>
          <input
            type="number"
            value={form.lock_expire_hours}
            onChange={(e) => setForm({ ...form, lock_expire_hours: parseInt(e.target.value) })}
          />
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            超时后自动释放库存
          </p>
        </div>
        <div className="form-group">
          <label>取书超时时间 (小时)</label>
          <input
            type="number"
            value={form.pickup_expire_hours}
            onChange={(e) => setForm({ ...form, pickup_expire_hours: parseInt(e.target.value) })}
          />
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            超时未取自动取消
          </p>
        </div>
      </div>

      <div className="form-group">
        <label>取书地点</label>
        <input
          type="text"
          value={form.pickup_location}
          onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>活动状态</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="active">进行中</option>
          <option value="ended">已结束</option>
        </select>
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? '保存中...' : '保存设置'}
      </button>
    </div>
  )
}

export default Admin
