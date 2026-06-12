import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { BODY_PART_LABELS, BODY_PARTS, SEVERITY_LABELS } from '@/utils/constants'
import type { BodyPart } from '@/utils/types'
import { Flag, TrendingUp, BarChart3, Users } from 'lucide-react'

const PART_COLORS: Record<BodyPart, string> = {
  neckline: '#9333ea',
  shoulder: '#2563eb',
  chest: '#db2777',
  waist: '#d97706',
  hip: '#0d9488',
  sleeveLength: '#3d5a80',
  pantsLength: '#059669',
  armhole: '#ea580c',
  backWidth: '#0891b2',
}

export default function AnalyticsPage() {
  const { styles, feedbacks, discomforts, priorityMarks, togglePriority, getHighFrequencyParts } = useStore()
  const [selectedStyleId, setSelectedStyleId] = useState('')

  const freqData = getHighFrequencyParts(selectedStyleId || undefined)
  const totalCount = freqData.reduce((sum, d) => sum + d.count, 0)

  const avgSeverityByPart: Record<string, number> = {}
  const relevantFbIds = selectedStyleId
    ? new Set(feedbacks.filter(fb => fb.styleId === selectedStyleId).map(fb => fb.id))
    : new Set(feedbacks.map(fb => fb.id))

  for (const bp of BODY_PARTS) {
    const parts = discomforts.filter(d => d.bodyPart === bp && relevantFbIds.has(d.feedbackId))
    if (parts.length > 0) {
      avgSeverityByPart[bp] = parts.reduce((sum, d) => sum + d.severity, 0) / parts.length
    }
  }

  const topParts = freqData.slice(0, 5)
  const maxCount = topParts.length > 0 ? topParts[0].count : 1

  const isMarked = (styleId: string, bp: BodyPart) =>
    priorityMarks.some(m => m.styleId === styleId && m.bodyPart === bp)

  const totalFeedbacks = selectedStyleId
    ? feedbacks.filter(fb => fb.styleId === selectedStyleId).length
    : feedbacks.length

  const uniqueWearers = selectedStyleId
    ? new Set(feedbacks.filter(fb => fb.styleId === selectedStyleId).map(fb => fb.wearerName)).size
    : new Set(feedbacks.map(fb => fb.wearerName)).size

  const allDiscomfortCount = selectedStyleId
    ? discomforts.filter(d => relevantFbIds.has(d.feedbackId)).length
    : discomforts.length

  const avgSeverityAll = allDiscomfortCount > 0
    ? (discomforts
        .filter(d => relevantFbIds.has(d.feedbackId))
        .reduce((sum, d) => sum + d.severity, 0) / allDiscomfortCount).toFixed(1)
    : '0'

  const styleVersions = selectedStyleId
    ? styles.find(s => s.id === selectedStyleId)?.versions || []
    : []

  const versionComparison = styleVersions.length >= 2
    ? styleVersions.map(v => {
        const vFbIds = new Set(
          feedbacks.filter(fb => fb.styleId === selectedStyleId && fb.version === v).map(fb => fb.id)
        )
        const vDiscomforts = discomforts.filter(d => vFbIds.has(d.feedbackId))
        const byPart: Partial<Record<BodyPart, number>> = {}
        for (const bp of BODY_PARTS) {
          const count = vDiscomforts.filter(d => d.bodyPart === bp).length
          if (count > 0) byPart[bp] = count
        }
        return { version: v, total: vDiscomforts.length, byPart }
      })
    : []

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h2 className="font-serif text-2xl font-bold text-charcoal-900">高频问题统计</h2>
        <p className="text-sm text-charcoal-500 mt-1">设计总监查看高频问题分布，决定下轮优先改版部位</p>
      </div>

      <div className="flex items-center gap-4">
        <label className="label-text mb-0">筛选款号</label>
        <select className="input-field w-56" value={selectedStyleId} onChange={e => setSelectedStyleId(e.target.value)}>
          <option value="">全部款号</option>
          {styles.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Users size={20} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-charcoal-400">试穿人次数</p>
            <p className="text-xl font-bold text-charcoal-900">{totalFeedbacks}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Users size={20} className="text-teal-500" />
          </div>
          <div>
            <p className="text-xs text-charcoal-400">不同试穿人</p>
            <p className="text-xl font-bold text-charcoal-900">{uniqueWearers}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <BarChart3 size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-charcoal-400">不适项总数</p>
            <p className="text-xl font-bold text-charcoal-900">{allDiscomfortCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-clay-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-clay-500" />
          </div>
          <div>
            <p className="text-xs text-charcoal-400">平均严重度</p>
            <p className="text-xl font-bold text-charcoal-900">{avgSeverityAll}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-4">部位问题频次</h3>
        {freqData.length === 0 ? (
          <p className="text-center text-charcoal-400 py-8">暂无数据</p>
        ) : (
          <div className="space-y-3">
            {freqData.map(d => {
              const isHighFreq = d.count >= 3
              const pct = totalCount > 0 ? (d.count / totalCount) * 100 : 0
              const barWidth = maxCount > 0 ? (d.count / maxCount) * 100 : 0

              return (
                <div key={d.bodyPart} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-charcoal-700 flex items-center gap-1.5">
                    <span className={`badge-${d.bodyPart} text-xs`}>{BODY_PART_LABELS[d.bodyPart]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-7 bg-sand-100 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-500 flex items-center px-2"
                        style={{ width: `${barWidth}%`, backgroundColor: PART_COLORS[d.bodyPart] + '30', borderLeft: `3px solid ${PART_COLORS[d.bodyPart]}` }}
                      >
                        <span className="text-xs font-bold" style={{ color: PART_COLORS[d.bodyPart] }}>{d.count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-12 text-right text-xs text-charcoal-400">{pct.toFixed(0)}%</div>
                  <div className="w-20 text-right text-xs text-charcoal-400">
                    均重 {avgSeverityByPart[d.bodyPart]?.toFixed(1) || '-'}
                  </div>
                  <div className="w-16 text-right">
                    {isHighFreq && (
                      <span className="badge bg-clay-100 text-clay-600 text-xs animate-pulse-alert">高频</span>
                    )}
                  </div>
                  {selectedStyleId && (
                    <button
                      onClick={() => togglePriority(selectedStyleId, d.bodyPart)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        isMarked(selectedStyleId, d.bodyPart)
                          ? 'bg-clay-500 text-white'
                          : 'bg-sand-100 text-charcoal-300 hover:bg-sand-200 hover:text-charcoal-500'
                      }`}
                      title="标记为下轮优先改"
                    >
                      <Flag size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedStyleId && priorityMarks.filter(m => m.styleId === selectedStyleId).length > 0 && (
        <div className="card border-clay-200 bg-clay-50/30">
          <h3 className="section-title mb-3 flex items-center gap-2">
            <Flag size={18} className="text-clay-500" /> 下轮优先改版部位
          </h3>
          <div className="flex flex-wrap gap-2">
            {priorityMarks
              .filter(m => m.styleId === selectedStyleId)
              .map(m => (
                <span key={m.bodyPart} className={`badge-${m.bodyPart} flex items-center gap-1.5`}>
                  <Flag size={12} className="text-clay-500" />
                  {BODY_PART_LABELS[m.bodyPart]}
                  <button onClick={() => togglePriority(selectedStyleId, m.bodyPart)} className="ml-1 text-charcoal-300 hover:text-charcoal-600">
                    ×
                  </button>
                </span>
              ))}
          </div>
        </div>
      )}

      {versionComparison.length >= 2 && (
        <div className="card">
          <h3 className="section-title mb-4">版本间问题对比</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sand-50">
                  <th className="px-3 py-2 text-left text-charcoal-500 font-medium">版本</th>
                  <th className="px-3 py-2 text-center text-charcoal-500 font-medium">问题总数</th>
                  {BODY_PARTS.map(bp => (
                    <th key={bp} className="px-3 py-2 text-center text-charcoal-500 font-medium">{BODY_PART_LABELS[bp]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {versionComparison.map(vc => (
                  <tr key={vc.version} className="border-t border-sand-100">
                    <td className="px-3 py-2 font-medium">{vc.version}</td>
                    <td className="px-3 py-2 text-center">{vc.total}</td>
                    {BODY_PARTS.map(bp => (
                      <td key={bp} className="px-3 py-2 text-center">
                        {vc.byPart[bp] ? (
                          <span className={`badge-${bp} text-xs`}>{vc.byPart[bp]}</span>
                        ) : (
                          <span className="text-charcoal-200">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {freqData.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-4">严重程度分布</h3>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(sev => {
              const count = discomforts.filter(d => relevantFbIds.has(d.feedbackId) && d.severity === sev).length
              return (
                <div key={sev} className="text-center">
                  <div className="text-2xl font-bold text-charcoal-900">{count}</div>
                  <div className="text-xs text-charcoal-400 mt-1">{SEVERITY_LABELS[sev]}</div>
                  <div className="h-1.5 bg-sand-100 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: allDiscomfortCount > 0 ? `${(count / allDiscomfortCount) * 100}%` : '0%',
                        backgroundColor: sev <= 2 ? '#22c55e' : sev <= 3 ? '#f59e0b' : '#c44536',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
