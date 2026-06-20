import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import type { ValidationWarning } from '@/types';

interface WarningListProps {
  warnings: ValidationWarning[];
}

export default function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) return null;

  const errors = warnings.filter((w) => w.type === 'error');
  const warns = warnings.filter((w) => w.type === 'warning');
  const infos = warnings.filter((w) => w.type === 'info');

  const renderItem = (w: ValidationWarning) => {
    const styles = {
      error: 'bg-red-50 border-red-200 text-red-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
      info: 'bg-blue-50 border-blue-200 text-blue-700',
    };

    const icons = {
      error: <X className="w-5 h-5 flex-shrink-0" />,
      warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
      info: <Info className="w-5 h-5 flex-shrink-0" />,
    };

    return (
      <div
        key={`${w.field}-${w.type}-${w.message}`}
        className={`flex items-start gap-3 p-3 rounded-xl border ${styles[w.type]} animate-fadeIn`}
      >
        {icons[w.type]}
        <span className="text-sm leading-relaxed">{w.message}</span>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {errors.map(renderItem)}
      {warns.map(renderItem)}
      {infos.map(renderItem)}
    </div>
  );
}
