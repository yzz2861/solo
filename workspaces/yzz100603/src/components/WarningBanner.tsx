import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import type { Warning } from '@/types';

interface WarningBannerProps {
  warnings: Warning[];
  onDismiss?: (code: string) => void;
}

export function WarningBanner({ warnings, onDismiss }: WarningBannerProps) {
  if (warnings.length === 0) return null;

  const getIcon = (type: Warning['type']) => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 flex-shrink-0" />;
    }
  };

  const getStyles = (type: Warning['type']) => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 border-red-300 text-red-800 animate-pulse-slow';
      case 'warning':
        return 'bg-amber-50 border-amber-300 text-amber-800';
      case 'info':
        return 'bg-blue-50 border-blue-300 text-blue-800';
    }
  };

  return (
    <div className="space-y-2 mb-6">
      {warnings.map((warning, index) => (
        <div
          key={`${warning.code}-${index}`}
          className={`flex items-start gap-3 p-4 rounded-lg border-2 ${getStyles(warning.type)} transition-all duration-300`}
          role="alert"
        >
          {getIcon(warning.type)}
          <div className="flex-1">
            <p className="font-medium text-sm">{warning.message}</p>
          </div>
          {onDismiss && (
            <button
              onClick={() => onDismiss(warning.code)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
