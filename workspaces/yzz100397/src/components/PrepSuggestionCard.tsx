import type { PrepSuggestion } from '@/types';
import { UNIT_LABELS } from '@/types';
import { CloudRain, Users, TrendingDown, TrendingUp, CalendarDays, Sparkles } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

interface Props {
  suggestion: PrepSuggestion;
  index: number;
}

const REASON_CONFIG = {
  weather: { icon: CloudRain, label: '天气调整', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  occupancy: { icon: CalendarDays, label: '入住率调整', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  group: { icon: Users, label: '团队客影响', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  trend: { icon: TrendingDown, label: '近期趋势', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const CONFIDENCE_CONFIG = {
  high: { label: '高置信', color: 'text-success-400', border: 'border-success-500/30' },
  medium: { label: '中置信', color: 'text-warning-400', border: 'border-warning-500/30' },
  low: { label: '低置信', color: 'text-danger-400', border: 'border-danger-500/30' },
};

export default function PrepSuggestionCard({ suggestion, index }: Props) {
  const reason = REASON_CONFIG[suggestion.adjustmentReason];
  const confidence = CONFIDENCE_CONFIG[suggestion.confidence];
  const diff = suggestion.suggestedQty - suggestion.historicalAvg;
  const diffPct = suggestion.historicalAvg > 0 ? (diff / suggestion.historicalAvg) * 100 : 0;
  const isReduction = diff < 0;

  return (
    <div
      className={cn(
        'bg-surface-900 rounded-xl border-2 p-4 shadow-card opacity-0 animate-fade-up transition-all duration-200 hover:shadow-glow hover:-translate-y-0.5',
        confidence.border
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-display text-white font-semibold text-base">{suggestion.dishName}</h4>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', confidence.color, 'bg-surface-850')}>
          {confidence.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-2xl font-mono font-bold text-white">
            {formatNumber(suggestion.suggestedQty, 1)}
          </span>
          <span className="text-sm text-slate-400">{UNIT_LABELS[suggestion.suggestedUnit]}</span>
        </div>
        <p className="text-[11px] text-surface-700 mt-1">明日建议备餐量</p>
      </div>

      <div className="h-px bg-surface-800 my-3" />

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-surface-700">历史平均</span>
          <span className="font-mono text-slate-300">
            {formatNumber(suggestion.historicalAvg, 1)} {UNIT_LABELS[suggestion.suggestedUnit]}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-surface-700">建议调整</span>
          <span className={cn('font-mono font-medium flex items-center gap-1',
            isReduction ? 'text-success-400' : diffPct > 5 ? 'text-warning-400' : 'text-slate-300'
          )}>
            {isReduction ? <TrendingDown className="w-3 h-3" /> : diffPct > 5 && <TrendingUp className="w-3 h-3" />}
            {isReduction ? '-' : '+'}{Math.abs(diff).toFixed(1)} ({Math.abs(diffPct).toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-surface-700">调整原因</span>
          <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded', reason.color, reason.bg)}>
            <reason.icon className="w-3 h-3" />
            {reason.label}
          </span>
        </div>
      </div>
    </div>
  );
}
