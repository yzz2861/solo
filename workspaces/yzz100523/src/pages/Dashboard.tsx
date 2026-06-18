import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import dayjs from 'dayjs'
import { useReviewStore } from '../store/useReviewStore'
import { VIOLATION_META } from '../types'
import type { ViolationType } from '../types'
import { exportReminderSheet, generateReminderSheet } from '../lib/exportUtils'

export default function Dashboard() {
  const { sessions, productLines, anchors } = useReviewStore()

  const allViolations = useMemo(() => sessions.flatMap(s =>
    s.violations.filter(v => !v.exemption).map(v => ({ ...v, _pl: s.productLineId, _anchor: s.anchorId }))
  ), [sessions])

  const totalSessions = sessions.length
  const totalViolations = allViolations.length
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length
  const overallRate = totalSessions > 0
    ? Math.round(sessions.reduce((n, s) => {
      const v = s.violations.filter(x => !x.exemption).length
      const done = s.violations.filter(x => !x.exemption && x.correction?.isDone).length
      return n + (v > 0 ? done / v : 1)
    }, 0) / totalSessions * 100)
    : 100

  const plStats = useMemo(() => productLines.map(pl => {
    const plSessions = sessions.filter(s => s.productLineId === pl.id)
    const vs = plSessions.flatMap(s => s.violations.filter(v => !v.exemption))
    const corrected = vs.filter(v => v.correction?.isDone).length
    const critical = vs.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length
    return {
      id: pl.id,
      name: pl.name,
      color: pl.color,
      sessions: plSessions.length,
      violations: vs.length,
      corrected,
      critical,
      rate: vs.length > 0 ? Math.round(corrected / vs.length * 100) : 100,
      avg: plSessions.length > 0 ? Math.round(vs.length / plSessions.length * 10) / 10 : 0,
    }
  }), [productLines, sessions])

  const typeStats = useMemo(() => {
    const map = new Map<ViolationType, number>()
    allViolations.forEach(v => map.set(v.type, (map.get(v.type) ?? 0) + 1))
    return Array.from(map.entries()).map(([t, n]) => ({
      name: VIOLATION_META[t].label,
      value: n,
      color: VIOLATION_META[t].color,
      key: t,
    })).sort((a, b) => b.value - a.value)
  }, [allViolations])

  const trendData = useMemo(() => {
    const days: { day: string; count: number; critical: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day').format('MM-DD')
      const daySessions = sessions.filter(s => dayjs(s.liveDate).format('MM-DD') === d)
      const vs = daySessions.flatMap(s => s.violations.filter(v => !v.exemption))
      days.push({
        day: d,
        count: vs.length,
        critical: vs.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length,
      })
    }
    return days
  }, [sessions])

  const anchorRanking = useMemo(() => anchors.map(a => {
    const ss = sessions.filter(s => s.anchorId === a.id)
    const vs = ss.flatMap(s => s.violations.filter(v => !v.exemption))
    return {
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      sessions: ss.length,
      violations: vs.length,
      critical: vs.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length,
      avg: ss.length > 0 ? Math.round(vs.length / ss.length * 10) / 10 : 0,
    }
  }).sort((a, b) => b.violations - a.violations), [anchors, sessions])

  const keywordFreq = useMemo(() => {
    const map = new Map<string, number>()
    allViolations.forEach(v => {
      const kws = v.matchedKeyword.split(' + ')
      kws.forEach(k => map.set(k, (map.get(k) ?? 0) + 1))
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15)
  }, [allViolations])

  const maxKwFreq = Math.max(...keywordFreq.map(([, n]) => n), 1)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">风险汇总中心</h2>
          <p className="text-sm text-slate-500 mt-1">按商品线统计违规热力，识别高风险类型、主播和禁用词</p>
        </div>
        <div className="text-xs text-slate-500">
          数据范围：{totalSessions} 场直播 · 统计截止 {dayjs().format('YYYY-MM-DD HH:mm')}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPICard label="审查总场次" value={totalSessions} sub="覆盖所有商品线" color="#1E3A5F" icon="🎬" />
        <KPICard label="累计违规（确认）" value={totalViolations} sub="已排除已豁免项" color="#EF4444" icon="⚠️" />
        <KPICard label="已闭环场次" value={completedSessions} sub="整改+复播通过" color="#10B981" icon="✅" />
        <KPICard label="整体整改完成率" value={`${overallRate}%`} sub="豁免+已整改/总违规" color="#F59E0B" icon="📈" />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 card p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>🧵</span> 商品线违规统计
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={plStats} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
                formatter={(value: any, name: string) => {
                  const map: Record<string, string> = { violations: '违规数', critical: '高风险数', sessions: '场次' }
                  return [value, map[name] ?? name]
                }}
              />
              <Legend />
              <Bar dataKey="violations" name="违规总数" radius={[6, 6, 0, 0]}>
                {plStats.map((s, i) => (
                  <Cell key={i} fill={s.color} fillOpacity={0.85} />
                ))}
              </Bar>
              <Bar dataKey="critical" name="高风险违规" radius={[6, 6, 0, 0]} fill="#DC2626" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">按商品线查看详情 / 生成开播提醒</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {plStats.map(p => (
                <Link
                  key={p.id}
                  to={`/reminder/${p.id}`}
                  className="group p-3 rounded-xl border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="font-semibold text-sm text-slate-800 group-hover:text-brand-500">{p.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-xs mb-2">
                    <div><div className="font-bold text-slate-700">{p.sessions}</div><div className="text-slate-500">场次</div></div>
                    <div><div className="font-bold text-risk-medium">{p.violations}</div><div className="text-slate-500">违规</div></div>
                    <div><div className="font-bold text-risk-ok">{p.rate}%</div><div className="text-slate-500">整改率</div></div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.rate}%`, backgroundColor: p.color }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-5 space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span>🎯</span> 违规类型分布
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {typeStats.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span>📉</span> 近7日违规趋势
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="违规总数" stroke="#1E3A5F" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="critical" name="高风险数" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-6 card p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>👤</span> 主播违规排行
          </h3>
          <div className="space-y-3">
            {anchorRanking.filter(a => a.violations > 0).map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  i === 0 ? 'bg-amber-100 text-amber-700' :
                  i === 1 ? 'bg-slate-200 text-slate-600' :
                  i === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <img src={a.avatar} className="w-10 h-10 rounded-full border border-slate-200" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{a.name}</div>
                  <div className="text-xs text-slate-500">{a.sessions} 场 · 场均 {a.avg} 条违规</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-risk-medium">{a.violations}</div>
                  <div className="text-xs text-slate-500">总违规</div>
                </div>
                <div className="text-right w-14">
                  <div className={`text-lg font-bold ${a.critical > 3 ? 'text-risk-high' : 'text-amber-600'}`}>{a.critical}</div>
                  <div className="text-xs text-slate-500">高风险</div>
                </div>
              </div>
            ))}
            {anchorRanking.every(a => a.violations === 0) && (
              <div className="text-center py-10 text-slate-500">🎉 所有主播都保持合规，继续努力！</div>
            )}
          </div>
        </div>

        <div className="col-span-6 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <span>☁️</span> 高频禁用词 TOP 15
            </h3>
            <button
              onClick={() => {
                const pl = productLines[0]
                if (!pl) return
                const plSs = sessions.filter(s => s.productLineId === pl.id)
                alert(generateReminderSheet({
                  productLine: pl,
                  recentSessions: plSs,
                  topViolations: typeStats.slice(0, 3).map(s => ({ type: s.key as any, count: s.value })),
                  frequentKeywords: keywordFreq.map(([k]) => k),
                }).slice(0, 1500) + '\n...（完整内容请从商品线卡片进入开播提醒页导出）')
              }}
              className="btn-secondary text-xs !py-1 !px-3"
            >
              📝 生成开播提醒示例
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywordFreq.map(([kw, freq]) => {
              const size = 12 + Math.round((freq / maxKwFreq) * 14)
              const intensity = 0.15 + (freq / maxKwFreq) * 0.75
              return (
                <span
                  key={kw}
                  className="px-3 py-1.5 rounded-full font-medium"
                  style={{
                    fontSize: `${size}px`,
                    backgroundColor: `rgba(239,68,68,${intensity})`,
                    color: freq / maxKwFreq > 0.5 ? '#fff' : '#991B1B',
                  }}
                  title={`出现 ${freq} 次`}
                >
                  {kw} <span className="opacity-70 text-[0.7em]">×{freq}</span>
                </span>
              )
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="text-sm font-semibold text-slate-700 mb-3">TOP 违规类型 · 示例与应对</div>
            <div className="space-y-2">
              {typeStats.slice(0, 4).map(t => (
                <div key={t.key} className="p-3 rounded-lg border border-slate-200" style={{ backgroundColor: t.color + '0A' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="font-semibold text-sm" style={{ color: t.color }}>{t.name}</span>
                    <span className="badge bg-white text-slate-600 border border-slate-200 ml-auto">累计 {t.value} 次</span>
                  </div>
                  <div className="text-xs text-slate-600 pl-4">
                    {quickTipFor(t.key as ViolationType)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, sub, color, icon }: {
  label: string; value: number | string; sub: string; color: string; icon: string
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: color }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500 font-medium">{label}</span>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: color + '1A' }}
          >
            {icon}
          </div>
        </div>
        <div className="text-3xl font-black" style={{ color }}>{value}</div>
        <div className="text-xs text-slate-500 mt-1">{sub}</div>
      </div>
    </div>
  )
}

function quickTipFor(type: ViolationType): string {
  switch (type) {
    case 'MEDICAL_IMPLICATION': return '典型：治疗、根治、见效、消炎、降血压/血糖/血脂 → 正确：舒缓、改善、调理'
    case 'ABSOLUTE_WORD': return '典型：最、第一、顶级、唯一、100%、国家级 → 正确：优质、优选、高品质'
    case 'PRICE_PROMISE': return '典型：全网最低、最便宜、亏本、跳楼价 → 正确：促销价¥xx、限时3天'
    case 'FORBIDDEN_EFFECT': return '典型：美白、祛斑、减肥、丰胸、生发 → 需特证资质，改提亮/管理体重'
    case 'UNCLEAR_LOTTERY': return '典型：免费送、抽奖（无规则）→ 必须说清：条件+名额+时间+奖品+开奖方式'
    case 'EXAGGERATION': return '典型：疯抢、闭眼入、错过后悔、人手一件 → 客观描述卖点，用真实数据'
    default: return '谨慎表述，有疑问先找合规确认'
  }
}
