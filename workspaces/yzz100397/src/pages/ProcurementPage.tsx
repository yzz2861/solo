import { useMemo, useState } from 'react';
import Card from '@/components/Card';
import StatBadge, { getWasteColor } from '@/components/StatBadge';
import { useAppStore } from '@/store/useAppStore';
import { computeAllWaste, analyzeWeeklyErrors, formatNumber } from '@/utils/analytics';
import { CATEGORY_LABELS, DishCategory } from '@/types';
import {
  ShoppingCart,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  PackageMinus,
  Download,
  Filter,
  BarChart3,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortKey = 'wasteRate' | 'cost' | 'kg' | 'suggestedCut';
type FilterCat = 'all' | DishCategory;

export default function ProcurementPage() {
  const { dishes, dailyRecords } = useAppStore();
  const [sortKey, setSortKey] = useState<SortKey>('cost');
  const [filterCat, setFilterCat] = useState<FilterCat>('all');
  const [showOnlyHigh, setShowOnlyHigh] = useState(false);

  const sortedRecords = useMemo(
    () => [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date)),
    [dailyRecords]
  );

  const wasteData = useMemo(
    () => computeAllWaste(sortedRecords, dishes),
    [sortedRecords, dishes]
  );

  const weeklyErrors = useMemo(
    () => analyzeWeeklyErrors(wasteData, dishes, 4),
    [wasteData, dishes]
  );

  const procurementItems = useMemo(() => {
    const items = dishes.map(dish => {
      const dishWastes = wasteData.filter(w => w.dishId === dish.id);
      const totalCost = dishWastes.reduce((s, w) => s + w.wastedCost, 0);
      const totalKg = dishWastes.reduce((s, w) => s + s + w.wastedKg, 0);
      const avgRate = dishWastes.length > 0
        ? dishWastes.reduce((s, w) => s + w.wasteRate, 0) / dishWastes.length
        : 0;

      const weekly = weeklyErrors.find(w => w.dishId === dish.id);
      let suggestedCut = 0;
      let priority: 'high' | 'medium' | 'low' = 'low';

      if (weekly?.isSystematic) {
        suggestedCut = Math.max(10, Math.round((avgRate - 15) * 0.8));
        priority = suggestedCut >= 20 ? 'high' : 'medium';
      } else if (avgRate > 25) {
        suggestedCut = Math.round((avgRate - 15) * 0.5);
        priority = suggestedCut >= 15 ? 'medium' : 'low';
      }

      return {
        dish,
        avgRate,
        totalCost,
        totalKg,
        count: dishWastes.length,
        suggestedCut,
        isSystematic: weekly?.isSystematic ?? false,
        priority,
        estimatedSaving: (totalCost * suggestedCut) / 100,
      };
    });

    let filtered = items;
    if (filterCat !== 'all') {
      filtered = filtered.filter(i => i.dish.category === filterCat);
    }
    if (showOnlyHigh) {
      filtered = filtered.filter(i => i.priority !== 'low');
    }

    filtered.sort((a, b) => {
      if (sortKey === 'wasteRate') return b.avgRate - a.avgRate;
      if (sortKey === 'cost') return b.totalCost - a.totalCost;
      if (sortKey === 'kg') return b.totalKg - a.totalKg;
      return b.suggestedCut - a.suggestedCut;
    });

    return filtered;
  }, [dishes, wasteData, weeklyErrors, sortKey, filterCat, showOnlyHigh]);

  const totals = useMemo(() => {
    const totalCost = procurementItems.reduce((s, i) => s + i.totalCost, 0);
    const totalSaving = procurementItems.reduce((s, i) => s + i.estimatedSaving, 0);
    const highPriority = procurementItems.filter(i => i.priority === 'high').length;
    const medPriority = procurementItems.filter(i => i.priority === 'medium').length;
    return { totalCost, totalSaving, highPriority, medPriority };
  }, [procurementItems]);

  function exportCsv() {
    const headers = ['菜品', '分类', '平均浪费率', '浪费金额(元)', '建议调低(%)', '预计月省(元)', '优先级'];
    const rows = procurementItems.map(i => [
      i.dish.name,
      CATEGORY_LABELS[i.dish.category],
      i.avgRate.toFixed(1) + '%',
      i.totalCost.toFixed(0),
      i.suggestedCut.toString(),
      i.estimatedSaving.toFixed(0),
      i.priority === 'high' ? '高' : i.priority === 'medium' ? '中' : '低',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `采购调整建议_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const PRIORITY_CONFIG = {
    high: { label: '高优先', color: 'text-danger-400', bg: 'bg-danger-500/15', border: 'border-danger-500/40' },
    medium: { label: '中优先', color: 'text-warning-400', bg: 'bg-warning-500/15', border: 'border-warning-500/40' },
    low: { label: '低优先', color: 'text-surface-700', bg: 'bg-surface-800', border: 'border-surface-800' },
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-white font-semibold">采购调整建议</h2>
          <p className="text-sm text-surface-700 mt-1">根据历史浪费数据，给出各菜品采购量调整建议</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-900 border border-surface-800 text-slate-200 text-sm hover:border-brand-500 hover:text-brand-400 transition-all"
        >
          <Download className="w-4 h-4" />
          导出 CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-5" delay={0}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">浪费总金额</p>
              <p className="text-3xl font-mono font-bold text-danger-400">¥{formatNumber(totals.totalCost, 0)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-danger-500/15 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-danger-400" />
            </div>
          </div>
        </Card>

        <Card className="!p-5" delay={50}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">预计月可节约</p>
              <p className="text-3xl font-mono font-bold text-success-400">¥{formatNumber(totals.totalSaving, 0)}</p>
              <p className="text-[11px] text-surface-700 mt-1">执行全部建议</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success-500/15 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-success-400" />
            </div>
          </div>
        </Card>

        <Card className="!p-5" delay={100}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">高优先调整</p>
              <p className="text-3xl font-mono font-bold text-danger-400">{totals.highPriority}</p>
              <p className="text-[11px] text-surface-700 mt-1">道菜品</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-danger-500/15 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-danger-400" />
            </div>
          </div>
        </Card>

        <Card className="!p-5" delay={150}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-700 mb-1">中优先调整</p>
              <p className="text-3xl font-mono font-bold text-warning-400">{totals.medPriority}</p>
              <p className="text-[11px] text-surface-700 mt-1">道菜品</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-warning-500/15 flex items-center justify-center">
              <Target className="w-6 h-6 text-warning-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="采购调整清单"
        subtitle="按优先级和浪费金额排序"
        icon={<ShoppingCart className="w-5 h-5" />}
        delay={200}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyHigh}
                onChange={e => setShowOnlyHigh(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-brand-500"
              />
              仅显示需调整
            </label>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-surface-700" />
              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value as FilterCat)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 text-xs focus:border-brand-500 focus:outline-none"
              >
                <option value="all">全部分类</option>
                <option value="hot">热菜</option>
                <option value="cold">凉菜</option>
                <option value="staple">主食</option>
                <option value="beverage">饮品</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-surface-700" />
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-850 border border-surface-800 text-slate-200 text-xs focus:border-brand-500 focus:outline-none"
              >
                <option value="cost">按浪费金额</option>
                <option value="wasteRate">按浪费率</option>
                <option value="kg">按浪费重量</option>
                <option value="suggestedCut">按建议幅度</option>
              </select>
            </div>
          </div>
        }
      >
        <div className="space-y-2">
          {procurementItems.map((item, idx) => {
            const priority = PRIORITY_CONFIG[item.priority];
            const colors = getWasteColor(item.avgRate);

            return (
              <div
                key={item.dish.id}
                className={cn(
                  'p-5 rounded-xl border transition-all opacity-0 animate-fade-up hover:bg-surface-850/40',
                  priority.border,
                  item.priority === 'high' ? 'bg-danger-500/5' : 'bg-surface-900/50'
                )}
                style={{ animationDelay: `${idx * 20}ms` }}
              >
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="font-medium text-white">{item.dish.name}</h4>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', priority.color, priority.bg)}>
                        {priority.label}
                      </span>
                      {item.isSystematic && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/15 text-brand-400 font-medium">
                          系统性问题
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-700">
                      {CATEGORY_LABELS[item.dish.category]} · 单位成本 ¥{item.dish.unitCost}/{item.dish.defaultUnit === 'kg' ? 'kg' : item.dish.defaultUnit === 'portion' ? '份' : '盘'}
                    </p>
                  </div>

                  <div className="min-w-[140px]">
                    <p className="text-[10px] text-surface-700 mb-1">平均浪费率</p>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-surface-800 overflow-hidden">
                        <div className={cn('h-full rounded-full', colors.bar)} style={{ width: `${Math.min(item.avgRate, 60)}%` }} />
                      </div>
                      <StatBadge value={item.avgRate} type="waste" size="sm" />
                    </div>
                    <p className="text-[10px] text-surface-700 mt-1">{item.count} 天数据</p>
                  </div>

                  <div className="min-w-[100px]">
                    <p className="text-[10px] text-surface-700 mb-1">浪费金额</p>
                    <p className="text-lg font-mono font-bold text-danger-400">¥{formatNumber(item.totalCost, 0)}</p>
                  </div>

                  <div className="min-w-[100px]">
                    <p className="text-[10px] text-surface-700 mb-1">浪费重量</p>
                    <p className="text-lg font-mono font-bold text-slate-300">{item.totalKg.toFixed(1)}<span className="text-xs text-surface-700 ml-1">kg</span></p>
                  </div>

                  <div className={cn(
                    'min-w-[120px] p-3 rounded-xl text-center',
                    item.suggestedCut > 0 ? 'bg-success-500/10 border border-success-500/30' : 'bg-surface-850'
                  )}>
                    <p className="text-[10px] text-surface-700 mb-0.5 flex items-center justify-center gap-1">
                      <PackageMinus className="w-3 h-3" /> 建议调低
                    </p>
                    <p className={cn(
                      'text-2xl font-mono font-bold',
                      item.suggestedCut > 0 ? 'text-success-400' : 'text-surface-700'
                    )}>
                      {item.suggestedCut > 0 ? `${item.suggestedCut}%` : '—'}
                    </p>
                    {item.suggestedCut > 0 && (
                      <p className="text-[10px] text-success-400 mt-0.5">月省 ¥{formatNumber(item.estimatedSaving, 0)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {procurementItems.length === 0 && (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-success-500/40 mx-auto mb-3" />
              <p className="text-surface-700 text-sm">暂无符合条件的菜品</p>
            </div>
          )}
        </div>
      </Card>

      <Card title="采购调整说明" icon={<AlertTriangle className="w-5 h-5 text-warning-400" />} delay={250}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-danger-500/5 border border-danger-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-danger-400" />
              <span className="font-medium text-danger-400">高优先调整</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              连续4周浪费率持续偏高（＞30%）且波动小，属于系统性备餐过多。
              <strong className="text-danger-400"> 建议立即调低采购量 15-25%</strong>，下周观察效果。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-warning-500/5 border border-warning-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-warning-400" />
              <span className="font-medium text-warning-400">中优先调整</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              浪费率偏高（＞25%）但存在一定波动，可能混合了异常事件。
              <strong className="text-warning-400"> 建议调低采购量 8-15%</strong>，同时关注团队客和天气变化。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-success-500/5 border border-success-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-success-400" />
              <span className="font-medium text-success-400">低优先 / 正常</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              浪费率在合理范围内（≤20%）或异常偶发。
              <strong className="text-success-400"> 维持现有采购标准</strong>，继续监控数据即可。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
