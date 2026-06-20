import type { RiskLevel } from '@/types'
import { formatLength } from '@/utils/units'
import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldX, Link, Ruler } from 'lucide-react'

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  safe: {
    label: '安全',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: ShieldCheck,
  },
  caution: {
    label: '注意',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: ShieldAlert,
  },
  danger: {
    label: '危险',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: AlertTriangle,
  },
  no_anchor: {
    label: '不建议停泊',
    color: 'text-red-500',
    bg: 'bg-red-500/15',
    border: 'border-red-500/50',
    icon: ShieldX,
  },
}

interface ResultPanelProps {
  result: {
    recommendedLength: number
    minLength: number
    maxLength: number
    scopeRatio: number
    minScope: number
    maxScope: number
    riskLevel: RiskLevel
  }
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const config = RISK_CONFIG[result.riskLevel]
  const RiskIcon = config.icon
  const isNoAnchor = result.riskLevel === 'no_anchor'

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${config.bg} ${config.border}`}>
        <div className="flex items-center gap-2 mb-3">
          <RiskIcon className={`h-5 w-5 ${config.color}`} />
          <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
        </div>

        {isNoAnchor ? (
          <div className="text-center py-4">
            <p className="text-lg font-bold text-red-400">不建议在此条件下停泊</p>
            <p className="mt-1 text-sm text-red-300/70">请寻找避风港湾或等待条件改善</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">建议锚链长度</p>
              <p className="text-3xl font-serif font-bold text-white tracking-tight">
                {formatLength(result.recommendedLength)}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-800/50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Ruler className="h-3.5 w-3.5 text-cyan-500" />
                  <span className="text-xs text-slate-400">Scope比率</span>
                </div>
                <p className="text-lg font-bold text-white">{result.scopeRatio}:1</p>
              </div>
              <div className="rounded-lg bg-slate-800/50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Link className="h-3.5 w-3.5 text-cyan-500" />
                  <span className="text-xs text-slate-400">操作范围</span>
                </div>
                <p className="text-sm font-bold text-white">
                  {result.minLength.toFixed(1)} — {result.maxLength.toFixed(1)} m
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-2">操作范围可视化</p>
              <div className="relative h-8 rounded-full bg-slate-800/50 overflow-hidden">
                <div
                  className="absolute top-0 h-full rounded-full transition-all duration-500"
                  style={{
                    left: '10%',
                    right: '10%',
                    background: `linear-gradient(90deg, ${result.riskLevel === 'safe' ? '#10b98133' : result.riskLevel === 'caution' ? '#f59e0b33' : '#ef444433'}, ${result.riskLevel === 'safe' ? '#10b98166' : result.riskLevel === 'caution' ? '#f59e0b66' : '#ef444466'})`,
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white shadow-lg shadow-cyan-500/50 transition-all duration-500"
                  style={{
                    left: `${10 + ((result.scopeRatio - result.minScope) / (result.maxScope - result.minScope)) * 80}%`,
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>最少 {result.minLength.toFixed(1)}m</span>
                <span>最多 {result.maxLength.toFixed(1)}m</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl bg-slate-800/30 p-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Scope范围: {result.minScope}:1 — {result.maxScope}:1</span>
          <span>建议: {result.scopeRatio}:1</span>
        </div>
      </div>
    </div>
  )
}
