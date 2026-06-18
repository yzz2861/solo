import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, conditionLabels } from '../utils/api.js'

function RegisterBook() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [step, setStep] = useState(1)
  const [sellerForm, setSellerForm] = useState({
    name: '',
    phone: '',
    student_id: '',
  })
  const [bookForm, setBookForm] = useState({
    title: '',
    course_id: '',
    edition: '',
    condition: 'good',
    price: '',
    version_note: '',
    trade_in_value: '',
  })
  const [sellerId, setSellerId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [showAddCourse, setShowAddCourse] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [])

  async function loadCourses() {
    try {
      const data = await api.getCourses()
      setCourses(data)
    } catch (e) {
      console.error('加载课程失败:', e)
    }
  }

  async function handleAddCourse() {
    if (!newCourseName.trim()) return
    try {
      const course = await api.addCourse(newCourseName.trim())
      setCourses([...courses, course])
      setBookForm({ ...bookForm, course_id: course.id })
      setNewCourseName('')
      setShowAddCourse(false)
    } catch (e) {
      alert(e.message)
    }
  }

  function validateSeller() {
    if (!sellerForm.name.trim()) {
      setError('请输入卖家姓名')
      return false
    }
    return true
  }

  function validateBook() {
    if (!bookForm.title.trim()) {
      setError('请输入教材名称')
      return false
    }
    if (!bookForm.price || parseFloat(bookForm.price) <= 0) {
      setError('请输入有效价格')
      return false
    }
    return true
  }

  async function handleNext() {
    setError('')
    if (!validateSeller()) return

    setSubmitting(true)
    try {
      const seller = await api.addSeller(sellerForm)
      setSellerId(seller.id)
      setStep(2)
    } catch (e) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  async function handleSubmit() {
    setError('')
    if (!validateBook()) return

    setSubmitting(true)
    try {
      const data = {
        ...bookForm,
        seller_id: sellerId,
        price: parseFloat(bookForm.price),
        trade_in_value: bookForm.trade_in_value ? parseFloat(bookForm.trade_in_value) : 0,
      }

      await api.addTextbook(data)
      setSuccess(true)
    } catch (e) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  function handleAddMore() {
    setSuccess(false)
    setBookForm({
      title: '',
      course_id: '',
      edition: '',
      condition: 'good',
      price: '',
      version_note: '',
      trade_in_value: '',
    })
  }

  if (success) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2>登记成功！</h2>
        <p style={{ color: '#666', margin: '16px 0' }}>
          教材已成功上架，等待买家预订
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={handleAddMore}>
            继续登记
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            返回列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <h2>登记教材</h2>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: step >= 1 ? '#667eea' : '#ddd',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600,
          }}>1</div>
          <div style={{ flex: 1, height: 2, background: step >= 2 ? '#667eea' : '#ddd', margin: '0 8px' }} />
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: step >= 2 ? '#667eea' : '#ddd',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600,
          }}>2</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>卖家信息</h3>

            <div className="form-group">
              <label>姓名 *</label>
              <input
                type="text"
                value={sellerForm.name}
                onChange={(e) => setSellerForm({ ...sellerForm, name: e.target.value })}
                placeholder="请输入您的姓名"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>联系电话</label>
                <input
                  type="tel"
                  value={sellerForm.phone}
                  onChange={(e) => setSellerForm({ ...sellerForm, phone: e.target.value })}
                  placeholder="方便后续联系"
                />
              </div>
              <div className="form-group">
                <label>学号</label>
                <input
                  type="text"
                  value={sellerForm.student_id}
                  onChange={(e) => setSellerForm({ ...sellerForm, student_id: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button className="btn btn-primary" onClick={handleNext} disabled={submitting}>
                {submitting ? '提交中...' : '下一步 →'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>教材信息</h3>

            <div className="form-group">
              <label>教材名称 *</label>
              <input
                type="text"
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                placeholder="如：高等数学（第七版）"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>所属课程</label>
                {showAddCourse ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="输入新课程名称"
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary btn-small" onClick={handleAddCourse}>添加</button>
                    <button className="btn btn-secondary btn-small" onClick={() => setShowAddCourse(false)}>取消</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={bookForm.course_id}
                      onChange={(e) => setBookForm({ ...bookForm, course_id: e.target.value })}
                      style={{ flex: 1 }}
                    >
                      <option value="">请选择课程</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button className="btn btn-secondary btn-small" onClick={() => setShowAddCourse(true)}>+</button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>版本 / 版次</label>
                <input
                  type="text"
                  value={bookForm.edition}
                  onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                  placeholder="如：第七版"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>成色</label>
                <select
                  value={bookForm.condition}
                  onChange={(e) => setBookForm({ ...bookForm, condition: e.target.value })}
                >
                  {Object.entries(conditionLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>售价 (元) *</label>
                <input
                  type="number"
                  value={bookForm.price}
                  onChange={(e) => setBookForm({ ...bookForm, price: e.target.value })}
                  placeholder="请输入售价"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-group">
              <label>版本说明 / 差异提醒</label>
              <textarea
                value={bookForm.version_note}
                onChange={(e) => setBookForm({ ...bookForm, version_note: e.target.value })}
                placeholder="如有版本差异请在此说明，如：与最新版内容基本一致，仅封面不同"
                rows="2"
              />
              <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                填写后买家预订时会看到版本提醒，避免版本纠纷
              </p>
            </div>

            <div className="form-group">
              <label>换书抵扣金额 (元)</label>
              <input
                type="number"
                value={bookForm.trade_in_value}
                onChange={(e) => setBookForm({ ...bookForm, trade_in_value: e.target.value })}
                placeholder="支持旧书换购的话填写抵扣金额"
                min="0"
                step="0.01"
              />
              <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                不支持换书可留空
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                ← 上一步
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '提交中...' : '确认登记'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RegisterBook
