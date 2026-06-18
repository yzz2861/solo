import { useState } from 'react'
import { UserCheck, MessageSquare, ThumbsUp, Edit3, XCircle, ArrowLeft, Filter, ChevronDown } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { ExpertOpinion } from '@/types'

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: '待评审',
  reviewing: '评审中',
  reviewed: '已评审',
}

const REVIEW_STATUS_CLASSES: Record<string, string> = {
  pending: 'badge bg-sandalwood-500/20 text-sandalwood-300',
  reviewing: 'badge bg-celadon-500/20 text-celadon-300',
  reviewed: 'badge bg-ink-600/30 text-ink-400',
}

const SEVERITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
}

const SEVERITY_CLASSES: Record<string, string> = {
  low: 'badge bg-celadon-500/20 text-celadon-300',
  medium: 'badge bg-sandalwood-400/20 text-sandalwood-300',
  high: 'badge bg-cinnabar-400/20 text-cinnabar-400',
  critical: 'badge bg-cinnabar-600/30 text-cinnabar-200 shadow-glow animate-glow',
}

const VERDICT_LABELS: Record<string, string> = {
  approve: '同意',
  modify: '需修改',
  reject: '驳回',
}

const VERDICT_CLASSES: Record<string, string> = {
  approve: 'badge bg-celadon-500/20 text-celadon-300',
  modify: 'badge bg-sandalwood-500/20 text-sandalwood-300',
  reject: 'badge bg-cinnabar-500/20 text-cinnabar-400',
}

const VERDICT_ICONS: Record<string, typeof ThumbsUp> = {
  approve: ThumbsUp,
  modify: Edit3,
  reject: XCircle,
}

const FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待评审' },
  { value: 'reviewing', label: '评审中' },
  { value: 'reviewed', label: '已评审' },
]

