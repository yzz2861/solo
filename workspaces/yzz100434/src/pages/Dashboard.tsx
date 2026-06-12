import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Eye } from 'lucide-react'
import { useAuditStore } from '@/store/auditStore'
import type { FileStatus } from '@/types'
import { CATEGORY_LABELS, STATUS_COLORS } from '@/types'
import StatusTag from '@/components/StatusTag'

const RING_SIZE = 180
const RING_STROKE = 14
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const STATUS_STAT_CONFIG: {
  key: FileStatus
  label: string
  color: string
  field: 'existing' | 'missing' | 'expired' | 'needsUpdate'
}[] = [
  { key: 'existing', label: '已有', color: STATUS_COLORS.existing, field: 'existing' },
  { key: 'missing', label: '缺失', color: STATUS_COLORS.missing, field: 'missing' },
  { key: 'expired', label: '过期', color: STATUS_COLORS.expired, field: 'expired' },
  { key: 'needs_update', label: '需更新', color: STATUS_COLORS.needs_update, field: 'needsUpdate' },
]

function ProgressRing() {
  const checklist = useAuditStore((s) => s.session.checklist)
  const stats = useMemo(() => {
    const total = checklist.length
    const existing = checklist.filter((i) => i.status === 'existing').length
    const missing = checklist.filter((i) => i.status === 'missing').length
    const expired = checklist.filter((i) => i.status === 'expired').length
    const needsUpdate = checklist.filter((i) => i.status === 'needs_update').length
    const completionRate = total > 0 ? Math.round((existing / total) * 100) : 0
    return { total, existing, missing, expired, needsUpdate, completionRate }
  }, [checklist])

  const offset = RING_CIRCUMFERENCE - (stats.completionRate / 100) * RING_CIRCUMFERENCE

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#3F3F46"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-4xl font-bold leading-none"
            style={{ fontFamily: '"JetBrains Mono", monospace', color: '#FAFAFA' }}
          >
            {stats.completionRate}
          </span>
          <span className="mt-1 text-sm" style={{ color: '#9CA3AF' }}>
            完成率
          </span>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-2">
        {STATUS_STAT_CONFIG.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: '#3F3F46' }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              {item.label}
            </span>
            <span
              className="ml-auto text-sm font-semibold"
              style={{ fontFamily: '"JetBrains Mono", monospace', color: item.color }}
            >
              {stats[item.field]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AuditCountdown() {
  const auditDate = useAuditStore((s) => s.session.auditDate)
  const checklist = useAuditStore((s) => s.session.checklist)
  const starredStats = useMemo(() => {
    const starredTotal = checklist.filter((i) => i.starred).length
    const starredReady = checklist.filter((i) => i.starred && i.status === 'existing').length
    return { starredTotal, starredReady }
  }, [checklist])

  const daysRemaining = useMemo(() => {
    if (!auditDate) return null
    const target = new Date(auditDate)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }, [auditDate])

  const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0

  return (
    <div className="flex flex-col items-center gap-4">
      {daysRemaining !== null ? (
        <>
          <span
            className={`font-mono text-7xl font-bold leading-none ${
              isUrgent ? 'animate-pulse text-red-500' : ''
            }`}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              color: isUrgent ? undefined : '#FAFAFA',
            }}
          >
            {daysRemaining}
          </span>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>
            天后验厂
          </span>
          {isUrgent && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-500">紧急</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Clock className="h-10 w-10" style={{ color: '#6B7280' }} />
          <span className="text-sm" style={{ color: '#9CA3AF' }}>
            请设置验厂日期
          </span>
        </div>
      )}

      <div
        className="mt-2 w-full rounded-lg px-4 py-3 text-center"
        style={{ backgroundColor: '#3F3F46' }}
      >
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          关注项:{' '}
        </span>
        <span
          className="font-mono text-sm font-semibold"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            color: starredStats.starredReady === starredStats.starredTotal ? '#10B981' : '#F59E0B',
          }}
        >
          {starredStats.starredReady}/{starredStats.starredTotal}
        </span>
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          {' '}已就绪
        </span>
      </div>
    </div>
  )
}

