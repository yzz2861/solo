import { AlertTriangle, AlertCircle, Info, CheckCircle2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertItem, AlertLevel } from '@/types'

interface AlertCenterProps {
  alerts: AlertItem[]
  onLocate: (alert: AlertItem) => void
}

const LEVEL_CONFIG: Record<AlertLevel, {
  label: string
  bar: string
  bg: string
  border: string
  icon: typeof AlertTriangle
  iconClass: string
  textClass: string
  badge: string
}> = {
  danger: {
    label: '严重',
    bar: 'bg-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertTriangle,
    iconClass: 'text-red-600',
    textClass: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    label: '警告',
    bar: 'bg-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: AlertCircle,
    iconClass: 'text-yellow-600',
    textClass: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  info: {
    label: '提示',
    bar: 'bg-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
    iconClass: 'text-blue-600',
    textClass: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
  },
}

function AlertGroup({
  level,
  alerts,
  onLocate,
}: {
  level: AlertLevel
  alerts: AlertItem[]
  onLocate: (alert: AlertItem) => void
}) {
  const config = LEVEL_CONFIG[level]
  const LevelIcon = config.icon

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold',
            config.badge,
          )}
        >
          <LevelIcon className="w-3 h-3" />
          {config.label}
          <span className="ml-1 bg-white/60 rounded px-1.5 py-0.5 text-[10px]">
            {alerts.length}
          </span>
        </span>
      </div>
      <div className="space-y-2">
        {alerts.map((alert, idx) => (
          <div
            key={`${alert.code}-${idx}`}
            className={cn(
              'rounded-lg border overflow-hidden flex shadow-sm',
              config.border,
              config.bg,
            )}
          >
            <div className={cn('w-1.5 flex-shrink-0', config.bar)} />
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start gap-3">
                <LevelIcon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', config.textClass)}>{alert.code}</p>
                  <p className={cn('text-sm', config.textClass)}>{alert.msg}</p>
                  <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {alert.field}
                  </p>
                </div>
                <button
                  onClick={() => onLocate(alert)}
                  className={cn(
                    'flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
                  )}
                >
                  定位
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AlertCenter({ alerts, onLocate }: AlertCenterProps) {
  const grouped = {
    danger: alerts.filter((a) => a.level === 'danger'),
    warning: alerts.filter((a) => a.level === 'warning'),
    info: alerts.filter((a) => a.level === 'info'),
  }

  const hasAlerts = alerts.length > 0

  return (
    <div className={cn('bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm')}>
      <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-white" />
          <h3 className="text-white font-semibold text-base">告警中心</h3>
        </div>
        {hasAlerts ? (
          <div className="flex items-center gap-1.5">
            {grouped.danger.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {grouped.danger.length} 严重
              </span>
            )}
            {grouped.warning.length > 0 && (
              <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-medium">
                {grouped.warning.length} 警告
              </span>
            )}
          </div>
        ) : null}
      </div>

      <div className="p-5">
        {!hasAlerts ? (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-bold text-green-800">所有检查项通过</p>
          </div>
        ) : (
          <div className="space-y-5">
            <AlertGroup level="danger" alerts={grouped.danger} onLocate={onLocate} />
            <AlertGroup level="warning" alerts={grouped.warning} onLocate={onLocate} />
            <AlertGroup level="info" alerts={grouped.info} onLocate={onLocate} />
          </div>
        )}
      </div>
    </div>
  )
}
