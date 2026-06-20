import { useState } from 'react'
import { useEstimateStore } from '@/store/useEstimateStore'
import { ANCHOR_LABELS, type EstimateRecord, type RiskLevel } from '@/types'
import { formatLength } from '@/utils/units'
import { useNavigate } from 'react-router-dom'
import { Trash2, ChevronDown, ChevronUp, MapPin, Anchor, FileText, Clock } from 'lucide-react'

const RISK_DOT: Record<RiskLevel, string> = {
  safe: 'bg-emerald-400',
  caution: 'bg-amber-400',
  danger: 'bg-red-400',
  no_anchor: 'bg-red-600',
}

const RISK_LABEL: Record<RiskLevel, string> = {
  safe: '安全',
  caution: '注意',
  danger: '危险',
  no_anchor: '不建议停泊',
}

function RecordDetail({ record }: { record: EstimateRecord }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
      {[
        ['水深', `${record.waterDepth} ${record.depthUnit === 'm' ? '米' : '英尺'}`],
        ['船长', `${record.boatLength} 米`],
        ['锚型', ANCHOR_LABELS[record.anchorType]],
        ['风力', `${record.windLevel} ${record.windUnit === 'beaufort' ? '蒲福' : '节'}`],
        ['浪高', `${record.waveHeight} ${record.waveUnit === 'm' ? '米' : '英尺'}`],
        ['停泊时间', `${record.mooringHours} 小时`],
        ['建议长度', formatLength(record.recommendedLength)],
        ['Scope', `${record.scopeRatio}:1`],
        ['操作范围', `${record.minLength.toFixed(1)} — ${record.maxLength.toFixed(1)} m`],
      ].map(([label, value]) => (
        <div key={label} className="flex items-center justify-between rounded-lg bg-slate-800/30 px-2 py-1.5">
          <span className="text-slate-500">{label}</span>
          <span className="font-medium text-slate-300">{value}</span>
        </div>
      ))}
      {record.warnings.length > 0 && (
        <div className="col-span-full mt-1 rounded-lg bg-amber-500/5 border border-amber-500/20 px-2 py-1.5">
          {record.warnings.map((w, i) => (
            <p key={i} className="text-amber-300/80">• {w}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Archive() {
  const { records, deleteRecord, loadRecord } = useEstimateStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const navigate = useNavigate()

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Anchor className="mb-4 h-12 w-12 text-slate-600" />
        <p className="mb-2 text-slate-400">暂无存档记录</p>
        <p className="text-sm text-slate-500">在锚链估算页面计算后点击"存档"保存记录</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 rounded-lg bg-cyan-600/20 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-600/30"
        >
          前往估算
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-white">俱乐部存档</h2>
        <span className="text-sm text-slate-400">{records.length} 条记录</span>
      </div>

      <div className="space-y-2">
        {records.map((record) => {
          const expanded = expandedId === record.id
          return (
            <div
              key={record.id}
              className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 shadow-lg shadow-black/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${RISK_DOT[record.riskLevel]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {record.location ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-white truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                        {record.location}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">未记录地点</span>
                    )}
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      record.riskLevel === 'safe' ? 'bg-emerald-500/10 text-emerald-400'
                        : record.riskLevel === 'caution' ? 'bg-amber-500/10 text-amber-400'
                          : record.riskLevel === 'danger' ? 'bg-red-500/10 text-red-400'
                            : 'bg-red-500/20 text-red-500'
                    }`}>
                      {RISK_LABEL[record.riskLevel]}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(record.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{formatLength(record.recommendedLength)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      loadRecord(record.id)
                      navigate('/')
                    }}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-cyan-300"
                    title="加载此记录"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteRecord(record.id)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="删除记录"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setExpandedId(expanded ? null : record.id)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {expanded && <RecordDetail record={record} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
