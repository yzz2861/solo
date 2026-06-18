import type { AnomalyLevel } from '@shared/types';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: AnomalyLevel;
}

const levelConfig: Record<AnomalyLevel, { label: string; className: string }> = {
  normal: {
    label: '正常',
    className: 'bg-aqua-500 text-white',
  },
  warning: {
    label: '警告',
    className: 'bg-warn-500 text-white',
  },
  severe: {
    label: '严重',
    className: 'bg-danger-500 text-white',
  },
};

export default function LevelBadge({ level }: LevelBadgeProps) {
  const config = levelConfig[level];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
