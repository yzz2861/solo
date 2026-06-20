import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { RiskLevel, Warning } from '@/types';
import { cn } from '@/lib/utils';

interface RiskIndicatorProps {
  riskLevel: RiskLevel;
  积水系数: number;
  className?: string;
}

export function RiskIndicator({ riskLevel, 积水系数, className }: RiskIndicatorProps) {
  const config = {
    safe: {
      label: '安全',
      sublabel: '无积水风险',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-500',
      icon: CheckCircle,
      progressColor: 'bg-emerald-500',
    },
    warning: {
      label: '临界',
      sublabel: '存在积水风险',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-500',
      icon: AlertTriangle,
      progressColor: 'bg-amber-500',
    },
    danger: {
      label: '危险',
      sublabel: '有积水风险',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      icon: AlertCircle,
      progressColor: 'bg-red-500',
    },
  };

  const cfg = config[riskLevel];
  const Icon = cfg.icon;
  const progressWidth = Math.min(积水系数 * 50, 100);

  return (
    <div className={cn('border-l-4 p-4', cfg.borderColor, cfg.bgColor, className)}>
      <div className="flex items-center gap-3">
        <Icon className={cn('w-8 h-8', cfg.color)} />
        <div>
          <div className={cn('text-xl font-bold', cfg.color)}>
            {cfg.label}
          </div>
          <div className="text-sm text-zinc-600">
            {cfg.sublabel}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-zinc-500">积水系数</div>
          <div className={cn('text-2xl font-bold', cfg.color)}>
            {积水系数 === Infinity ? '∞' : 积水系数.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>0</span>
          <span className="text-emerald-600">安全 0.8</span>
          <span className="text-amber-600">临界 1.0</span>
          <span>危险</span>
        </div>
        <div className="h-2 bg-zinc-200 overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500', cfg.progressColor)}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function WarningCard({ warning }: { warning: Warning }) {
  const config = {
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400',
      textColor: 'text-blue-800',
      icon: Info,
      iconColor: 'text-blue-500',
    },
    warning: {
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-400',
      textColor: 'text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
    },
    danger: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      textColor: 'text-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-500',
    },
  };

  const cfg = config[warning.level];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border-l-4 animate-pulse-once',
        cfg.bgColor,
        cfg.borderColor
      )}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', cfg.iconColor)} />
      <p className={cn('text-sm', cfg.textColor)}>
        {warning.message}
      </p>
    </div>
  );
}

export function WarningList({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;

  const sorted = [...warnings].sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 };
    return order[a.level] - order[b.level];
  });

  return (
    <div className="space-y-2">
      {sorted.map((warning, index) => (
        <WarningCard key={index} warning={warning} />
      ))}
    </div>
  );
}
