import { cn } from '@/lib/utils';

interface StatBadgeProps {
  value: number;
  type: 'waste' | 'cost' | 'occupancy';
  size?: 'sm' | 'md' | 'lg';
  showSuffix?: boolean;
  estimated?: boolean;
}

export function getWasteColor(rate: number) {
  if (rate < 15) return { bg: 'bg-success-500/15', text: 'text-success-400', bar: 'bg-success-500' };
  if (rate < 30) return { bg: 'bg-warning-500/15', text: 'text-warning-400', bar: 'bg-warning-500' };
  return { bg: 'bg-danger-500/15', text: 'text-danger-400', bar: 'bg-danger-500' };
}

export default function StatBadge({ value, type, size = 'md', showSuffix = true, estimated }: StatBadgeProps) {
  const colors = type === 'waste' ? getWasteColor(value) : type === 'cost'
    ? { bg: 'bg-brand-500/15', text: 'text-brand-400', bar: 'bg-brand-500' }
    : { bg: 'bg-blue-500/15', text: 'text-blue-400', bar: 'bg-blue-500' };

  const suffix = type === 'waste' ? '%' : type === 'cost' ? '元' : '%';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-base' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-mono font-semibold',
        colors.bg,
        colors.text,
        sizeClasses
      )}
    >
      {value.toFixed(1)}
      {showSuffix && suffix}
      {estimated && <span className="text-[10px] opacity-70">*估</span>}
    </span>
  );
}
