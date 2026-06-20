import type { RiskCategory, RiskSeverity, QuoteCategory, Sentence, RiskItem } from '@/engine/types'
import { RISK_CATEGORY_LABELS, RISK_SEVERITY_LABELS, QUOTE_CATEGORY_LABELS } from '@/engine/types'
import {
  AlertTriangle, Shield, BarChart3, Zap,
  CheckCircle2, XCircle, ChevronDown, ChevronRight,
  Crown, MessageSquareQuote, Trophy, RefreshCw, FileDown,
} from 'lucide-react'

const categoryIcons: Record<RiskCategory, typeof AlertTriangle> = {
  absolute: AlertTriangle,
  political: Shield,
  data_source: BarChart3,
  exaggeration: Zap,
}

const categoryColors: Record<RiskCategory, string> = {
  absolute: 'text-red-400 bg-red-400/10 border-red-400/20',
  political: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  data_source: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  exaggeration: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
}

const categoryBgColors: Record<RiskCategory, string> = {
  absolute: 'bg-red-400/8',
  political: 'bg-rose-400/8',
  data_source: 'bg-amber-400/8',
  exaggeration: 'bg-orange-400/8',
}

const severityColors: Record<RiskSeverity, string> = {
  high: 'text-red-400 bg-red-400/15',
  medium: 'text-amber-400 bg-amber-400/15',
  low: 'text-emerald-400 bg-emerald-400/15',
}

const quoteTagColors: Record<QuoteCategory, string> = {
  leadership_quote: 'bg-purple-400/15 text-purple-300 border-purple-400/20',
  customer_testimonial: 'bg-blue-400/15 text-blue-300 border-blue-400/20',
  historical_honor: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/20',
  general: 'bg-white/5 text-white/40 border-white/10',
}

const quoteTagIcons: Record<QuoteCategory, typeof Crown> = {
  leadership_quote: Crown,
  customer_testimonial: MessageSquareQuote,
  historical_honor: Trophy,
  general: ChevronRight,
}

export function QuoteTag({ category }: { category: QuoteCategory }) {
  if (category === 'general') return null
  const Icon = quoteTagIcons[category]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${quoteTagColors[category]}`}>
      <Icon className="w-2.5 h-2.5" />
      {QUOTE_CATEGORY_LABELS[category]}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: RiskSeverity }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${severityColors[severity]}`}>
      {RISK_SEVERITY_LABELS[severity]}
    </span>
  )
}

export function CategoryBadge({ category }: { category: RiskCategory }) {
  const Icon = categoryIcons[category]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${categoryColors[category]}`}>
      <Icon className="w-3 h-3" />
      {RISK_CATEGORY_LABELS[category]}
    </span>
  )
}

export function RiskCard({
  sentence,
  risk,
  onConfirm,
  onUnconfirm,
}: {
  sentence: Sentence
  risk: RiskItem
  onConfirm: () => void
  onUnconfirm: () => void
}) {
  const Icon = categoryIcons[risk.category]
  return (
    <div className={`rounded-xl border border-white/5 p-4 transition-all duration-300 ${risk.confirmed ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={risk.category} />
          <SeverityBadge severity={risk.severity} />
          <QuoteTag category={sentence.quoteCategory} />
        </div>
        <button
          onClick={risk.confirmed ? onUnconfirm : onConfirm}
          className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
            risk.confirmed
              ? 'bg-[#4ECDC4]/15 text-[#4ECDC4] hover:bg-[#4ECDC4]/25'
              : 'bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          {risk.confirmed ? (
            <><CheckCircle2 className="w-3 h-3" />已确认</>
          ) : (
            <><XCircle className="w-3 h-3" />确认保留</>
          )}
        </button>
      </div>

      <div className="flex items-start gap-2 mb-2">
        <span className="text-[10px] text-white/20 font-mono shrink-0 leading-5">L{sentence.lineNumber}</span>
        <p className="text-xs text-white/70 leading-5">{sentence.content}</p>
      </div>

      <div className={`flex items-start gap-2 rounded-lg p-2.5 ${categoryBgColors[risk.category]}`}>
        <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/40" />
        <p className="text-[11px] text-white/50 leading-4">{risk.rewriteSuggestion}</p>
      </div>
    </div>
  )
}

export function FilterBar({
  active,
  onChange,
  counts,
}: {
  active: RiskCategory | 'all'
  onChange: (c: RiskCategory | 'all') => void
  counts: Record<RiskCategory | 'all', number>
}) {
  const items: { key: RiskCategory | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'absolute', label: '绝对化' },
    { key: 'political', label: '涉政' },
    { key: 'data_source', label: '数据来源' },
    { key: 'exaggeration', label: '夸大' },
  ]

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {items.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            active === key
              ? 'bg-[#FF6B35] text-white shadow-[0_0_12px_rgba(255,107,53,0.2)]'
              : 'bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          {label}
          <span className="ml-1 opacity-60">{counts[key]}</span>
        </button>
      ))}
    </div>
  )
}

export { categoryBgColors, categoryIcons, categoryColors }
