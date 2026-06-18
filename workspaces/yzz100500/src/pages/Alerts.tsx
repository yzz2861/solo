import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Camera, GitCompare, Bell, Check, ArrowLeft } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Alert } from '@/types'

type FilterTab = 'all' | 'missing_code' | 'unknown_angle' | 'conflicting_conclusion'

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'missing_code', label: '编号缺失' },
  { key: 'unknown_angle', label: '照片角度' },
  { key: 'conflicting_conclusion', label: '结论冲突' },
]

const TYPE_CONFIG: Record<Alert['type'], { icon: typeof AlertTriangle; badgeClass: string; iconColor: string }> = {
  missing_code: { icon: AlertTriangle, badgeClass: 'badge-warning', iconColor: 'text-cinnabar-400' },
  unknown_angle: { icon: Camera, badgeClass: 'badge-info', iconColor: 'text-blue-400' },
  conflicting_conclusion: { icon: GitCompare, badgeClass: 'badge-error', iconColor: 'text-red-400' },
}

const SEVERITY_BADGE: Record<Alert['severity'], { label: string; cls: string }> = {
  warning: { label: 'warning', cls: 'badge-warning' },
  info: { label: 'info', cls: 'badge-info' },
  error: { label: 'error', cls: 'badge-error' },
}

export default function Alerts() {
  const navigate = useNavigate()
  const alerts = useStore((s) => s.alerts)
  const components = useStore((s) => s.components)
  const resolveAlert = useStore((s) => s.resolveAlert)
  const setSelectedComponentId = useStore((s) => s.setSelectedComponentId)
  const setSelectedAnnotationId = useStore((s) => s.setSelectedAnnotationId)
  const reinspections = useStore((s) => s.reinspections)

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const filtered = activeFilter === 'all' ? alerts : alerts.filter((a) => a.type === activeFilter)

  const counts = {
    missing_code: alerts.filter((a) => a.type === 'missing_code' && !a.resolved).length,
    unknown_angle: alerts.filter((a) => a.type === 'unknown_angle' && !a.resolved).length,
    conflicting_conclusion: alerts.filter((a) => a.type === 'conflicting_conclusion' && !a.resolved).length,
  }

  const handleNavigate = (componentId: string) => {
    setSelectedComponentId(componentId)
    setSelectedAnnotationId(null)
    navigate('/')
  }

  const getConclusions = (alert: Alert) => {
    if (alert.type !== 'conflicting_conclusion') return []
    const related = reinspections.filter((r) => alert.relatedIds.includes(r.id))
    return related.map((r) => r.conclusion)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 font-sans p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-ghost flex items-center gap-2 text-ink-300 hover:text-ink-50">
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-3">
            <Bell className="w-6 h-6 text-cinnabar-400" />
            智能提示中心
          </h1>
        </div>

        <div className="glass-panel p-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-cinnabar-400" />
            <span className="text-sm text-ink-300">编号缺失</span>
            <span className="badge-warning text-xs px-2 py-0.5 rounded-full">{counts.missing_code}</span>
          </div>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-ink-300">照片角度</span>
            <span className="badge-info text-xs px-2 py-0.5 rounded-full">{counts.unknown_angle}</span>
          </div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-red-400" />
            <span className="text-sm text-ink-300">结论冲突</span>
            <span className="badge-error text-xs px-2 py-0.5 rounded-full">{counts.conflicting_conclusion}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm transition-colors',
                activeFilter === tab.key
                  ? 'bg-cinnabar-500/20 text-cinnabar-300 border border-cinnabar-500/30'
                  : 'text-ink-400 hover:text-ink-200 border border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="glass-panel p-8 text-center text-ink-400">
              暂无提示信息
            </div>
          )}

          {filtered.map((alert) => {
            const config = TYPE_CONFIG[alert.type]
            const Icon = config.icon
            const comp = components.find((c) => c.id === alert.componentId)
            const severity = SEVERITY_BADGE[alert.severity]
            const conclusions = getConclusions(alert)

            return (
              <div
                key={alert.id}
                className={cn(
                  'glass-panel p-4 space-y-3 transition-opacity',
                  alert.resolved && 'opacity-40'
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.iconColor)} />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', severity.cls)}>
                        {severity.label}
                      </span>
                      <span className={cn('text-sm', alert.resolved && 'line-through text-ink-500')}>
                        {alert.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-500">关联构件：</span>
                      <button
                        onClick={() => handleNavigate(alert.componentId)}
                        className="text-sm text-sandalwood-300 hover:text-sandalwood-200 underline underline-offset-2"
                      >
                        {comp?.name || '未知构件'}
                      </button>
                    </div>

                    {conclusions.length > 1 && (
                      <div className="flex gap-3">
                        {conclusions.map((c, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-ink-800/60 rounded-md p-2 text-xs text-ink-300 border border-ink-700/50"
                          >
                            <span className="text-ink-500">复查{i + 1}：</span>
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!alert.resolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="btn-ghost flex items-center gap-1.5 text-xs text-celadon-400 hover:text-celadon-300 flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      标记已处理
                    </button>
                  )}

                  {alert.resolved && (
                    <span className="flex items-center gap-1 text-xs text-celadon-500 flex-shrink-0">
                      <Check className="w-4 h-4" />
                      已处理
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
