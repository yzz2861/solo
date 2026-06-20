import { useNavigate } from 'react-router-dom'
import { useEstimateStore } from '@/store/useEstimateStore'
import { ANCHOR_LABELS, type RiskLevel } from '@/types'
import { formatLength, getWindDesc, toBeaufort } from '@/utils/units'
import { Printer, ArrowLeft, ShieldCheck, ShieldAlert, AlertTriangle, ShieldX } from 'lucide-react'

const RISK_ICON: Record<RiskLevel, React.ElementType> = {
  safe: ShieldCheck,
  caution: ShieldAlert,
  danger: AlertTriangle,
  no_anchor: ShieldX,
}

const RISK_LABEL: Record<RiskLevel, string> = {
  safe: '安全',
  caution: '注意',
  danger: '危险',
  no_anchor: '不建议停泊',
}

const RISK_COLOR: Record<RiskLevel, string> = {
  safe: 'text-emerald-400',
  caution: 'text-amber-400',
  danger: 'text-red-400',
  no_anchor: 'text-red-500',
}

export default function Report() {
  const { input, result } = useEstimateStore()
  const navigate = useNavigate()

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="mb-4 text-slate-400">请先在锚链估算页面输入参数并计算</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-cyan-600/20 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-600/30"
        >
          前往估算
        </button>
      </div>
    )
  }

  const beaufort = toBeaufort(input.windLevel, input.windUnit)
  const RiskIcon = RISK_ICON[result.riskLevel]
  const isNoAnchor = result.riskLevel === 'no_anchor'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          返回估算
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-700/30 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
        >
          <Printer className="h-4 w-4" />
          打印报告
        </button>
      </div>

      <div className="print-section rounded-2xl border border-slate-700/50 bg-slate-900/60 p-8 shadow-xl shadow-black/20">
        <div className="mb-6 border-b border-slate-700/50 pb-6 text-center">
          <h1 className="font-serif text-2xl font-bold text-white">船长停泊报告</h1>
          <p className="mt-1 text-sm text-slate-400">
            {new Date().toLocaleDateString('zh-CN')} {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            {input.location && ` · ${input.location}`}
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-700/30 bg-slate-800/30 p-4">
          <RiskIcon className={`h-8 w-8 ${RISK_COLOR[result.riskLevel]}`} />
          <div>
            <p className={`text-lg font-bold ${RISK_COLOR[result.riskLevel]}`}>
              风险等级：{RISK_LABEL[result.riskLevel]}
            </p>
            {isNoAnchor && (
              <p className="text-sm text-red-300/70">在此条件下强烈建议不要停泊</p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">锚链投放建议</h3>
          {!isNoAnchor ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-800/50 p-4 text-center">
                <p className="text-xs text-slate-400">最短</p>
                <p className="mt-1 text-xl font-bold text-white">{result.minLength.toFixed(1)} m</p>
              </div>
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
                <p className="text-xs text-cyan-400">建议</p>
                <p className="mt-1 text-2xl font-bold text-white">{formatLength(result.recommendedLength)}</p>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-4 text-center">
                <p className="text-xs text-slate-400">最长</p>
                <p className="mt-1 text-xl font-bold text-white">{result.maxLength.toFixed(1)} m</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
              <p className="text-lg font-bold text-red-400">不建议在此条件下停泊</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">操作范围可视化</h3>
          {!isNoAnchor && (
            <div className="space-y-2">
              <div className="relative h-12 rounded-xl bg-slate-800/50 overflow-hidden">
                <div
                  className="absolute top-0 h-full rounded-xl transition-all duration-500"
                  style={{
                    left: '5%',
                    right: '5%',
                    background: `linear-gradient(90deg, #0e749033, #0e749066, #0e749033)`,
                    borderLeft: '2px solid #10b981',
                    borderRight: '2px solid #ef4444',
                  }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-cyan-400 transition-all duration-500"
                  style={{
                    left: `${5 + ((result.scopeRatio - result.minScope) / (result.maxScope - result.minScope)) * 90}%`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3">
                  <span className="text-xs font-bold text-emerald-400">{result.minLength.toFixed(1)}m</span>
                  <span className="text-xs font-bold text-cyan-300">{result.recommendedLength.toFixed(1)}m</span>
                  <span className="text-xs font-bold text-red-400">{result.maxLength.toFixed(1)}m</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Scope {result.minScope}:1</span>
                <span>Scope {result.scopeRatio}:1</span>
                <span>Scope {result.maxScope}:1</span>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">计算参数</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['水深', `${input.waterDepth} ${input.depthUnit === 'm' ? '米' : '英尺'}`],
              ['船长', `${input.boatLength} 米`],
              ['锚型', ANCHOR_LABELS[input.anchorType]],
              ['风力', getWindDesc(beaufort)],
              ['浪高', `${input.waveHeight} ${input.waveUnit === 'm' ? '米' : '英尺'}`],
              ['停泊时间', `${input.mooringHours} 小时`],
              ['靠泊地点', input.location || '未填写'],
              ['夜间停泊', input.isNight ? '是' : '否'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-slate-800/30 px-3 py-2">
                <span className="text-slate-400">{label}</span>
                <span className="font-medium text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {result.warnings.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">风险提示</h3>
            <ul className="space-y-1.5">
              {result.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-300">
                  <span className="mt-0.5">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-slate-700/50 pt-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-slate-400 mb-8">船长签字</p>
              <div className="border-b border-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-8">安全员签字</p>
              <div className="border-b border-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
