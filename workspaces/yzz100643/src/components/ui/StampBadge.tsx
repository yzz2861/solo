import { getStatusLabel } from '@/utils/common';

interface StampBadgeProps {
  status: 'pending' | 'reviewing' | 'corrected' | 'approved';
  size?: 'sm' | 'md';
  animate?: boolean;
}

const StampBadge = ({ status, size = 'md', animate = false }: StampBadgeProps) => {
  const label = getStatusLabel(status);
  
  const colors: Record<string, { border: string; text: string; bg: string }> = {
    pending: { border: 'border-archive-400', text: 'text-archive-600', bg: 'bg-archive-50' },
    reviewing: { border: 'border-warning', text: 'text-warning', bg: 'bg-warning/5' },
    corrected: { border: 'border-archive-500', text: 'text-archive-700', bg: 'bg-archive-50' },
    approved: { border: 'border-success', text: 'text-success', bg: 'bg-success/5' }
  };
  
  const color = colors[status];
  const sizeClass = size === 'sm' ? 'w-14 h-14 text-[10px]' : 'w-18 h-18 text-xs';
  
  return (
    <div
      className={`
        ${sizeClass}
        ${color.border} ${color.text} ${color.bg}
        ${animate ? 'animate-stamp' : ''}
        rounded-full
        flex items-center justify-center
        font-serif font-bold
        border-2
        transform -rotate-6
        relative
        overflow-hidden
        shrink-0
      `}
      style={{ width: size === 'sm' ? '56px' : '72px', height: size === 'sm' ? '56px' : '72px' }}
    >
      <span className="text-center leading-tight px-1">{label}</span>
      <div className="absolute inset-0 rounded-full border border-inherit opacity-30" />
    </div>
  );
};

export default StampBadge;
