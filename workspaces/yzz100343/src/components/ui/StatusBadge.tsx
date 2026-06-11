import React from 'react';
import type { HazardStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

interface Props {
  status: HazardStatus;
  isOverdue?: boolean;
  size?: 'sm' | 'md';
}

const iconMap = {
  PENDING_RECTIFICATION: Clock,
  PENDING_REVIEW: AlertTriangle,
  CLOSED: CheckCircle2,
  REJECTED: XCircle,
};

const stylesByStatus: Record<HazardStatus, string> = {
  PENDING_RECTIFICATION:
    'bg-blue-50 text-pending-blue border-blue-200',
  PENDING_REVIEW:
    'bg-amber-50 text-warning-yellow border-amber-200',
  CLOSED: 'bg-green-50 text-success-green border-green-200',
  REJECTED: 'bg-red-50 text-danger-red border-red-200',
};

export const StatusBadge: React.FC<Props> = ({
  status,
  isOverdue,
  size = 'md',
}) => {
  const Icon = iconMap[status];
  const base = isOverdue && status !== 'CLOSED'
    ? 'bg-red-500 text-white border-danger-red'
    : stylesByStatus[status];

  const sizeCls =
    size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${base} ${sizeCls}`}
    >
      <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2.2} />
      {isOverdue && status !== 'CLOSED' ? '逾期' : STATUS_LABELS[status]}
    </span>
  );
};
