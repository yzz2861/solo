import { cn } from '@/lib/utils';
import type { RiskLevel, DispatchStatus } from '@/engine/types';
import { RISK_LEVEL_LABELS } from '@/engine/thresholds';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  pulse?: boolean;
  showLabel?: boolean;
  className?: string;
}

const levelStyles: Record<RiskLevel, { bg: string; ring: string; text: string; dot: string; badge: string }> = {
  safe: {
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  caution: {
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  warning: {
    bg: 'bg-orange-50',
    ring: 'ring-orange-300',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  danger: {
    bg: 'bg-red-50',
    ring: 'ring-red-300',
    text: 'text-red-700',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 border-red-200',
  },
};

const sizeMap = {
  sm: { circle: 'h-4 w-4', text: 'text-xs' },
  md: { circle: 'h-8 w-8', text: 'text-sm' },
  lg: { circle: 'h-16 w-16', text: 'text-2xl' },
  xl: { circle: 'h-24 w-24', text: 'text-4xl' },
};

const initialMap: Record<RiskLevel, string> = {
  safe: '安',
  caution: '低',
  warning: '中',
  danger: '危',
};

export function RiskBadge({
  level,
  size = 'md',
  pulse = false,
  showLabel = true,
  className,
}: RiskBadgeProps) {
  const styles = levelStyles[level];
  const dims = sizeMap[size];
  const label = RISK_LEVEL_LABELS[level];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        {pulse && (
          <span
            className={cn(
              'absolute inset-0 rounded-full ring-2 opacity-75 animate-ping',
              styles.ring,
            )}
            style={{ animationDuration: '1.8s' }}
          />
        )}
        <div
          className={cn(
            'relative rounded-full flex items-center justify-center ring-2 shadow-inner font-bold',
            styles.bg,
            styles.ring,
            styles.text,
            dims.circle,
            pulse && 'shadow-lg',
          )}
        >
          {size === 'sm' ? (
            <span className={cn('block rounded-full', styles.dot, 'h-2 w-2')} />
          ) : (
            <span className={cn('font-black', dims.text)}>{initialMap[level]}</span>
          )}
        </div>
      </div>
      {showLabel && size !== 'sm' && (
        <span className={cn('font-semibold', styles.text, size === 'xl' && 'text-xl')}>
          {label}
        </span>
      )}
      {showLabel && size === 'sm' && (
        <span className={cn('text-xs font-medium', styles.text)}>{label}</span>
      )}
    </div>
  );
}

interface StatusBadgeProps {
  status: DispatchStatus;
  className?: string;
}

const statusStyles: Record<DispatchStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  dispatched: 'bg-sky-100 text-sky-700 border-sky-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const statusLabels: Record<DispatchStatus, string> = {
  pending: '待调度',
  dispatched: '已派车',
  completed: '已完成',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border',
        statusStyles[status],
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {statusLabels[status]}
    </span>
  );
}

export function RiskTag({ level, score }: { level: RiskLevel; score?: number }) {
  const styles = levelStyles[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border',
        styles.badge,
      )}
    >
      <span className={cn('w-2 h-2 rounded-full', styles.dot)} />
      {RISK_LEVEL_LABELS[level]}
      {typeof score === 'number' && <span className="opacity-80">{score.toFixed(0)}分</span>}
    </span>
  );
}
