import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, statusLabels, conditionLabels, formatDate } from '../utils/api.js'

function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [textbook, setTextbook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLockModal, setShowLockModal] = useState(false)
  const [lockForm, setLockForm] = useState({
    buyer_name: '',
    buyer_phone: '',
    buyer_student_id: '',
  })
  const [locking, setLocking] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [id])

  async function loadData() {
    try {
      const [textbookData, configData] = await Promise.all([
        api.getTextbook(id),
        api.getConfig(),
      ])
      setTextbook(textbookData)
      setConfig(configData)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function handleLock() {
    if (!lockForm.buyer_name.trim()) {
      setError('请输入预订人姓名')
      return
    }

    setLocking(true)
    setError('')

    try {
      const result = await api.lockTextbook(id, lockForm)
      setShowLockModal(false)
      alert(`预订成功！\n取书码: ${result.order.pickup_code}\n请在 ${config.lock_expire_hours} 小时内完成取书`)
      loadData()
    } catch (e) {
      setError(e.message)
    }
    setLocking(false)
  }

  if (loading) {
    return <div className="card">加载中...</div>
  }

  if (error && !textbook) {
    return <div className="card"><div className="alert alert-error">{error}</div></div>
  }

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← 返回列表
      </button>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>{textbook.title}</h2>
          <span className={`status-badge status-${textbook.status}`}>
            {statusLabels[textbook.status]}
          </span>
        </div>

        <div className="settlement-summary">
          <div className="settlement-item">
            <span className="label">课程</span>
            <span className="value">{textbook.course_name || '未指定'}</span>
          </div>
          <div className="settlement-item">
            <span className="label">版本</span>
            <span className="value">{textbook.edition || '未填写'}</span>
          </div>
          <div className="settlement-item">
            <span className="label">成色</span>
            <span className="value">{conditionLabels[textbook.condition] || textbook.condition}</span>
          </div>
          <div className="settlement-item">
            <span className="label">售价</span>
            <span className="value" style={{ color: '#e65100' }}>¥{textbook.price.toFixed(2)}</span>
          </div>
        </div>

        {textbook.version_note && (
          <div className="version-warning">
            <strong>⚠️ 版本说明：</strong>{textbook.version_note}
            <br />
            <span style={{ fontSize: 12 }}>请仔细核对版本信息，版本不符请在取书时提出</span>
          </div>
        )}

        {textbook.trade_in_value > 0 && (
          <div className="trade-in-section">
            <h4>🔄 换书抵扣</h4>
            <p style={{ fontSize: 14, marginBottom: 4 }}>
              支持用旧书换购，可抵扣 <strong>¥{textbook.trade_in_value.toFixed(2)}</strong>
            </p>
            <p style={{ fontSize: 12, color: '#666' }}>
              取书时请携带符合要求的旧书，现场核验后抵扣
            </p>
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #eee' }}>
          <h4 style={{ marginBottom: 12 }}>卖家信息</h4>
          <div className="settlement-summary">
            <div className="settlement-item">
              <span className="label">卖家姓名</span>
              <span className="value">{textbook.seller_name}</span>
            </div>
            {textbook.seller_phone && (
              <div className="settlement-item">
                <span className="label">联系电话</span>
                <span className="value">{textbook.seller_phone}</span>
              </div>
            )}
          </div>
        </div>

        {textbook.locked_by && (
          <div style={{ marginTop: 16, padding: 12, background: '#fff3e0', borderRadius: 8 }}>
            <strong>预订信息：</strong>
            <span style={{ marginLeft: 8 }}>{textbook.locked_by}</span>
            {textbook.locked_at && (
              <span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>
                预订于 {formatDate(textbook.locked_at)}
              </span>
            )}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
          {textbook.status === 'on_shelf' && (
            <button className="btn btn-primary" onClick={() => setShowLockModal(true)}>
              立即预订
            </button>
          )}
          {textbook.status === 'locked' && (
            <div className="alert alert-warning" style={{ flex: 1 }}>
              该书已被预订，请等待取书或选择其他教材
            </div>
          )}
          {textbook.status === 'picked_up' && (
            <div className="alert alert-success" style={{ flex: 1 }}>
              该书已完成交易
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
          上架时间: {formatDate(textbook.created_at)}
        </div>
      </div>

      {showLockModal && (
        <div className="modal-overlay" onClick={() => setShowLockModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>预订教材</h3>

            {textbook.version_note && (
              <div className="version-warning">
                <strong>⚠️ 版本提醒：</strong>{textbook.version_note}
                <br />
                请确认版本符合您的需求，取书时如版本不符可取消预订
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>预订人姓名 *</label>
              <input
                type="text"
                value={lockForm.buyer_name}
                onChange={(e) => setLockForm({ ...lockForm, buyer_name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>联系电话</label>
                <input
                  type="tel"
                  value={lockForm.buyer_phone}
                  onChange={(e) => setLockForm({ ...lockForm, buyer_phone: e.target.value })}
                  placeholder="方便联系"
                />
              </div>
              <div className="form-group">
                <label>学号</label>
                <input
                  type="text"
                  value={lockForm.buyer_student_id}
                  onChange={(e) => setLockForm({ ...lockForm, buyer_student_id: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>

            <div className="alert alert-info">
              <strong>预订须知：</strong>
              <ul style={{ marginTop: 6, paddingLeft: 20 }}>
                <li>预订后请在 {config?.lock_expire_hours || 24} 小时内取书</li>
                <li>取书时请携带取书码，现场核对版本</li>
                <li>版本不符可免费取消预订</li>
                <li>超时未取将自动释放库存</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowLockModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleLock} disabled={locking}>
                {locking ? '提交中...' : '确认预订'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookDetail
