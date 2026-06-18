import { AlertTriangle, Volume2, MicOff, Scissors } from 'lucide-react'
import type { AnomalyWarning } from '@/types'

const iconMap = {
  noise: Volume2,
  accompaniment: Music,
  range_mismatch: MicOff,
  incomplete: Scissors,
}

const severityColors = {
  low: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700',
  medium: 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700',
  high: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
}

const severityLabels = {
  low: '提示',
  medium: '注意',
  high: '警告',
}

function Music(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
  )
}

interface AnomalyBannerProps {
  anomalies: AnomalyWarning[]
}

export default function AnomalyBanner({ anomalies }: AnomalyBannerProps) {
  if (anomalies.length === 0) return null

  return (
    <div className="space-y-2">
      {anomalies.map((anomaly, i) => {
        const Icon = iconMap[anomaly.type] || AlertTriangle
        return (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${severityColors[anomaly.severity]}`}
          >
            <Icon className="w-5 h-5 mt-0.5 shrink-0 opacity-70" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                  {severityLabels[anomaly.severity]}
                </span>
              </div>
              <p className="text-sm mt-0.5">{anomaly.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
