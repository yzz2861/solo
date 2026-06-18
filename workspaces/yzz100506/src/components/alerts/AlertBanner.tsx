import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { Alert } from '@/types'

const severityConfig = {
  high: {
    container: 'bg-coral-50 border-coral-400 text-coral-600',
    Icon: AlertTriangle,
  },
  medium: {
    container: 'bg-amber-50 border-amber-400 text-amber-700',
    Icon: AlertCircle,
  },
  low: {
    container: 'bg-yellow-50 border-yellow-400 text-yellow-700',
    Icon: Info,
  },
} as const

export default function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = alerts.filter((a) => !dismissed.has(a.id))

  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {visible.map((alert) => {
        const { container, Icon } = severityConfig[alert.severity]
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${container}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{alert.message}</p>
              {alert.details && (
                <p className="text-xs mt-1 opacity-80">{alert.details}</p>
              )}
            </div>
            <button
              onClick={() =>
                setDismissed((prev) => new Set(prev).add(alert.id))
              }
              className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
