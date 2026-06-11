import { cn } from '@/lib/utils';
import type { ConfidenceLevel, RecordStatus } from '@shared/types';
import { CONFIDENCE_LABELS, STATUS_LABELS } from '@shared/types';

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const styles: Record<ConfidenceLevel, string> = {
    high: 'bg-life-50 text-life-700 border-life-200',
    medium: 'bg-medical-50 text-medical-700 border-medical-200',
    low: 'bg-warn-50 text-warn-600 border-warn-200',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium',
      styles[level],
    )}>
      {CONFIDENCE_LABELS[level]}
    </span>
  );
}

export function StatusBadge({ status }: { status: RecordStatus }) {
  const styles: Record<RecordStatus, string> = {
    uploaded: 'bg-slate-100 text-slate-700 border-slate-200',
    extracted: 'bg-medical-50 text-medical-700 border-medical-200',
    confirmed: 'bg-life-50 text-life-700 border-life-200',
    archived: 'bg-slate-200 text-slate-600 border-slate-300',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium',
      styles[status],
    )}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function WarningTag({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warn-50 text-warn-700 text-xs border border-warn-200">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      {text}
    </span>
  );
}
