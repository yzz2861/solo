import type { RiskLevel } from '@/types'
import { AlertTriangle, AlertCircle, Info, Moon, Wind, Waves, Anchor } from 'lucide-react'

const WARNING_ICONS: Record<string, React.ElementType> = {
  '水深为零': AlertCircle,
  '风浪过大': Wind,
  '浪高超过': Waves,
  '不建议停泊': AlertTriangle,
  '夜间停泊': Moon,
  '锚型不适合': Anchor,
  'Mushroom': Anchor,
  'Grapple': Anchor,
}

function getWarningSeverity(text: string): 'critical' | 'warning' | 'info' {
  if (text.includes('不建议停泊') || text.includes('强烈建议不要停泊') || text.includes('风险极大')) return 'critical'
  if (text.includes('不适合') || text.includes('不推荐') || text.includes('警告') || text.includes('注意')) return 'warning'
  return 'info'
}

const SEVERITY_STYLE: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    text: 'text-red-300',
    icon: 'text-red-400',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    icon: 'text-amber-400',
  },
  info: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-300',
    icon: 'text-cyan-400',
  },
}

interface WarningBannerProps {
  warnings: string[]
  riskLevel: RiskLevel
}

export default function WarningBanner({ warnings, riskLevel }: WarningBannerProps) {
  if (warnings.length === 0 && riskLevel === 'safe') {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-300">当前条件下停泊安全，请保持警戒</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {warnings.map((warning, i) => {
        const severity = getWarningSeverity(warning)
        const style = SEVERITY_STYLE[severity]
        const matchKey = Object.keys(WARNING_ICONS).find((k) => warning.includes(k))
        const Icon = matchKey ? WARNING_ICONS[matchKey] : (severity === 'critical' ? AlertTriangle : severity === 'warning' ? AlertCircle : Info)

        return (
          <div
            key={i}
            className={`flex items-start gap-2.5 rounded-xl border p-3 ${style.bg} ${style.border} transition-all duration-300`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} />
            <p className={`text-sm leading-relaxed ${style.text}`}>{warning}</p>
          </div>
        )
      })}
    </div>
  )
}
