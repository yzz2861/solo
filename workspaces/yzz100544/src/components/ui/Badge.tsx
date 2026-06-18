import React from 'react';
import { cn } from '@/lib/utils';
import { SEVERITY_LABEL, PRIORITY_LABEL, STATUS_LABEL, SOURCE_LABEL } from '@/types';
import type { SeverityLevel, PriorityLevel, ImprovementStatus, FeedbackSource } from '@/types';
import { User, UserCheck, XCircle } from 'lucide-react';

export function SeverityBadge({ level }: { level: SeverityLevel }) {
  const info = SEVERITY_LABEL[level];
  return (
    <span className={cn('badge', info.badgeClass)}>
      {info.label}
    </span>
  );
}

export function PriorityBadge({ priority, showDot = true }: { priority: PriorityLevel; showDot?: boolean }) {
  const info = PRIORITY_LABEL[priority];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-brand-100" style={{ color: info.color }}>
      {showDot && <span className={cn('w-2 h-2 rounded-full', info.dotClass)} />}
      {info.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: ImprovementStatus }) {
  const info = STATUS_LABEL[status];
  return (
    <span className={cn('badge', info.bgClass, info.color, 'border-transparent')}>
      {info.label}
    </span>
  );
}

export function SourceBadge({ source }: { source: FeedbackSource }) {
  const info = SOURCE_LABEL[source];
  const Icon = source === 'student' ? User : source === 'ta' ? UserCheck : XCircle;
  return (
    <span className={cn('badge bg-white border-brand-100', info.color)}>
      <Icon className="w-3 h-3" />
      {info.label}
    </span>
  );
}

export function ThemeTag({ name, color, onClick, onRemove }: {
  name: string;
  color: string;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  return (
    <span
      onClick={onClick}
      className={cn('tag border gap-1', onClick && 'cursor-pointer hover:brightness-95 transition')}
      style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:opacity-70 transition"
        >
          ×
        </button>
      )}
    </span>
  );
}
