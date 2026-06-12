import { AccidentStatus } from '../../shared/types.js';
import { getStatusColor, getStatusLabel } from '../utils/format.js';
import { AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: AccidentStatus;
  isOverdue?: boolean;
}

export default function StatusBadge({ status, isOverdue }: StatusBadgeProps) {
  const colorClass = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-500" />}
      {label}
      {isOverdue && <span className="text-rose-500 font-bold">!</span>}
    </span>
  );
}