function HighRiskAlerts() {
  const checklist = useAuditStore((s) => s.session.checklist)
  const criticalItems = useMemo(() => {
    return checklist.filter(
      (item) =>
        item.alerts.some((a) => a.severity === 'critical') ||
        item.status === 'missing'
    )
  }, [checklist])

  const sorted = useMemo(() => {
    return [...criticalItems].sort((a, b) => {
      const aCritical = a.alerts.some((al) => al.severity === 'critical') || a.status === 'missing'
      const bCritical = b.alerts.some((al) => al.severity === 'critical') || b.status === 'missing'
      if (aCritical && !bCritical) return -1
      if (!aCritical && bCritical) return 1
      return 0
    })
  }, [criticalItems])

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg px-4 py-6" style={{ backgroundColor: '#10B98115' }}>
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-500">无高风险项目，一切正常</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((item) => {
        const isCritical = item.alerts.some((a) => a.severity === 'critical') || item.status === 'missing'
        const barColor = isCritical ? '#EF4444' : '#F59E0B'
        const alertMsg = item.alerts.length > 0 ? item.alerts[0].message : '资料缺失'

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{ backgroundColor: '#3F3F46' }}
          >
            <span
              className="h-full min-h-[2rem] w-1 shrink-0 rounded-full"
              style={{ backgroundColor: barColor }}
            />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium" style={{ color: '#FAFAFA' }}>
                {item.name}
              </span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                {alertMsg}
              </span>
            </div>
            <StatusTag status={item.status} />
          </div>
        )
      })}
    </div>
  )
}

function TodaySupplementList() {
  const checklist = useAuditStore((s) => s.session.checklist)
  const items = useMemo(() => {
    return checklist.filter(
      (item) =>
        item.status === 'missing' ||
        item.status === 'expired' ||
        item.alerts.some((a) => a.severity === 'critical')
    )
  }, [checklist])
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg px-4 py-6" style={{ backgroundColor: '#10B98115' }}>
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-500">所有资料已就绪</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-lg px-4 py-3"
          style={{ backgroundColor: '#3F3F46' }}
        >
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: '#FAFAFA' }}>
              {item.name}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="rounded px-1.5 py-0.5 text-xs"
                style={{ backgroundColor: '#52525B', color: '#D1D5DB' }}
              >
                {CATEGORY_LABELS[item.category]}
              </span>
              <StatusTag status={item.status} />
            </div>
          </div>
          <button
            onClick={() => navigate('/checklist')}
            className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-amber-500/20"
            style={{ color: '#F59E0B' }}
          >
            <Eye className="h-3.5 w-3.5" />
            查看
          </button>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      style={{ backgroundColor: '#1C1C1E', fontFamily: '"Noto Sans SC", sans-serif' }}
    >
      <h1 className="mb-6 text-xl font-bold" style={{ color: '#FAFAFA' }}>
        验厂仪表盘
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          className="rounded-xl p-6"
          style={{ backgroundColor: '#2C2C2E' }}
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            完成进度
          </h2>
          <ProgressRing />
        </section>

        <section
          className="rounded-xl p-6"
          style={{ backgroundColor: '#2C2C2E' }}
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            验厂倒计时
          </h2>
          <AuditCountdown />
        </section>

        <section
          className="rounded-xl p-6 lg:col-span-2"
          style={{ backgroundColor: '#2C2C2E' }}
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            高风险提醒
          </h2>
          <HighRiskAlerts />
        </section>

        <section
          className="rounded-xl p-6 lg:col-span-2"
          style={{ backgroundColor: '#2C2C2E' }}
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            今日待补
          </h2>
          <TodaySupplementList />
        </section>
      </div>
    </div>
  )
}
