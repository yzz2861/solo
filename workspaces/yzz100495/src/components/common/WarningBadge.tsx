import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { Warning } from '@/types';
import { cn } from '@/lib/utils';

interface WarningBadgeProps {
  warning: Warning;
  showIcon?: boolean;
  className?: string;
}

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const colorMap = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};

const pulseMap = {
  info: false,
  warning: true,
  error: true,
};

export const WarningBadge = ({ warning, showIcon = true, className }: WarningBadgeProps) => {
  const Icon = iconMap[warning.severity];
  const shouldPulse = pulseMap[warning.severity];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium',
        colorMap[warning.severity],
        shouldPulse && 'animate-pulse',
        className
      )}
    >
      {showIcon && <Icon className="w-4 h-4" />}
      <span>{warning.message}</span>
    </div>
  );
};

interface WarningListProps {
  warnings: Warning[];
  className?: string;
}

export const WarningList = ({ warnings, className }: WarningListProps) => {
  if (warnings.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {warnings.map((warning, index) => (
        <WarningBadge key={`${warning.type}-${index}`} warning={warning} />
      ))}
    </div>
  );
};
