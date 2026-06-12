import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { BODY_PART_LABELS, BODY_PARTS, SEVERITY_LABELS, SEVERITY_COLORS, MOVEMENT_LABELS, PHOTO_SIDE_LABELS } from '@/utils/constants'
import type { BodyPart } from '@/utils/types'
import { AlertTriangle, User, ChevronDown, ChevronUp, Image } from 'lucide-react'

export default function GroupedView() {
  const { feedbacks, discomforts, photos, styles, getAlerts } = useStore()
  const [activeTab, setActiveTab] = useState<BodyPart>(BODY_PARTS[0])
  const [filterStyleId, setFilterStyleId] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const alerts = getAlerts()
  const conflictAlerts = alerts.filter(a => a.type === 'conflict')

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredFeedbacks = feedbacks.filter(fb => {
    if (filterStyleId && fb.styleId !== filterStyleId) return false
    return true
  })

  const filteredFbIds = new Set(filteredFeedbacks.map(fb => fb.id))

  const discomfortsForPart = discomforts.filter(
    d => d.bodyPart === activeTab && filteredFbIds.has(d.feedbackId)
  )

  const feedbackMap = new Map(feedbacks.map(fb => [fb.id, fb]))
  const styleMap = new Map(styles.map(s => [s.id, s]))

  const tabCounts: Record<string, number> = {}
  for (const bp of BODY_PARTS) {
    tabCounts[bp] = discomforts.filter(d => d.bodyPart === bp && filteredFbIds.has(d.feedbackId)).length
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h2 className="font-serif text-2xl font-bold text-charcoal-900">部位分组查看</h2>
        <p className="text-sm text-charcoal-500 mt-1">按身体部位分组查看所有试穿反馈，冲突项高亮标注</p>
      </div>

      {conflictAlerts.length > 0 && (
        <div className="space-y-2">
          {conflictAlerts.map(a => (
            <div key={a.id} className="bg-clay-50 border border-clay-200 rounded-lg px-4 py-3 flex items-start gap-2 animate-pulse-alert">
              <AlertTriangle size={16} className="text-clay-500 mt-0.5 shrink-0" />
              <span className="text-sm text-clay-700">{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className="label-text mb-0">筛选款号</label>
        <select className="input-field w-48" value={filterStyleId} onChange={e => setFilterStyleId(e.target.value)}>
          <option value="">全部款号</option>
          {styles.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
        </select>
      </div>

      <div className="flex gap-1 border-b border-sand-300 overflow-x-auto pb-px">
        {BODY_PARTS.map(bp => (
          <button
            key={bp}
            onClick={() => setActiveTab(bp)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 relative ${
              activeTab === bp
                ? `badge-${bp} rounded-t-lg border-b-2 border-current`
                : 'text-charcoal-400 hover:text-charcoal-600'
            }`}
          >
            {BODY_PART_LABELS[bp]}
            {tabCounts[bp] > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({tabCounts[bp]})</span>
            )}
          </button>
        ))}
      </div>

      {discomfortsForPart.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-charcoal-400">该部位暂无反馈记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {discomfortsForPart
            .sort((a, b) => b.severity - a.severity)
            .map(d => {
              const fb = feedbackMap.get(d.feedbackId)
              if (!fb) return null
              const style = styleMap.get(fb.styleId)
              const isConflict = conflictAlerts.some(a => a.relatedIds.includes(d.id))
              const isExpanded = expandedCards.has(d.id)
              const fbPhotos = photos.filter(p => p.feedbackId === fb.id)

              return (
                <div
                  key={d.id}
                  className={`card transition-all duration-200 ${isConflict ? 'border-clay-300 shadow-clay-200/20 shadow-md' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isConflict && (
                          <span className="badge bg-clay-100 text-clay-600 animate-pulse-alert">
                            <AlertTriangle size={12} className="mr-1" /> 冲突
                          </span>
                        )}
                        <span className={`badge-${d.bodyPart}`}>{BODY_PART_LABELS[d.bodyPart]}</span>
                        <span className={`badge ${SEVERITY_COLORS[d.severity]}`}>
                          {SEVERITY_LABELS[d.severity]} ({d.severity}/5)
                        </span>
                      </div>
                      <p className="text-sm text-charcoal-700 mt-2">{d.description}</p>
                      {d.originalWords && d.originalWords !== d.description && (
                        <blockquote className="mt-2 pl-3 border-l-2 border-sand-300 text-xs text-charcoal-500 italic">
                          "{d.originalWords}"
                        </blockquote>
                      )}
                    </div>
                    <button onClick={() => toggleCard(d.id)} className="text-charcoal-300 hover:text-charcoal-600 ml-3 mt-1">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-sand-200 space-y-3 animate-slide-in">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-charcoal-400 text-xs">款号</span>
                          <p className="font-medium">{style?.code} ({fb.version})</p>
                        </div>
                        <div>
                          <span className="text-charcoal-400 text-xs">试穿人</span>
                          <p className="font-medium flex items-center gap-1"><User size={12} /> {fb.wearerName}</p>
                        </div>
                        <div>
                          <span className="text-charcoal-400 text-xs">尺码</span>
                          <p className="font-medium">{fb.size}</p>
                        </div>
                        <div>
                          <span className="text-charcoal-400 text-xs">身高/体重</span>
                          <p>{fb.height}cm / {fb.weight}kg</p>
                        </div>
                        <div>
                          <span className="text-charcoal-400 text-xs">活动动作</span>
                          <p>{fb.movements.map(m => MOVEMENT_LABELS[m]).join('、') || '-'}</p>
                        </div>
                        <div>
                          <span className="text-charcoal-400 text-xs">录入时间</span>
                          <p>{new Date(fb.createdAt).toLocaleString('zh-CN')}</p>
                        </div>
                      </div>

                      {fbPhotos.length > 0 && (
                        <div>
                          <span className="text-charcoal-400 text-xs flex items-center gap-1 mb-2"><Image size={12} /> 试穿照片</span>
                          <div className="flex gap-2 flex-wrap">
                            {fbPhotos.map(p => (
                              <div key={p.id} className="relative w-24 h-24 rounded-lg overflow-hidden border border-sand-200 bg-sand-50">
                                <img src={p.url} alt="试穿照片" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                                  {PHOTO_SIDE_LABELS[p.side]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {fb.overallComment && (
                        <div>
                          <span className="text-charcoal-400 text-xs">总体评价</span>
                          <p className="text-sm text-charcoal-600 mt-1">{fb.overallComment}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
