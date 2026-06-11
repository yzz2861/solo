'use client';

import { cn, STATUS_LABEL, STATUS_COLOR } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ChangeStatusBadgeProps {
  status: string;
  className?: string;
  children?: ReactNode;
}

export function ChangeStatusBadge({ status, className, children }: ChangeStatusBadgeProps) {
  const label = STATUS_LABEL[status] || status;
  const colorClass = STATUS_COLOR[status] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {children || label}
    </span>
  );
}
