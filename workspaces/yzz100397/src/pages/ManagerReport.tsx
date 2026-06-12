import { useMemo, useState } from 'react';
import Card from '@/components/Card';
import StatBadge, { getWasteColor } from '@/components/StatBadge';
import { useAppStore } from '@/store/useAppStore';
import { computeAllWaste, classifyErrorReason, formatNumber, getDaysAgo } from '@/utils/analytics';
import type { WasteAnalysis } from '@/types';
import {
  FileBarChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  AlertCircle,
  Users,
  CloudRain,
  Calculator,
  BarChart3,
  PieChart,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { cn } from '@/lib/utils';

type TimeRange = '7' | '30' | 'all';

const REASON_COLORS: Record<string, string> = {
  '天气因素': '#3b82f6',
  '团队客影响': '#fbbf24',
  '团队客变动': '#f97316',
  '估算偏差': '#64748b',
};

export default function ManagerReport() {
  const { dishes, dailyRecords } = useAppStore();
  const [range, setRange] = useState<TimeRange>('30');

  const sortedRecords = useMemo(
    () => [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date)),
    [dailyRecords]
  );

  const filteredRecords = useMemo(() => {
    if (range === 'all') return sortedRecords;
    const days = Number(range);
    const cutoff = getDaysAgo(days);
    return sortedRecords.filter(r => r.date >= cutoff);
  }, [sortedRecords, range]);

  const wasteData = useMemo(
    () => computeAllWaste(filteredRecords, dishes),
    [filteredRecords, dishes]
  );

  const totalWasteCost = wasteData.reduce((s, w) => s + w.wastedCost, 0);
  const avgWasteRate = wasteData.length > 0
    ? wasteData.reduce((s, w) => s + w.wasteRate, 0) / wasteData.length
    : 0;
  const totalWastedKg = wasteData.reduce((s, w) => s + w.wastedKg, 0);

  const estimatedCount = wasteData.filter(w => w.isEstimated).length;

  const topWasteByRate = useMemo(() => {
    const map = new Map<string, { name: string; totalRate: number; count: number; cost: number; kg: number }>();
    for (const w of wasteData) {
      const cur = map.get(w.dishId) ?? { name: w.dishName, totalRate: 0, count: 0, cost: 0, kg: 0 };
      cur.totalRate += w.wasteRate;
      cur.count += 1;
      cur.cost += w.wastedCost;
      cur.kg += w.wastedKg;
      map.set(w.dishId, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v, avgRate: v.count > 0 ? v.totalRate / v.count : 0 }))
      .sort((a, b) => b.avgRate - a.avgRate)
      .slice(0, 8);
  }, [wasteData]);

  const topWasteByCost = useMemo(() => {
    return [...topWasteByRate].sort((a, b) => b.cost - a.cost).slice(0, 8);
  }, [topWasteByRate]);

  const costTrend = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const w of wasteData) {
      byDate.set(w.date, (byDate.get(w.date) ?? 0) + w.wastedCost);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({
        date: date.slice(5),
        浪费金额: Number(cost.toFixed(0)),
      }));
  }, [wasteData]);

  const reasonDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const daily of filteredRecords) {
      const reason = classifyErrorReason(daily);
      counts[reason] = (counts[reason] ?? 0) + 1;
    }
    const estimatedDays = wasteData.filter(w => w.isEstimated).length;
    if (estimatedDays > 0) {
      counts['数据不全'] = estimatedDays;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords, wasteData]);

  const categoryBreakdown = useMemo(() => {
    const byCat: Record<string, { cost: number; kg: number }> = {
      hot: { cost: 0, kg: 0 }, cold: { cost: 0, kg: 0 }, staple: { cost: 0, kg: 0 }, beverage: { cost: 0, kg: 0 },
    };
    const catNames: Record<string, string> = { hot: '热菜', cold: '凉菜', staple: '主食', beverage: '饮品' };

    for (const w of wasteData) {
      const dish = dishes.find(d => d.id === w.dishId);
      if (dish) {
        byCat[dish.category].cost += w.wastedCost;
        byCat[dish.category].kg += w.wastedKg;
      }
    }
    return Object.entries(byCat).map(([cat, v]) => ({
      category: catNames[cat],
      浪费金额: Number(v.cost.toFixed(0)),
      浪费重量: Number(v.kg.toFixed(1)),
    }));
  }, [wasteData, dishes]);

  const savingPotential = avgWasteRate > 15 ? totalWasteCost * ((avgWasteRate - 15) / avgWasteRate) : 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-white font-semibold">总经理报表</h2>
          <p className="text-sm text-surface-700 mt-1">全店浪费概览、成本趋势与误差归因</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-900 border border-surface-800">
          {(['7', '30', 'all'] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                range === r ? 'bg-brand-500 text-white shadow-card' : 'text-surface-700 hover:text-white'
              )}
            >
              {r === 'all' ? '全部' : `近${r}天`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="!p-5" delay={0}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">平均浪费率</p>
              <p className="text-3xl font-mono font-bold">
                <StatBadge value={avgWasteRate} type="waste" size="lg" showSuffix={false} />
                <span className="text-lg text-surface-700 ml-1">%</span>
              </p>
            </div>
            <BarChart3 className="w-6 h-6 text-brand-400" />
          </div>
        </Card>

        <Card className="!p-5" delay={50}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">浪费总金额</p>
              <p className="text-3xl font-mono font-bold text-danger-400">¥{formatNumber(totalWasteCost, 0)}</p>
              <p className="text-[11px] text-surface-700 mt-1">约 {totalWastedKg.toFixed(0)} kg</p>
            </div>
            <DollarSign className="w-6 h-6 text-danger-400" />
          </div>
        </Card>

        <Card className="!p-5" delay={100}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">节约潜力</p>
              <p className="text-3xl font-mono font-bold text-success-400">¥{formatNumber(savingPotential, 0)}</p>
              <p className="text-[11px] text-surface-700 mt-1">目标 ≤15%</p>
            </div>
            <TrendingDown className="w-6 h-6 text-success-400" />
          </div>
        </Card>

        <Card className="!p-5" delay={150}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">分析天数</p>
              <p className="text-3xl font-mono font-bold text-white">{filteredRecords.length}</p>
              <p className="text-[11px] text-surface-700 mt-1">{wasteData.length} 条菜品记录</p>
            </div>
            <Calendar className="w-6 h-6 text-blue-400" />
          </div>
        </Card>

        <Card className="!p-5" delay={200}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">数据完整度</p>
              <p className="text-3xl font-mono font-bold text-white">
                {wasteData.length > 0 ? Math.round((1 - estimatedCount / wasteData.length) * 100) : 100}
                <span className="text-lg text-surface-700 ml-1">%</span>
              </p>
              <p className="text-[11px] text-warning-400 mt-1">{estimatedCount} 条估算</p>
            </div>
            <AlertCircle className={cn('w-6 h-6', estimatedCount > 0 ? 'text-warning-400' : 'text-success-400')} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="浪费金额趋势" icon={<TrendingUp className="w-5 h-5" />} delay={250}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costTrend} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                  formatter={(v: number) => [`¥${v}`, '浪费金额']}
                />
                <Line
                  type="monotone"
                  dataKey="浪费金额"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f43f5e' }}
                  activeDot={{ r: 5 }}
                  fill="url(#costGrad)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="误差原因分布" icon={<PieChart className="w-5 h-5" />} delay={300}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={reasonDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={55}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#475569' }}
                >
                  {reasonDistribution.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={REASON_COLORS[entry.name] || ['#f97316', '#3b82f6', '#fbbf24', '#10b981', '#a855f7'][i % 5]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            <div className="flex items-center gap-1.5"><CloudRain className="w-3 h-3 text-blue-400" /> 天气因素</div>
            <div className="flex items-center gap-1.5"><Users className="w-3 h-3 text-amber-400" /> 团队客</div>
            <div className="flex items-center gap-1.5"><Calculator className="w-3 h-3 text-slate-400" /> 估算偏差</div>
            <div className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-warning-400" /> 数据不全</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="浪费率 TOP 菜品" subtitle="按平均浪费率排序" icon={<Award className="w-5 h-5 text-danger-400" />} delay={350}>
          <div className="space-y-2">
            {topWasteByRate.map((item, idx) => {
              const colors = getWasteColor(item.avgRate);
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-850/40 hover:bg-surface-850 transition-colors">
                  <span className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0',
                    idx === 0 ? 'bg-danger-500/20 text-danger-400' :
                    idx === 1 ? 'bg-warning-500/20 text-warning-400' :
                    idx === 2 ? 'bg-brand-500/20 text-brand-400' :
                    'bg-surface-800 text-surface-700'
                  )}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-white truncate">{item.name}</span>
                      <StatBadge value={item.avgRate} type="waste" size="sm" />
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', colors.bar)}
                        style={{ width: `${Math.min(item.avgRate, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[11px] text-surface-700">
                      <span>{item.count} 天数据</span>
                      <span className="text-danger-400 font-mono">浪费 ¥{formatNumber(item.cost, 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="浪费金额 TOP 菜品" subtitle="按浪费金额排序" icon={<DollarSign className="w-5 h-5 text-brand-400" />} delay={400}>
          <div className="space-y-2">
            {topWasteByCost.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-850/40 hover:bg-surface-850 transition-colors">
                <span className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0',
                  idx === 0 ? 'bg-brand-500/20 text-brand-400' :
                  idx === 1 ? 'bg-warning-500/20 text-warning-400' :
                  idx === 2 ? 'bg-success-500/20 text-success-400' :
                  'bg-surface-800 text-surface-700'
                )}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white truncate">{item.name}</span>
                    <span className="font-mono font-bold text-brand-400 text-sm">¥{formatNumber(item.cost, 0)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
                      style={{ width: `${Math.min((item.cost / topWasteByCost[0].cost) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[11px] text-surface-700">
                    <span>{item.kg.toFixed(1)} kg</span>
                    <span className="font-mono">平均浪费 {item.avgRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="分类浪费对比" icon={<FileBarChart className="w-5 h-5" />} delay={450}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryBreakdown} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
              <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar yAxisId="left" dataKey="浪费金额" fill="#f97316" radius={[6, 6, 0, 0]} name="浪费金额 (元)" />
              <Bar yAxisId="right" dataKey="浪费重量" fill="#3b82f6" radius={[6, 6, 0, 0]} name="浪费重量 (kg)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
