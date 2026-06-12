import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { BODY_PART_LABELS, MOVEMENT_LABELS, PHOTO_SIDE_LABELS, SIZES, BODY_PARTS, MOVEMENTS } from '@/utils/constants'
import type { BodyPart, Movement, PhotoSide, Feedback, DiscomfortItem, Photo } from '@/utils/types'
import { detectAlerts } from '@/utils/alertEngine'
import { Plus, X, AlertTriangle, Info, Camera, ChevronDown, ChevronUp, Trash2, Check } from 'lucide-react'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface DiscomfortForm {
  bodyPart: BodyPart | ''
  description: string
  originalWords: string
  severity: number
}

interface PhotoForm {
  url: string
  side: PhotoSide | ''
}

export default function FeedbackForm() {
  const { styles, addStyle, feedbacks, discomforts, photos, sizeCharts, addFeedback, deleteFeedback } = useStore()

  const [styleCode, setStyleCode] = useState('')
  const [styleName, setStyleName] = useState('')
  const [version, setVersion] = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [selectedStyleId, setSelectedStyleId] = useState('')
  const [wearerName, setWearerName] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [size, setSize] = useState('')
  const [selectedMovements, setSelectedMovements] = useState<Movement[]>([])
  const [overallComment, setOverallComment] = useState('')
  const [discomfortForms, setDiscomfortForms] = useState<DiscomfortForm[]>([
    { bodyPart: '', description: '', originalWords: '', severity: 3 },
  ])
  const [photoForms, setPhotoForms] = useState<PhotoForm[]>([{ url: '', side: '' }])
  const [liveAlerts, setLiveAlerts] = useState<ReturnType<typeof detectAlerts>>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [showStyleList, setShowStyleList] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleSelectStyle = (id: string) => {
    const style = styles.find(s => s.id === id)
    if (style) {
      setSelectedStyleId(id)
      setStyleCode(style.code)
      setStyleName(style.name)
      setVersion(style.versions[0] || '')
    }
    setShowStyleList(false)
  }

  const handleNewStyle = () => {
    if (!styleCode.trim()) return
    const id = genId()
    const v = newVersion.trim() || 'V1'
    addStyle({ id, code: styleCode.trim(), name: styleName.trim() || styleCode.trim(), versions: [v] })
    setSelectedStyleId(id)
    setVersion(v)
    setNewVersion('')
  }

  const toggleMovement = (m: Movement) => {
    setSelectedMovements(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
  }

  const addDiscomfortRow = () => {
    setDiscomfortForms(prev => [...prev, { bodyPart: '', description: '', originalWords: '', severity: 3 }])
  }

  const removeDiscomfortRow = (idx: number) => {
    setDiscomfortForms(prev => prev.filter((_, i) => i !== idx))
  }

  const updateDiscomfort = (idx: number, field: keyof DiscomfortForm, value: string | number) => {
    setDiscomfortForms(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  const addPhotoRow = () => {
    setPhotoForms(prev => [...prev, { url: '', side: '' }])
  }

  const removePhotoRow = (idx: number) => {
    setPhotoForms(prev => prev.filter((_, i) => i !== idx))
  }

  const updatePhoto = (idx: number, field: keyof PhotoForm, value: string) => {
    setPhotoForms(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const runLiveAlerts = () => {
    if (!selectedStyleId) { setLiveAlerts([]); return }
    const tempFeedback: Feedback = {
      id: 'temp',
      styleId: selectedStyleId,
      version,
      wearerName,
      height: Number(height) || 0,
      weight: Number(weight) || 0,
      size,
      movements: selectedMovements,
      overallComment,
      createdAt: Date.now(),
    }
    const tempPhotos: Photo[] = photoForms
      .filter(p => p.url)
      .map(p => ({ id: genId(), feedbackId: 'temp', url: p.url, side: p.side }))
    const tempDiscomforts: DiscomfortItem[] = discomfortForms
      .filter(d => d.bodyPart)
      .map(d => ({
        id: genId(),
        feedbackId: 'temp',
        bodyPart: d.bodyPart as BodyPart,
        description: d.description,
        originalWords: d.originalWords,
        severity: d.severity,
      }))
    const alerts = detectAlerts(tempFeedback, tempPhotos, tempDiscomforts, feedbacks, discomforts, photos, styles, sizeCharts)
    setLiveAlerts(alerts)
  }

  const handleSubmit = () => {
    if (!selectedStyleId || !wearerName.trim() || !size) return

    const fbId = genId()
    const feedback: Feedback = {
      id: fbId,
      styleId: selectedStyleId,
      version,
      wearerName: wearerName.trim(),
      height: Number(height) || 0,
      weight: Number(weight) || 0,
      size,
      movements: selectedMovements,
      overallComment,
      createdAt: Date.now(),
    }
    const newDiscomforts: DiscomfortItem[] = discomfortForms
      .filter(d => d.bodyPart && d.description)
      .map(d => ({
        id: genId(),
        feedbackId: fbId,
        bodyPart: d.bodyPart as BodyPart,
        description: d.description,
        originalWords: d.originalWords || d.description,
        severity: d.severity,
      }))
    const newPhotos: Photo[] = photoForms
      .filter(p => p.url)
      .map(p => ({
        id: genId(),
        feedbackId: fbId,
        url: p.url,
        side: p.side,
      }))

    addFeedback(feedback, newDiscomforts, newPhotos)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)

    setWearerName('')
    setHeight('')
    setWeight('')
    setSize('')
    setSelectedMovements([])
    setOverallComment('')
    setDiscomfortForms([{ bodyPart: '', description: '', originalWords: '', severity: 3 }])
    setPhotoForms([{ url: '', side: '' }])
    setLiveAlerts([])
  }

  const alertIcon = (type: string) => {
    if (type === 'conflict') return <AlertTriangle size={16} className="text-clay-500" />
    return <Info size={16} className="text-indigo-500" />
  }

  const alertBg = (type: string) => {
    if (type === 'conflict') return 'bg-clay-50 border-clay-200'
    if (type === 'missingSize') return 'bg-amber-50 border-amber-200'
    return 'bg-indigo-50 border-indigo-200'
  }

  const recentFeedbacks = feedbacks.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-charcoal-900">反馈录入</h2>
          <p className="text-sm text-charcoal-500 mt-1">录入样衣试穿反馈，系统自动检测异常</p>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary text-sm flex items-center gap-2">
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          最近录入
        </button>
      </div>

      {showHistory && recentFeedbacks.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-3">最近录入记录</h3>
          <div className="space-y-2">
            {recentFeedbacks.map(fb => {
              const style = styles.find(s => s.id === fb.styleId)
              const fbDiscomforts = discomforts.filter(d => d.feedbackId === fb.id)
              return (
                <div key={fb.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-sand-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-charcoal-700">{style?.code}</span>
                    <span className="text-xs text-charcoal-400">{fb.version}</span>
                    <span className="text-sm text-charcoal-600">{fb.wearerName}</span>
                    <span className="badge bg-sand-200 text-charcoal-600">{fb.size}</span>
                    {fbDiscomforts.map(d => (
                      <span key={d.id} className={`badge-${d.bodyPart}`}>{BODY_PART_LABELS[d.bodyPart]}</span>
                    ))}
                  </div>
                  <button onClick={() => deleteFeedback(fb.id)} className="text-charcoal-300 hover:text-clay-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 animate-slide-in">
          <Check size={18} className="text-green-600" />
          <span className="text-sm text-green-700 font-medium">反馈提交成功！数据已保存。</span>
        </div>
      )}

      {liveAlerts.length > 0 && (
        <div className="space-y-2">
          {liveAlerts.map(a => (
            <div key={a.id} className={`border rounded-lg px-4 py-3 flex items-start gap-2 ${alertBg(a.type)} ${a.type === 'conflict' ? 'animate-pulse-alert' : ''}`}>
              {alertIcon(a.type)}
              <span className="text-sm">{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="section-title mb-4">样衣信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">款号</label>
            <div className="flex gap-2">
              <input className="input-field flex-1" placeholder="如 AW2024-001" value={styleCode} onChange={e => setStyleCode(e.target.value)} />
              <button onClick={() => setShowStyleList(!showStyleList)} className="btn-secondary text-xs px-3">已有款</button>
            </div>
            {showStyleList && styles.length > 0 && (
              <div className="mt-1 border rounded-lg bg-white shadow-sm max-h-32 overflow-y-auto">
                {styles.map(s => (
                  <button key={s.id} onClick={() => handleSelectStyle(s.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-sand-50 flex items-center gap-2">
                    <span className="font-medium">{s.code}</span>
                    <span className="text-xs text-charcoal-400">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label-text">款名</label>
            <input className="input-field" placeholder="如 修身西装外套" value={styleName} onChange={e => setStyleName(e.target.value)} />
          </div>
          <div>
            <label className="label-text">版本</label>
            {selectedStyleId && styles.find(s => s.id === selectedStyleId) ? (
              <select className="input-field" value={version} onChange={e => setVersion(e.target.value)}>
                {styles.find(s => s.id === selectedStyleId)!.versions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input className="input-field flex-1" placeholder="如 V1" value={newVersion} onChange={e => setNewVersion(e.target.value)} />
                <button onClick={handleNewStyle} className="btn-secondary text-xs px-3">新建</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-4">试穿人信息</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="label-text">姓名</label>
            <input className="input-field" placeholder="试穿人" value={wearerName} onChange={e => setWearerName(e.target.value)} />
          </div>
          <div>
            <label className="label-text">身高 (cm)</label>
            <input className="input-field" type="number" placeholder="165" value={height} onChange={e => setHeight(e.target.value)} />
          </div>
          <div>
            <label className="label-text">体重 (kg)</label>
            <input className="input-field" type="number" placeholder="55" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="label-text">尺码</label>
            <select className="input-field" value={size} onChange={e => setSize(e.target.value)}>
              <option value="">选择尺码</option>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-4">活动动作</h3>
        <div className="flex flex-wrap gap-2">
          {MOVEMENTS.map(m => (
            <button
              key={m}
              onClick={() => toggleMovement(m)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedMovements.includes(m)
                  ? 'bg-charcoal-900 text-white shadow-sm'
                  : 'bg-sand-100 text-charcoal-600 hover:bg-sand-200'
              }`}
            >
              {MOVEMENT_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-4">不适位置</h3>
        <div className="space-y-4">
          {discomfortForms.map((df, idx) => (
            <div key={idx} className="border border-sand-200 rounded-lg p-4 space-y-3 bg-sand-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-charcoal-400">不适项 #{idx + 1}</span>
                {discomfortForms.length > 1 && (
                  <button onClick={() => removeDiscomfortRow(idx)} className="text-charcoal-300 hover:text-clay-500">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {BODY_PARTS.map(bp => (
                  <button
                    key={bp}
                    onClick={() => updateDiscomfort(idx, 'bodyPart', bp)}
                    className={`badge transition-all duration-200 cursor-pointer ${
                      df.bodyPart === bp ? `badge-${bp} ring-2 ring-offset-1 ring-current` : 'bg-sand-100 text-charcoal-500 hover:bg-sand-200'
                    }`}
                  >
                    {BODY_PART_LABELS[bp]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">不适描述</label>
                  <input className="input-field" placeholder="如 腰部太紧，扣子扣不上" value={df.description} onChange={e => updateDiscomfort(idx, 'description', e.target.value)} />
                </div>
                <div>
                  <label className="label-text">原话</label>
                  <input className="input-field" placeholder="试穿人原话，如 腰这里勒得慌" value={df.originalWords} onChange={e => updateDiscomfort(idx, 'originalWords', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label-text">严重程度：{df.severity}/5</label>
                <input type="range" min={1} max={5} value={df.severity} onChange={e => updateDiscomfort(idx, 'severity', Number(e.target.value))} className="w-full accent-charcoal-900" />
                <div className="flex justify-between text-xs text-charcoal-400 mt-1">
                  <span>轻微</span><span>较轻</span><span>一般</span><span>较重</span><span>严重</span>
                </div>
              </div>
            </div>
          ))}
          <button onClick={addDiscomfortRow} className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
            <Plus size={16} /> 添加不适项
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-4 flex items-center gap-2">
          <Camera size={18} /> 试穿照片
        </h3>
        <div className="space-y-3">
          {photoForms.map((pf, idx) => (
            <div key={idx} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="label-text">照片链接</label>
                <input className="input-field" placeholder="粘贴照片 URL" value={pf.url} onChange={e => updatePhoto(idx, 'url', e.target.value)} />
              </div>
              <div className="w-28">
                <label className="label-text">正反面</label>
                <select className="input-field" value={pf.side} onChange={e => updatePhoto(idx, 'side', e.target.value)}>
                  {Object.entries(PHOTO_SIDE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {photoForms.length > 1 && (
                <button onClick={() => removePhotoRow(idx)} className="text-charcoal-300 hover:text-clay-500 mb-2">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addPhotoRow} className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
            <Plus size={16} /> 添加照片
          </button>
        </div>
      </div>

      <div>
        <label className="label-text">总体评价</label>
        <textarea className="input-field min-h-[80px]" placeholder="对整体穿着感受的补充说明..." value={overallComment} onChange={e => setOverallComment(e.target.value)} />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={runLiveAlerts} className="btn-secondary flex items-center gap-2">
          <AlertTriangle size={16} /> 检查异常
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedStyleId || !wearerName.trim() || !size}
          className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check size={16} /> 提交反馈
        </button>
      </div>
    </div>
  )
}
