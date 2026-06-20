import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import type { Warning } from '@/types';

interface WarningListProps {
  warnings: Warning[];
}

export default function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) return null;

  const getIcon = (type: Warning['type']) => {
    switch (type) {
      case 'input_invalid':
        return <XCircle size={20} className="text-red-500 flex-shrink-0" />;
      case 'stock_insufficient':
      case 'tank_insufficient':
        return <AlertCircle size={20} className="text-orange-500 flex-shrink-0" />;
      default:
        return <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />;
    }
  };

  const getBgColor = (type: Warning['type']) => {
    switch (type) {
      case 'input_invalid':
        return 'bg-red-50 border-red-200';
      case 'stock_insufficient':
      case 'tank_insufficient':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-amber-50 border-amber-200';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {warnings.map((warning, index) => (
        <div
          key={index}
          className={`flex items-start gap-3 p-3 rounded-lg border ${getBgColor(warning.type)}`}
        >
          {getIcon(warning.type)}
          <p className="text-sm text-gray-700">{warning.message}</p>
        </div>
      ))}
    </div>
  );
}
