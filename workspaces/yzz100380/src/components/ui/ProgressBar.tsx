import { cn } from '@/lib/utils';
import { getMasteryColor } from '@/utils/helpers';

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  showLabel = true,
  size = 'md',
  color,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color || getMasteryColor(value);

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-wood-200 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-wood-500">
          <span>进度</span>
          <span className="font-medium text-wood-700">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
}
