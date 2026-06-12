import { useCalculatorStore } from '@/store';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

export default function WarningBubble() {
  const { warnings } = useCalculatorStore();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visibleWarnings = warnings.filter((w) => !dismissed.includes(w.id));

  if (visibleWarnings.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-500" />;
      default:
        return <Info size={18} className="text-ice-500" />;
    }
  };

  const getBgClass = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      default:
        return 'bg-ice-50 border-ice-200 text-ice-700';
    }
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
  };

  return (
    <div className="space-y-2">
      {visibleWarnings.map((warning) => (
        <div
          key={warning.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border animate-slide-down ${getBgClass(
            warning.type
          )}`}
        >
          {getIcon(warning.type)}
          <p className="flex-1 text-sm leading-relaxed">{warning.message}</p>
          <button
            onClick={() => handleDismiss(warning.id)}
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
