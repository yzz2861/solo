import { Warning } from '@/types/calculation';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface WarningListProps {
  warnings: Warning[];
}

export function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) return null;

  const getIcon = (type: Warning['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={18} className="text-red-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-500 shrink-0" />;
      case 'info':
        return <Info size={18} className="text-blue-500 shrink-0" />;
    }
  };

  const getBgClass = (type: Warning['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-2">
      {warnings.map((warning, index) => (
        <div
          key={`${warning.code}-${index}`}
          className={`flex items-start gap-3 p-3 rounded-lg border ${getBgClass(warning.type)}`}
        >
          {getIcon(warning.type)}
          <p className="text-sm text-slate-700 leading-relaxed">{warning.message}</p>
        </div>
      ))}
    </div>
  );
}
