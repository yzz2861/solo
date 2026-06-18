import type { RepairStatus } from '@shared/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RepairStatus;
}

const statusConfig: Record<RepairStatus, { label: string; className: string }> = {
  pending: {
    label: '待处理',
    className: 'bg-gray-500 text-white',
  },
  repairing: {
    label: '维修中',
    className: 'bg-blue-500 text-white',
  },
  completed: {
    label: '已完成',
    className: 'bg-green-500 text-white',
  },
  recheck: {
    label: '待复核',
    className: 'bg-orange-500 text-white',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
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
