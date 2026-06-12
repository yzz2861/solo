import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { ChurnAnalysis } from '@/types'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  Clock,
  Shield,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const RISK_COLORS: Record<string, string> = {
  high: '#DC2626',
  medium: '#F59E0B',
  low: '#EAB308',
  safe: '#22C55E',
}

const RISK_LABELS: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
  safe: '安全',
}

function getBarColor(rate: number): string {
  if (rate < 40) return '#DC2626'
  if (rate <= 60) return '#F59E0B'
  return '#B76E79'
}

interface MetricCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  accent?: string
}

function MetricCard({ icon, value, label, accent }: MetricCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
          accent ?? 'bg-rose-50 text-rose-500'
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

interface ChartCardProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function ChartCard({ title, icon, children }: ChartCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center text-gray-400">
      <BarChart3 className="mb-2 h-10 w-10" />
      <p className="text-sm">暂无数据，请先导入客户及消费记录</p>
    </div>
  )
}

function ConsultantRepurchaseChart({ data }: { data: ChurnAnalysis[] }) {
  const chartData = useMemo(() => {
    const grouped: Record<string, { sum: number; count: number }> = {}
    for (const item of data) {
      if (item.isExcluded) continue
      const key = item.assignedConsultant || '未分配'
      if (!grouped[key]) grouped[key] = { sum: 0, count: 0 }
      grouped[key].sum += item.repurchaseRate
      grouped[key].count += 1
    }
    const result = Object.entries(grouped).map(([name, { sum, count }]) => ({
      name,
      rate: Math.round(sum / count),
    }))
    result.sort((a, b) => a.rate - b.rate)
    return result
  }, [data])

  const avgRate = useMemo(() => {
    if (chartData.length === 0) return 0
    return Math.round(chartData.reduce((s, d) => s + d.rate, 0) / chartData.length)
  }, [chartData])

  if (chartData.length === 0) return <EmptyState />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
        <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => [`${value}%`, '复购率']}
        />
        <Legend />
        <Bar dataKey="rate" name="复购率" radius={[0, 4, 4, 0]} barSize={20}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={getBarColor(entry.rate)} />
          ))}
        </Bar>
        <ReferenceLine x={avgRate} stroke="#B76E79" strokeDasharray="6 3" label={`均值 ${avgRate}%`} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChurnDistributionChart({ data }: { data: ChurnAnalysis[] }) {
  const { pieData, atRiskCount } = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0, safe: 0 }
    for (const item of data) {
      if (item.isExcluded) continue
      counts[item.riskLevel] = (counts[item.riskLevel] || 0) + 1
    }
    const pieData = (['high', 'medium', 'low', 'safe'] as const)
      .filter((k) => counts[k] > 0)
      .map((k) => ({ name: RISK_LABELS[k], value: counts[k], key: k }))
    const atRiskCount = counts.high + counts.medium + counts.low
    return { pieData, atRiskCount }
  }, [data])

  if (pieData.length === 0) return <EmptyState />

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            dataKey="value"
            paddingAngle={2}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {pieData.map((entry) => (
              <Cell key={entry.key} fill={RISK_COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold text-gray-800">{atRiskCount}</p>
        <p className="text-xs text-gray-500">风险客户</p>
      </div>
    </div>
  )
}

function VisitIntervalChart({ consumptions }: { consumptions: { consumeDate: string; customerId: string }[] }) {
  const chartData = useMemo(() => {
    const byMonth: Record<string, { dates: Set<string>; customers: Set<string> }> = {}
    for (const c of consumptions) {
      const month = c.consumeDate.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = { dates: new Set(), customers: new Set() }
      byMonth[month].dates.add(c.consumeDate)
      byMonth[month].customers.add(c.customerId)
    }
    const months = Object.keys(byMonth).sort()
    if (months.length === 0) return []
    const sorted = months.map((month) => ({
      month,
      avgInterval: byMonth[month].customers.size > 0
        ? Math.round(30 / (byMonth[month].dates.size / byMonth[month].customers.size))
        : 0,
      customerCount: byMonth[month].customers.size,
    }))
    return sorted
  }, [consumptions])

  if (chartData.length === 0) return <EmptyState />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ left: 0, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} unit="天" />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="avgInterval"
          name="平均间隔(天)"
          fill="#B76E79"
          fillOpacity={0.3}
          stroke="#B76E79"
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="customerCount"
          name="客户数"
          fill="#64748B"
          fillOpacity={0.2}
          stroke="#64748B"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function RiskHeatmap({ data }: { data: ChurnAnalysis[] }) {
  const { rows, columns, matrix, maxVal } = useMemo(() => {
    const consultantSet = new Set<string>()
    const columns = ['high', 'medium', 'low', 'safe'] as const
    for (const item of data) {
      if (item.isExcluded) continue
      consultantSet.add(item.assignedConsultant || '未分配')
    }
    const rows = Array.from(consultantSet).sort()
    const matrix: Record<string, Record<string, number>> = {}
    let maxVal = 0
    for (const r of rows) {
      matrix[r] = {}
      for (const c of columns) matrix[r][c] = 0
    }
    for (const item of data) {
      if (item.isExcluded) continue
      const key = item.assignedConsultant || '未分配'
      matrix[key][item.riskLevel] += 1
    }
    for (const r of rows) {
      for (const c of columns) {
        if (matrix[r][c] > maxVal) maxVal = matrix[r][c]
      }
    }
    return { rows, columns, matrix, maxVal }
  }, [data])

  if (rows.length === 0) return <EmptyState />

  function cellOpacity(count: number): number {
    if (maxVal === 0) return 0
    return 0.15 + (count / maxVal) * 0.85
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `minmax(80px, auto) repeat(${columns.length}, minmax(56px, 1fr))`,
        }}
      >
        <div />
        {columns.map((c) => (
          <div key={c} className="text-center text-xs font-medium text-gray-500 pb-1">
            {RISK_LABELS[c]}
          </div>
        ))}
        {rows.map((r) => (
          <div key={r} className="contents">
            <div className="flex items-center text-xs text-gray-700 font-medium truncate pr-2">
              {r}
            </div>
            {columns.map((c) => {
              const count = matrix[r][c]
              return (
                <div
                  key={`${r}-${c}`}
                  className="flex items-center justify-center rounded-md text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: count > 0
                      ? RISK_COLORS[c] + Math.round(cellOpacity(count) * 255).toString(16).padStart(2, '0')
                      : '#F5F0EB',
                    color: count > 0 && cellOpacity(count) > 0.5 ? '#fff' : '#6B7280',
                    minHeight: 36,
                  }}
                  title={`${r} - ${RISK_LABELS[c]}: ${count}人`}
                >
                  {count || '-'}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const churnAnalyses = useAppStore((s) => s.churnAnalyses)
  const customers = useAppStore((s) => s.customers)
  const consumptions = useAppStore((s) => s.consumptions)
  const role = useAppStore((s) => s.role)

  const activeAnalyses = useMemo(
    () => churnAnalyses.filter((a) => !a.isExcluded),
    [churnAnalyses]
  )

  const metrics = useMemo(() => {
    const totalCustomers = customers.filter((c) => !c.isExcluded).length
    const atRiskCount = activeAnalyses.filter((a) => a.riskScore >= 40).length
    const avgInterval =
      activeAnalyses.length > 0
        ? Math.round(activeAnalyses.reduce((s, a) => s + a.avgVisitInterval, 0) / activeAnalyses.length)
        : 0
    const avgRepurchase =
      activeAnalyses.length > 0
        ? Math.round(activeAnalyses.reduce((s, a) => s + a.repurchaseRate, 0) / activeAnalyses.length)
        : 0
    return { totalCustomers, atRiskCount, avgInterval, avgRepurchase }
  }, [customers, activeAnalyses])

  const hasData = activeAnalyses.length > 0

  return (
    <div className="min-h-screen bg-[#F5F0EB] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">流失分析仪表盘</h1>
            <p className="mt-1 text-sm text-gray-500">客户流失风险概览与顾问表现追踪</p>
          </div>
          {role === 'boss' && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700 border border-amber-200">
              <Shield className="h-3.5 w-3.5" />
              <span>管理者视图 · 仅展示聚合数据</span>
            </div>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Users className="h-5 w-5" />}
            value={metrics.totalCustomers}
            label="总客户数"
            accent="bg-blue-50 text-blue-500"
          />
          <MetricCard
            icon={<AlertTriangle className="h-5 w-5" />}
            value={metrics.atRiskCount}
            label="流失风险客户"
            accent="bg-red-50 text-red-500"
          />
          <MetricCard
            icon={<Clock className="h-5 w-5" />}
            value={`${metrics.avgInterval}天`}
            label="平均到店间隔"
            accent="bg-amber-50 text-amber-500"
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            value={`${metrics.avgRepurchase}%`}
            label="平均复购率"
            accent="bg-emerald-50 text-emerald-500"
          />
        </div>

        {!hasData ? (
          <div className="rounded-xl bg-white p-12 shadow-sm border border-gray-100 text-center">
            <BarChart3 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-400">暂无数据，请先导入客户及消费记录</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="顾问复购率对比" icon={<BarChart3 className="h-4 w-4 text-rose-400" />}>
              <ConsultantRepurchaseChart data={activeAnalyses} />
            </ChartCard>

            <ChartCard title="项目流失分布" icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}>
              <ChurnDistributionChart data={activeAnalyses} />
            </ChartCard>

            <ChartCard title="到店间隔趋势" icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}>
              <VisitIntervalChart consumptions={consumptions} />
            </ChartCard>

            <ChartCard title="流失风险热力图" icon={<Users className="h-4 w-4 text-blue-400" />}>
              <RiskHeatmap data={activeAnalyses} />
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  )
}
