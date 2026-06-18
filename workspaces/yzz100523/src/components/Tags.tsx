import type { ViolationType, Severity, SessionStatus, ExemptionReason } from '../types'
import { VIOLATION_META, SEVERITY_META, STATUS_META, EXEMPTION_META } from '../types'

interface Props {
  type: ViolationType
  size?: 'sm' | 'md'
  showDot?: boolean
}

export function ViolationTag({ type, size = 'sm', showDot = true }: Props) {
  const meta = VIOLATION_META[type]
  return (
    <span
      className={`badge ${meta.bgColor} ${meta.textColor} ${meta.borderColor} border ${size === 'md' ? 'px-3 py-1 text-sm' : ''}`}
      style={{ backgroundColor: meta.color + '12', color: meta.color, borderColor: meta.color + '44' }}
    >
      {showDot && <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: meta.color }} />}
      {meta.label}
    </span>
  )
}

export function SeverityTag({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity]
  return (
    <span className={`badge ${meta.color}`}>
      {meta.label}风险
    </span>
  )
}

export function StatusBadge({ status }: { status: SessionStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={meta.color}>
      {meta.label}
    </span>
  )
}

export function ExemptionChip({
  reason,
  active,
  onClick,
}: {
  reason: ExemptionReason
  active: boolean
  onClick?: () => void
}) {
  const meta = EXEMPTION_META[reason]
  return (
    <button
      type="button"
      onClick={onClick}
      title={meta.hint}
      className={`chip ${
        active
          ? 'bg-brand-500 border-brand-500 text-white'
          : 'bg-white border-slate-300 text-slate-700 hover:border-brand-400 hover:bg-brand-50'
      }`}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </button>
  )
}
