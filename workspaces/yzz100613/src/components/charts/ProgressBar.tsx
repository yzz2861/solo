import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  min?: number;
  label?: string;
  showValue?: boolean;
  color?: 'primary' | 'accent' | 'default';
  className?: string;
}

export function ProgressBar({
  value,
  max = 1,
  min = -1,
  label,
  showValue = false,
  color = 'primary',
  className,
}: ProgressBarProps) {
  const range = max - min;
  const percentage = ((value - min) / range) * 100;
  const centerPercentage = ((0 - min) / range) * 100;

  const colorClasses = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-400',
    accent: 'bg-gradient-to-r from-accent-500 to-accent-400',
    default: 'bg-gradient-to-r from-dark-500 to-dark-400',
  };

  const isPositive = value >= 0;
  const barWidth = Math.min(Math.abs(percentage - centerPercentage), 50);
  const barPosition = isPositive ? 'left-[50%]' : 'right-[50%]';

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-dark-400">{label}</span>
          {showValue && (
            <span className={cn('font-medium', isPositive ? 'text-primary-400' : 'text-accent-400')}>
              {value > 0 ? '+' : ''}{value.toFixed(2)}s
            </span>
          )}
        </div>
      )}
      <div className="relative h-2 bg-dark-700 rounded-full overflow-hidden">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-dark-500 z-10" />
        <div
          className={cn(
            'absolute top-0 bottom-0 rounded-full transition-all duration-500',
            colorClasses[isPositive ? color : 'accent'],
            barPosition
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

interface SimpleProgressProps {
  percentage: number;
  label?: string;
  color?: 'primary' | 'accent' | 'default';
  height?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export function SimpleProgress({
  percentage,
  label,
  color = 'primary',
  height = 'md',
  showPercentage = false,
}: SimpleProgressProps) {
  const colorClasses = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-400',
    accent: 'bg-gradient-to-r from-accent-600 to-accent-400',
    default: 'bg-gradient-to-r from-dark-500 to-dark-400',
  };

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-dark-400">{label}</span>
          {showPercentage && (
            <span className="text-dark-300 font-medium">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className={cn('bg-dark-700 rounded-full overflow-hidden', heightClasses[height])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}
