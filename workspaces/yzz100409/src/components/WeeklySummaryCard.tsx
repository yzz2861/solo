import type { WeeklySummary } from '../../shared/types';
import { Scale, ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  summary: WeeklySummary;
}

const WeeklySummaryCard = ({ summary }: Props) => {
  const dev = summary.deviationPercent;
  const hasActual = summary.dailyRecords.some((d) => d.actual !== null);

  const tone = hasActual
    ? dev < -15
      ? 'water'
      : dev <= 5
      ? 'green'
      : dev <= 15
      ? 'warning'
      : 'danger'
    : 'neutral';

  const meta = {
    water: {
      bar: 'from-water-300 to-water-500',
      chip: 'chip-info',
      label: '节水明显',
      icon: ArrowDownToLine,
    },
    green: {
      bar: 'from-greenhouse-300 to-greenhouse-500',
      chip: 'chip-success',
      label: '执行到位',
      icon: CheckCircle2,
    },
    warning: {
      bar: 'from-yellow-300 to-warning-500',
      chip: 'chip-warning',
      label: '偏多',
      icon: ArrowUpFromLine,
    },
    danger: {
      bar: 'from-red-300 to-red-500',
      chip: 'chip-warning bg-red-50 text-red-600',
      label: '过量明显',
      icon: ArrowUpFromLine,
    },
    neutral: {
      bar: 'from-greenhouse-100 to-greenhouse-300',
      chip: 'chip-info',
      label: '数据不足',
      icon: Scale,
    },
  }[tone];

  const Icon = meta.icon;
  const pctOfMax = Math.min(
    100,
    hasActual ? (summary.totalActual / Math.max(summary.totalSuggested, 0.01)) * 100 : 0
  );

  return (
    <div className="card-base p-5 sm:p-6 bg-gradient-to-br from-greenhouse-50/60 via-white to-paper overflow-hidden relative">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-greenhouse-gradient text-white flex items-center justify-center shadow-soft">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-greenhouse-800">
              本周灌溉总结
            </h3>
            <p className="text-xs text-greenhouse-500 mt-0.5">
              本周一起始：{summary.weekStart.slice(5)}
            </p>
          </div>
        </div>

        <span className={clsx(meta.chip, '!text-sm')}>
          <Icon className="w-4 h-4" />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
        <div className="rounded-2xl bg-white/70 border border-greenhouse-100 p-3 text-center">
          <p className="text-xs text-greenhouse-500 mb-1">建议总量</p>
          <p className="font-bold font-mono text-lg sm:text-xl text-water-600 tabular-nums">
            {summary.totalSuggested.toFixed(1)}
          </p>
          <p className="text-[10px] text-greenhouse-400">mm</p>
        </div>
        <div className="rounded-2xl bg-white/70 border border-greenhouse-100 p-3 text-center">
          <p className="text-xs text-greenhouse-500 mb-1">实际总量</p>
          <p className="font-bold font-mono text-lg sm:text-xl text-greenhouse-700 tabular-nums">
            {hasActual ? summary.totalActual.toFixed(1) : '—'}
          </p>
          <p className="text-[10px] text-greenhouse-400">mm</p>
        </div>
        <div className="rounded-2xl bg-white/70 border border-greenhouse-100 p-3 text-center">
          <p className="text-xs text-greenhouse-500 mb-1">累计偏差</p>
          <p
            className={clsx(
              'font-bold font-mono text-lg sm:text-xl tabular-nums',
              !hasActual && 'text-greenhouse-400',
              hasActual && dev < 0 && 'text-water-600',
              hasActual && dev >= 0 && dev <= 5 && 'text-greenhouse-700',
              hasActual && dev > 5 && 'text-warning-600'
            )}
          >
            {hasActual ? (dev > 0 ? '+' : '') + dev + '%' : '—'}
          </p>
          <p className="text-[10px] text-greenhouse-400">
            {hasActual ? (dev > 0 ? '超量' : dev < 0 ? '节约' : '一致') : '待填'}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-end justify-between text-xs mb-1.5">
          <span className="text-greenhouse-500">实际 / 建议</span>
          <span className="font-mono text-greenhouse-700">
            {hasActual ? pctOfMax.toFixed(0) + '%' : '—'}
          </span>
        </div>
        <div className="h-4 rounded-full bg-greenhouse-50 overflow-hidden relative">
          <div
            className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-700', meta.bar)}
            style={{ width: hasActual ? `${Math.max(4, pctOfMax)}%` : '4%' }}
          />
          <div className="absolute left-[100%] top-0 bottom-0 w-px bg-water-400 opacity-60 -translate-x-px" />
        </div>
        <div className="flex justify-between text-[10px] text-greenhouse-400 mt-1">
          <span>0</span>
          <span className="text-water-500 font-medium">
            建议目标 {summary.totalSuggested.toFixed(1)} mm
          </span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-greenhouse-100">
        <p className="text-sm text-greenhouse-800 leading-relaxed">
          {summary.advice}
        </p>
      </div>
    </div>
  );
};

export default WeeklySummaryCard;
