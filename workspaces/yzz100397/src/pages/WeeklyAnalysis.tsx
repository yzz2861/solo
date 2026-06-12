import { useMemo, useState } from 'react';
import Card from '@/components/Card';
import StatBadge, { getWasteColor } from '@/components/StatBadge';
import { useAppStore } from '@/store/useAppStore';
import { computeAllWaste, analyzeWeeklyErrors, getWeekNumber, formatNumber } from '@/utils/analytics';
import type { WeeklyErrorAnalysis } from '@/types';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

export default function WeeklyAnalysis() {
  const { dishes, dailyRecords } = useAppStore();
  const [selectedWeeks, setSelectedWeeks] = useState(6);
  const [selectedDishIds, setSelectedDishIds] = useState<string[]>([]);

  const sortedRecords = useMemo(
    () => [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date)),
    [dailyRecords]
  );

  const wasteData = useMemo(
    () => computeAllWaste(sortedRecords, dishes),
    [sortedRecords, dishes]
  );

  const weeklyAnalyses = useMemo(
    () => analyzeWeeklyErrors(wasteData, dishes, selectedWeeks),
    [wasteData, dishes, selectedWeeks]
  );

  const systematicIssues = weeklyAnalyses.filter(w => w.isSystematic);
  const anomalies = weeklyAnalyses.filter(w => w.anomalyDates.length > 0 && !w.isSystematic);
  const stable = weeklyAnalyses.filter(w => !w.isSystematic && w.anomalyDates.length === 0);

  const weeklyTrendChartData = useMemo(() => {
    const currentWeek = getWeekNumber(sortedRecords[sortedRecords.length - 1]?.date ?? new Date().toISOString());
    const weekNumbers: number[] = [];
    for (let i = selectedWeeks - 1; i >= 0; i--) {
      weekNumbers.push(currentWeek - i);
    }

    const dishesToShow = selectedDishIds.length > 0
      ? selectedDishIds
      : systematicIssues.slice(0, 4).map(s => s.dishId);

    if (dishesToShow.length === 0) return { data: [], dishNames: [] as string[] };

    const data = weekNumbers.map(wn => {
      const row: Record<string, number | string> = { week: `第${wn}周` };
      for (const dishId of dishesToShow) {
        const dishWastes = wasteData.filter(w => {
          if (w.dishId !== dishId || w.isEstimated) return false;
          return getWeekNumber(w.date) === wn;
        });
        const avg = dishWastes.length > 0
          ? dishWastes.reduce((s, w) => s + w.wasteRate, 0) / dishWastes.length
          : 0;
        const dish = dishes.find(d => d.id === dishId);
        row[dish?.name ?? dishId] = Number(avg.toFixed(1));
      }
      return row;
    });

    const dishNames = dishesToShow.map(id => dishes.find(d => d.id === id)?.name ?? id);
    return { data, dishNames };
  }, [wasteData, dishes, sortedRecords, selectedDishIds, selectedWeeks, systematicIssues]);

  const LINE_COLORS = ['#f97316', '#f43f5e', '#fbbf24', '#3b82f6', '#10b981', '#a855f7'];

  function toggleDish(id: string) {
    setSelectedDishIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 6 ? [...prev, id] : prev
    );
  }

  function renderTrendIcon(trend: WeeklyErrorAnalysis['errorTrend']) {
    if (trend === 'increasing') return <ArrowUpRight className="w-3.5 h-3.5 text-danger-400" />;
    if (trend === 'decreasing') return <ArrowDownRight className="w-3.5 h-3.5 text-success-400" />;
    return <Minus className="w-3.5 h-3.5 text-surface-700" />;
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-white font-semibold">周误差分析</h2>
          <p className="text-sm text-surface-700 mt-1">识别系统性采购问题 vs 偶发活动异常</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-surface-700">分析周数</span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-900 border border-surface-800">
            {[4, 6, 8].map(n => (
              <button
                key={n}
                onClick={() => setSelectedWeeks(n)}
                className={cn(
                  'px-3 py-1 rounded-lg text-sm font-medium transition-all',
                  selectedWeeks === n ? 'bg-brand-500 text-white' : 'text-surface-700 hover:text-white'
                )}
              >
                {n}周
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="!p-5" delay={0}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-danger-500/15 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-danger-400" />
            </div>
            <div>
              <p className="text-xs text-surface-700">系统性偏高（采购估算问题）</p>
              <p className="text-3xl font-mono font-bold text-danger-400">{systematicIssues.length}</p>
              <p className="text-[11px] text-surface-700 mt-0.5">持续浪费率高、波动小</p>
            </div>
          </div>
        </Card>

        <Card className="!p-5" delay={50}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning-500/15 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-warning-400" />
            </div>
            <div>
              <p className="text-xs text-surface-700">单点异常（特殊活动）</p>
              <p className="text-3xl font-mono font-bold text-warning-400">{anomalies.length}</p>
              <p className="text-[11px] text-surface-700 mt-0.5">偶发突增，正常日稳定</p>
            </div>
          </div>
        </Card>

        <Card className="!p-5" delay={100}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success-400" />
            </div>
            <div>
              <p className="text-xs text-surface-700">正常波动</p>
              <p className="text-3xl font-mono font-bold text-success-400">{stable.length}</p>
              <p className="text-[11px] text-surface-700 mt-0.5">浪费率在合理区间</p>
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="周均浪费率趋势"
        subtitle={selectedDishIds.length > 0 ? `已选 ${selectedDishIds.length} 个菜品（最多6个）` : '默认展示系统性偏高的菜品'}
        icon={<BarChart3 className="w-5 h-5" />}
        delay={150}
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrendChartData.data} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis
                domain={[0, 60]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <ReferenceLine y={15} stroke="#10b981" strokeDasharray="4 4" label={{ value: '目标线 15%', fill: '#10b981', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={30} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '警戒线 30%', fill: '#f43f5e', fontSize: 10, position: 'right' }} />
              {weeklyTrendChartData.dishNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-4 border-t border-surface-800">
          <p className="text-xs text-surface-700 mb-3">选择菜品对比（最多6个）：</p>
          <div className="flex flex-wrap gap-2">
            {dishes.map((dish, i) => {
              const active = selectedDishIds.includes(dish.id);
              const analysis = weeklyAnalyses.find(w => w.dishId === dish.id);
              return (
                <button
                  key={dish.id}
                  onClick={() => toggleDish(dish.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5',
                    active
                      ? 'border-transparent text-white shadow-card'
                      : 'border-surface-800 text-surface-700 hover:border-surface-700 hover:text-slate-300'
                  )}
                  style={active ? { backgroundColor: LINE_COLORS[i % LINE_COLORS.length] } : {}}
                >
                  {analysis && renderTrendIcon(analysis.errorTrend)}
                  {dish.name}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {systematicIssues.length > 0 && (
        <Card
          title="系统性偏高 — 建议调整采购估算"
          subtitle="这些菜品连续多周浪费率偏高且稳定，很可能是备餐基准量定高了"
          icon={<AlertTriangle className="w-5 h-5 text-danger-400" />}
          delay={200}
          className="border-danger-500/30"
        >
          <div className="space-y-2">
            {systematicIssues.map(item => {
              const colors = getWasteColor(item.avgErrorRate);
              const suggestedCut = Math.max(10, Math.round((item.avgErrorRate - 15) * 0.8));
              return (
                <div key={item.dishId} className="flex items-center gap-4 p-4 rounded-xl bg-danger-500/5 border border-danger-500/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-medium text-white">{item.dishName}</span>
                      {renderTrendIcon(item.errorTrend)}
                      <StatBadge value={item.avgErrorRate} type="waste" size="sm" />
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden w-64">
                      <div className={cn('h-full rounded-full', colors.bar)} style={{ width: `${Math.min(item.avgErrorRate, 60)}%` }} />
                    </div>
                    <p className="text-xs text-danger-400 mt-2">
                      建议：将该菜品备餐基准量调低约 <strong>{suggestedCut}%</strong>，观察下周效果
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-700">建议调低幅度</p>
                    <p className="text-2xl font-mono font-bold text-danger-400">{suggestedCut}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {anomalies.length > 0 && (
        <Card
          title="单点异常事件"
          subtitle="特定日期浪费率突增，通常为团队客变动、天气异常或临时活动导致"
          icon={<AlertCircle className="w-5 h-5 text-warning-400" />}
          delay={250}
        >
          <div className="space-y-2">
            {anomalies.map(item => (
              <div key={item.dishId} className="flex items-start gap-4 p-4 rounded-xl bg-warning-500/5 border border-warning-500/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-medium text-white">{item.dishName}</span>
                    {renderTrendIcon(item.errorTrend)}
                    <StatBadge value={item.avgErrorRate} type="waste" size="sm" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.anomalyDates.map(date => (
                      <span key={date} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-850 text-xs text-slate-300 font-mono">
                        <Calendar className="w-3 h-3 text-warning-400" />
                        {date}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-surface-700">异常次数</p>
                  <p className="text-2xl font-mono font-bold text-warning-400">{item.anomalyDates.length}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="全部菜品误差详情" icon={<TrendingUp className="w-5 h-5" />} delay={300}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-surface-700 border-b border-surface-800">
                <th className="py-3 px-3 font-medium">菜品</th>
                <th className="py-3 px-3 font-medium">周均浪费率</th>
                <th className="py-3 px-3 font-medium">趋势</th>
                <th className="py-3 px-3 font-medium">问题类型</th>
                <th className="py-3 px-3 font-medium">异常日期</th>
                <th className="py-3 px-3 font-medium text-right">建议</th>
              </tr>
            </thead>
            <tbody>
              {weeklyAnalyses.map(item => {
                const colors = getWasteColor(item.avgErrorRate);
                return (
                  <tr key={item.dishId} className="border-b border-surface-800/50 hover:bg-surface-850/30">
                    <td className="py-3 px-3 text-white font-medium">{item.dishName}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                          <div className={cn('h-full rounded-full', colors.bar)} style={{ width: `${Math.min(item.avgErrorRate, 60)}%` }} />
                        </div>
                        <StatBadge value={item.avgErrorRate} type="waste" size="sm" />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-slate-300 text-xs">
                        {renderTrendIcon(item.errorTrend)}
                        {item.errorTrend === 'increasing' ? '上升' : item.errorTrend === 'decreasing' ? '下降' : '稳定'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {item.isSystematic ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger-500/15 text-danger-400 text-xs">
                          <AlertTriangle className="w-3 h-3" /> 采购估算偏高
                        </span>
                      ) : item.anomalyDates.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning-500/15 text-warning-400 text-xs">
                          <AlertCircle className="w-3 h-3" /> 活动异常
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success-500/15 text-success-400 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> 正常
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-xs">
                      {item.anomalyDates.length > 0 ? item.anomalyDates.join(', ') : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300 text-xs font-medium">
                      {item.isSystematic
                        ? `下调 ${Math.max(10, Math.round((item.avgErrorRate - 15) * 0.8))}%`
                        : item.anomalyDates.length > 2
                        ? '核实异常原因'
                        : '保持现有标准'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
