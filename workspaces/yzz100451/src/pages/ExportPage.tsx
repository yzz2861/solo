import { useState, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { BODY_PART_LABELS, SEVERITY_LABELS, SEVERITY_COLORS, MOVEMENT_LABELS, PHOTO_SIDE_LABELS } from '@/utils/constants'
import { Printer, FileDown, AlertTriangle } from 'lucide-react'

export default function ExportPage() {
  const { feedbacks, discomforts, photos, styles, sizeCharts, getAlerts } = useStore()
  const [selectedStyleId, setSelectedStyleId] = useState('')
  const [selectedVersion, setSelectedVersion] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const alerts = getAlerts()
  const selectedStyle = styles.find(s => s.id === selectedStyleId)

  const filteredFeedbacks = feedbacks.filter(fb => {
    if (fb.styleId !== selectedStyleId) return false
    if (selectedVersion && fb.version !== selectedVersion) return false
    return true
  })

  const fbIds = new Set(filteredFeedbacks.map(fb => fb.id))
  const allDiscomforts = discomforts
    .filter(d => fbIds.has(d.feedbackId))
    .sort((a, b) => b.severity - a.severity)

  const feedbackMap = new Map(feedbacks.map(fb => [fb.id, fb]))
  const chartData = selectedStyleId && selectedVersion
    ? sizeCharts.filter(sc => sc.styleId === selectedStyleId && sc.version === selectedVersion)
    : []

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  const conflictAlertsForStyle = alerts.filter(
    a => a.type === 'conflict' && filteredFeedbacks.some(fb => a.relatedIds.includes(fb.id))
  )

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="font-serif text-2xl font-bold text-charcoal-900">修改单导出</h2>
          <p className="text-sm text-charcoal-500 mt-1">版师导出含原话和优先级的修改清单</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer size={16} /> 打印 / 导出PDF
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 no-print">
        <div>
          <label className="label-text">选择款号</label>
          <select className="input-field w-56" value={selectedStyleId} onChange={e => { setSelectedStyleId(e.target.value); setSelectedVersion('') }}>
            <option value="">请选择</option>
            {styles.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
          </select>
        </div>
        {selectedStyle && selectedStyle.versions.length > 1 && (
          <div>
            <label className="label-text">选择版本</label>
            <select className="input-field w-32" value={selectedVersion} onChange={e => setSelectedVersion(e.target.value)}>
              <option value="">全部版本</option>
              {selectedStyle.versions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        )}
      </div>

      {conflictAlertsForStyle.length > 0 && (
        <div className="space-y-2 no-print">
          {conflictAlertsForStyle.map(a => (
            <div key={a.id} className="bg-clay-50 border border-clay-200 rounded-lg px-4 py-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-clay-500 mt-0.5" />
              <span className="text-sm text-clay-700">{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {selectedStyleId && filteredFeedbacks.length > 0 && (
        <div ref={printRef}>
          <div className="card">
            <div className="border-b border-sand-200 pb-4 mb-6">
              <h3 className="font-serif text-xl font-bold text-charcoal-900">样衣修改单</h3>
              <div className="flex gap-6 mt-2 text-sm text-charcoal-500">
                <span>款号：{selectedStyle?.code}</span>
                <span>款名：{selectedStyle?.name}</span>
                <span>版本：{selectedVersion || '全部'}</span>
                <span>试穿人数：{filteredFeedbacks.length}</span>
                <span>生成时间：{formatDate(Date.now())}</span>
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="mb-6">
                <h4 className="section-title mb-3">尺码参考表</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-sand-50">
                        <th className="px-3 py-2 text-left text-charcoal-500 font-medium">尺码</th>
                        <th className="px-3 py-2 text-right text-charcoal-500 font-medium">领口</th>
                        <th className="px-3 py-2 text-right text-charcoal-500 font-medium">肩宽</th>
                        <th className="px-3 py-2 text-right text-charcoal-500 font-medium">胸围</th>
                        <th className="px-3 py-2 text-right text-charcoal-500 font-medium">腰围</th>
                        <th className="px-3 py-2 text-right text-charcoal-500 font-medium">臀围</th>
                        <th className="px-3 py-2 text-right text-charcoal-500 font-medium">袖长</th>
                        <th className="px-3 py-2 text-right text-charcoal-500 font-medium">裤长</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map(sc => (
                        <tr key={sc.id} className="border-t border-sand-100">
                          <td className="px-3 py-2 font-medium">{sc.size}</td>
                          <td className="px-3 py-2 text-right">{sc.neckline ?? '-'}</td>
                          <td className="px-3 py-2 text-right">{sc.shoulder ?? '-'}</td>
                          <td className="px-3 py-2 text-right">{sc.chest ?? '-'}</td>
                          <td className="px-3 py-2 text-right">{sc.waist ?? '-'}</td>
                          <td className="px-3 py-2 text-right">{sc.hip ?? '-'}</td>
                          <td className="px-3 py-2 text-right">{sc.sleeveLength ?? '-'}</td>
                          <td className="px-3 py-2 text-right">{sc.pantsLength ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h4 className="section-title mb-3">修改项清单（按严重程度降序）</h4>
              <div className="space-y-3">
                {allDiscomforts.map((d, idx) => {
                  const fb = feedbackMap.get(d.feedbackId)
                  if (!fb) return null
                  const fbPhotos = photos.filter(p => p.feedbackId === fb.id)
                  const isConflict = conflictAlertsForStyle.some(a => a.relatedIds.includes(d.id))

                  return (
                    <div key={d.id} className={`border rounded-lg p-4 ${isConflict ? 'border-clay-200 bg-clay-50/30' : 'border-sand-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-serif font-bold text-charcoal-300">#{idx + 1}</span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`badge-${d.bodyPart}`}>{BODY_PART_LABELS[d.bodyPart]}</span>
                              <span className={`badge ${SEVERITY_COLORS[d.severity]}`}>
                                {SEVERITY_LABELS[d.severity]} ({d.severity}/5)
                              </span>
                              {isConflict && (
                                <span className="badge bg-clay-100 text-clay-600">
                                  <AlertTriangle size={12} className="mr-1" /> 意见冲突
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-charcoal-700 mt-1.5">{d.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pl-9 space-y-2">
                        <div className="bg-sand-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-charcoal-400">试穿人原话</span>
                          <blockquote className="text-sm text-charcoal-700 italic mt-0.5">"{d.originalWords}"</blockquote>
                        </div>
                        <div className="flex gap-4 text-xs text-charcoal-400">
                          <span>试穿人：{fb.wearerName}</span>
                          <span>尺码：{fb.size}</span>
                          <span>身高：{fb.height}cm / 体重：{fb.weight}kg</span>
                          <span>动作：{fb.movements.map(m => MOVEMENT_LABELS[m]).join('、') || '-'}</span>
                        </div>
                        {fbPhotos.length > 0 && (
                          <div className="flex gap-2">
                            {fbPhotos.map(p => (
                              <div key={p.id} className="relative w-16 h-16 rounded overflow-hidden border border-sand-200 bg-sand-50">
                                <img src={p.url} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-px">
                                  {PHOTO_SIDE_LABELS[p.side]}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedStyleId && filteredFeedbacks.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-charcoal-400">该款号暂无试穿反馈记录</p>
        </div>
      )}

      {!selectedStyleId && (
        <div className="card text-center py-12">
          <FileDown size={40} className="mx-auto text-charcoal-200 mb-3" />
          <p className="text-charcoal-400">请选择款号以生成修改单</p>
        </div>
      )}
    </div>
  )
}