export default function ExpertReview() {
  const {
    reviewItems, diseases, components, photos, measurements,
    repairSuggestions, expertOpinions, addExpertOpinion, updateReviewItem,
    setSelectedComponentId,
  } = useStore()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [opinionForm, setOpinionForm] = useState<Record<string, { expertName: string; opinion: string; verdict: ExpertOpinion['verdict'] }>>({})

  const filtered = filter === 'all' ? reviewItems : reviewItems.filter(i => i.status === filter)

  const counts = {
    total: reviewItems.length,
    pending: reviewItems.filter(i => i.status === 'pending').length,
    reviewing: reviewItems.filter(i => i.status === 'reviewing').length,
    reviewed: reviewItems.filter(i => i.status === 'reviewed').length,
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  function getForm(reviewItemId: string) {
    if (!opinionForm[reviewItemId]) {
      return { expertName: '', opinion: '', verdict: 'approve' as ExpertOpinion['verdict'] }
    }
    return opinionForm[reviewItemId]
  }

  function updateForm(reviewItemId: string, updates: Partial<typeof opinionForm[string]>) {
    setOpinionForm(prev => ({
      ...prev,
      [reviewItemId]: { ...getForm(reviewItemId), ...updates },
    }))
  }

  function handleSubmitOpinion(reviewItemId: string) {
    const form = getForm(reviewItemId)
    if (!form.expertName || !form.opinion) return
    addExpertOpinion({
      id: `eo-${Date.now()}`,
      reviewItemId,
      expertName: form.expertName,
      opinion: form.opinion,
      verdict: form.verdict,
      createdAt: new Date().toISOString(),
    })
    const item = reviewItems.find(i => i.id === reviewItemId)
    if (item && item.status === 'pending') {
      updateReviewItem(reviewItemId, { status: 'reviewing' })
    }
    setOpinionForm(prev => {
      const next = { ...prev }
      delete next[reviewItemId]
      return next
    })
  }

  function handleNavigateBack() {
    setSelectedComponentId(null)
  }

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button className="btn-ghost flex items-center gap-1" onClick={handleNavigateBack}>
            <ArrowLeft size={18} /> 返回
          </button>
          <h1 className="section-title flex items-center gap-2">
            <UserCheck size={20} className="text-sandalwood-400" />
            专家评审台
          </h1>
        </div>

        <div className="glass-panel p-3 flex items-center gap-4 text-sm">
          <span className="text-ink-300">总计 <span className="text-ink-100 font-medium">{counts.total}</span></span>
          <span className="text-sandalwood-300">待评审 {counts.pending}</span>
          <span className="text-celadon-300">评审中 {counts.reviewing}</span>
          <span className="text-ink-400">已评审 {counts.reviewed}</span>
        </div>

        <div className="glass-panel p-3 flex items-center gap-2">
          <Filter size={16} className="text-ink-400" />
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={cn(
                'px-3 py-1 rounded-md text-xs transition-colors',
                filter === opt.value
                  ? 'bg-sandalwood-500/20 text-sandalwood-300'
                  : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/50'
              )}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(item => {
            const disease = diseases.find(d => d.id === item.diseaseId)
            const component = disease ? components.find(c => c.id === disease.componentId) : null
            const isExpanded = expandedId === item.id
            const itemPhotos = component ? photos.filter(p => p.componentId === component.id) : []
            const itemMeasurements = component ? measurements.filter(m => m.componentId === component.id) : []
            const itemRepairs = component ? repairSuggestions.filter(r => r.componentId === component.id) : []
            const itemOpinions = expertOpinions.filter(o => o.reviewItemId === item.id)

            return (
              <div key={item.id} className="glass-panel overflow-hidden">
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{item.title}</span>
                      {disease && <span className="text-xs text-ink-400">{disease.type}</span>}
                      {component && <span className="text-xs text-ink-500">{component.name}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {disease && (
                        <span className={SEVERITY_CLASSES[disease.severity]}>
                          {SEVERITY_LABELS[disease.severity]}
                        </span>
                      )}
                      <span className={REVIEW_STATUS_CLASSES[item.status]}>
                        {REVIEW_STATUS_LABELS[item.status]}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={cn('text-ink-400 transition-transform', isExpanded && 'rotate-180')}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-ink-700/50 p-4 space-y-4">
                    {disease && (
                      <div>
                        <h4 className="section-title text-xs">病害描述</h4>
                        <p className="text-sm text-ink-300">{disease.description}</p>
                      </div>
                    )}

                    {component && (
                      <div>
                        <h4 className="section-title text-xs">构件详情</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-ink-400">名称：</span>{component.name}</div>
                          <div><span className="text-ink-400">编号：</span>{component.code || '—'}</div>
                          <div><span className="text-ink-400">材质：</span>{component.material || '—'}</div>
                          <div><span className="text-ink-400">尺寸：</span>{component.dimensions || '—'}</div>
                        </div>
                      </div>
                    )}

                    {itemPhotos.length > 0 && (
                      <div>
                        <h4 className="section-title text-xs">构件照片</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {itemPhotos.map(p => (
                            <img
                              key={p.id}
                              src={p.thumbnail}
                              alt={p.description}
                              className="w-full rounded-lg"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {itemMeasurements.length > 0 && (
                      <div>
                        <h4 className="section-title text-xs">测量数据</h4>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-ink-400 border-b border-ink-700/50">
                              <th className="py-1 text-left">指标</th>
                              <th className="py-1 text-left">数值</th>
                              <th className="py-1 text-left">单位</th>
                              <th className="py-1 text-left">测量人</th>
                              <th className="py-1 text-left">日期</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itemMeasurements.map(m => (
                              <tr key={m.id} className="border-b border-ink-800">
                                <td className="py-1">{m.metricName}</td>
                                <td className="py-1">{m.value}</td>
                                <td className="py-1">{m.unit}</td>
                                <td className="py-1">{m.measuredBy}</td>
                                <td className="py-1 text-ink-400">{m.measuredAt.slice(0, 10)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {itemRepairs.length > 0 && (
                      <div>
                        <h4 className="section-title text-xs">修缮建议</h4>
                        {itemRepairs.map(r => (
                          <div key={r.id} className="bg-ink-800/50 rounded-lg p-3">
                            <p className="text-sm">{r.suggestion}</p>
                            <div className="flex items-center gap-2 text-xs text-ink-400 mt-1">
                              <span>{r.responsiblePerson}</span>
                              <span>{r.plannedDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <h4 className="section-title text-xs flex items-center gap-1">
                        <MessageSquare size={14} />
                        专家意见
                      </h4>
                      {itemOpinions.length > 0 ? (
                        <div className="space-y-2">
                          {itemOpinions.map(op => {
                            const VerdictIcon = VERDICT_ICONS[op.verdict]
                            return (
                              <div key={op.id} className="bg-ink-800/50 rounded-lg p-3 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{op.expertName}</span>
                                  <span className={VERDICT_CLASSES[op.verdict]}>
                                    <VerdictIcon size={12} className="inline mr-1" />
                                    {VERDICT_LABELS[op.verdict]}
                                  </span>
                                  <span className="text-xs text-ink-500 ml-auto">{op.createdAt.slice(0, 10)}</span>
                                </div>
                                <p className="text-sm text-ink-300">{op.opinion}</p>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-ink-500">暂无专家意见</p>
                      )}
                    </div>

                    <div className="border-t border-ink-700/50 pt-4 space-y-2">
                      <h4 className="section-title text-xs">提交评审意见</h4>
                      <input
                        className="input-field text-sm"
                        placeholder="专家姓名"
                        value={getForm(item.id).expertName}
                        onChange={e => updateForm(item.id, { expertName: e.target.value })}
                      />
                      <textarea
                        className="input-field text-sm min-h-[80px] resize-y"
                        placeholder="评审意见"
                        value={getForm(item.id).opinion}
                        onChange={e => updateForm(item.id, { opinion: e.target.value })}
                      />
                      <div className="flex items-center gap-3">
                        <select
                          className="input-field text-sm w-32"
                          value={getForm(item.id).verdict}
                          onChange={e => updateForm(item.id, { verdict: e.target.value as ExpertOpinion['verdict'] })}
                        >
                          <option value="approve">同意</option>
                          <option value="modify">需修改</option>
                          <option value="reject">驳回</option>
                        </select>
                        <button
                          className="btn-primary flex-1"
                          onClick={() => handleSubmitOpinion(item.id)}
                        >
                          提交意见
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="glass-panel p-8 text-center text-ink-400">
              暂无评审项目
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
