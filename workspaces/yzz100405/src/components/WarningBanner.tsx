import type { Warning } from '@/types';
import { AlertTriangle, XCircle } from 'lucide-react';

interface Props {
  warnings: Warning[];
  onDismiss: (index: number) => void;
}

export default function WarningBanner({ warnings, onDismiss }: Props) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {warnings.map((w, i) => (
        <div
          key={`${w.type}-${i}`}
          className={`flex items-start gap-2 px-4 py-3 rounded-lg border ${
            w.severity === 'error'
              ? 'bg-danger-50 border-danger-400 text-danger-600'
              : 'bg-amber-400/10 border-amber-500 text-amber-600'
          }`}
        >
          {w.severity === 'error' ? (
            <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          )}
          <span className="text-sm flex-1">{w.message}</span>
          <button
            onClick={() => onDismiss(i)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
