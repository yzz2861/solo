import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useReviewStore } from '../store/useReviewStore'
import { STATUS_META, VIOLATION_META } from '../types'
import { StatusBadge } from '../components/Tags'
import type { SessionStatus, ViolationType } from '../types'

export default function SessionList() {
  const { sessions, productLines, anchors } = useReviewStore()

  const [filterPL, setFilterPL] = useState<string>('all')
  const [filterAnchor, setFilterAnchor] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<SessionStatus | 'all'>('all')
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (filterPL !== 'all' && s.productLineId !== filterPL) return false
      if (filterAnchor !== 'all' && s.anchorId !== filterAnchor) return false
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      if (keyword && !s.title.toLowerCase().includes(keyword.toLowerCase())) return false
      return true
    })
  }, [sessions, filterPL, filterAnchor, filterStatus, keyword])

  const stats = useMemo(() => {
    const total = sessions.length
    const pending = sessions.filter(s => s.status === 'PENDING' || s.status === 'REVIEWING').length
    const correcting = sessions.filter(s => s.status === 'PENDING_CORRECTION').length
    const done = sessions.filter(s => s.status === 'COMPLETED').length
    const totalViolations = sessions.reduce((n, s) => n + s.violations.filter(v => !v.exemption).length, 0)
    return { total, pending, correcting, done, totalViolations }
  }, [sessions])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">直播审查项目</h2>
          <p className="text-sm text-slate-500 mt-1">管理所有直播场次的合规审查、整改与复播流程</p>
        </div>
        <Link to="/review/new" className="btn-primary gap-2">
          <span>➕</span> 新建审查
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="总场次" value={stats.total} hint="所有直播场次" color="from-blue-500 to-blue-600" icon="📋" />
        <StatCard label="待审查/审查中" value={stats.pending} hint="需要立即处理" color="from-amber-500 to-orange-500" icon="⏳" />
        <StatCard label="待整改" value={stats.correcting} hint="主播整改中" color="from-purple-500 to-fuchsia-500" icon="✏️" />
        <StatCard label="已完成闭环" value={stats.done} hint={`累计${stats.totalViolations}条违规整改`} color="from-emerald-500 to-teal-500" icon="✅" />
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[220px]">
          <label className="label">搜索场次</label>
          <input
            className="input"
            placeholder="搜索标题关键词..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>
        <div className="min-w-[180px]">
          <label className="label">商品线</label>
          <select className="input" value={filterPL} onChange={e => setFilterPL(e.target.value)}>
            <option value="all">全部商品线</option>
            {productLines.map(pl => (
              <option key={pl.id} value={pl.id}>{pl.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="label">主播</label>
          <select className="input" value={filterAnchor} onChange={e => setFilterAnchor(e.target.value)}>
            <option value="all">全部主播</option>
            {anchors.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="label">状态</label>
          <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
            <option value="all">全部状态</option>
            <option value="PENDING">待审查</option>
            <option value="REVIEWING">审查中</option>
            <option value="PENDING_CORRECTION">待整改</option>
            <option value="COMPLETED">已完成</option>
          </select>
        </div>
        <button
          onClick={() => { setFilterPL('all'); setFilterAnchor('all'); setFilterStatus('all'); setKeyword('') }}
          className="btn-ghost !px-4 !py-2"
        >
          重置筛选
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">📭</div>
          <div className="text-lg font-medium text-slate-700">暂无符合条件的场次</div>
          <p className="text-sm text-slate-500 mt-1">点击右上角「新建审查」导入讲解稿开始审查</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(s => (
            <SessionCard key={s.id} sessionId={s.id} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, hint, color, icon }: {
  label: string; value: number; hint: string; color: string; icon: string
}) {
  return (
    <div className={`card p-5 overflow-hidden relative`}>
      <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${color} opacity-15`} />
      <div className="flex items-start justify-between relative">
        <div>
          <div className="text-sm text-slate-500 font-medium">{label}</div>
          <div className={`text-3xl font-black mt-2 bg-gradient-to-br ${color} bg-clip-text text-transparent`}>
            {value}
          </div>
          <div className="text-xs text-slate-400 mt-1">{hint}</div>
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xl shadow-md`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function SessionCard({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate()
  const session = useReviewStore(s => s.getSession(sessionId))!
  const pl = useReviewStore(s => s.productLines.find(p => p.id === session.productLineId))
  const anchor = useReviewStore(s => s.anchors.find(a => a.id === session.anchorId))

  const confirmedCount = session.violations.filter(v => !v.exemption).length
  const exemptCount = session.violations.length - confirmedCount
  const correctedCount = session.violations.filter(v => !v.exemption && v.correction?.isDone).length

  const violationByType = useMemo(() => {
    const map = new Map<ViolationType, number>()
    session.violations.filter(v => !v.exemption).forEach(v => {
      map.set(v.type, (map.get(v.type) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [session])

  const status = STATUS_META[session.status]

  return (
    <Link
      to={`/review/${session.id}`}
      className="card-hover block relative overflow-hidden group"
    >
      <div className={`absolute top-0 left-0 w-1.5 h-full ${status.barColor}`} />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-brand-500 transition-colors">
              {session.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
              <span>📅 {dayjs(session.liveDate).format('MM-DD')}</span>
              <span>·</span>
              <span>🕒 {dayjs(session.createdAt).fromNow()}</span>
            </div>
          </div>
          <StatusBadge status={session.status} />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <img src={anchor?.avatar} className="w-7 h-7 rounded-full border border-slate-200" />
          <span className="text-sm font-medium text-slate-700">{anchor?.name}</span>
          <span
            className="badge ml-auto"
            style={{ backgroundColor: pl?.color + '1A', color: pl?.color }}
          >
            {pl?.name}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <MiniStat label="违规总数" value={session.violations.length} color="text-slate-700" />
          <MiniStat label="确认违规" value={confirmedCount} color="text-risk-medium" />
          <MiniStat label="已整改" value={correctedCount} color="text-risk-ok" />
        </div>

        {violationByType.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {violationByType.map(([t, n]) => (
              <span
                key={t}
                className="badge"
                style={{
                  backgroundColor: VIOLATION_META[t].color + '18',
                  color: VIOLATION_META[t].color,
                }}
              >
                {VIOLATION_META[t].label} ×{n}
              </span>
            ))}
            {exemptCount > 0 && (
              <span className="badge bg-slate-100 text-slate-600">
                豁免 {exemptCount}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400">暂无违规记录</div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {session.recheckPassed ? (
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">✓ 复播已通过</span>
            ) : session.status === 'PENDING_CORRECTION' ? (
              <button
                type="button"
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/recheck/${session.id}`)
                }}
                className="text-xs font-medium text-brand-500 hover:underline"
              >
                🔍 进行复播检查 →
              </button>
            ) : null}
          </div>
          <span className="text-xs font-medium text-brand-500 group-hover:translate-x-0.5 transition-transform inline-block">
            进入审查 →
          </span>
        </div>
      </div>
    </Link>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center py-2 rounded-lg bg-slate-50">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  )
}
