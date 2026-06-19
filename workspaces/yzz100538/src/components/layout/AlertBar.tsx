import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Package, Sparkles, UserX } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import type { ConflictType } from '@/types';

const alertIcons: Record<ConflictType, React.ReactNode> = {
  'time-conflict': <Clock className="w-4 h-4" />,
  'cleaning-incomplete': <Sparkles className="w-4 h-4" />,
  'package-not-ready': <Package className="w-4 h-4" />,
  'late-arrival': <UserX className="w-4 h-4" />,
};

const alertLabels: Record<ConflictType, string> = {
  'time-conflict': '时间冲突',
  'cleaning-incomplete': '清台未完成',
  'package-not-ready': '套餐未备齐',
  'late-arrival': '客人迟到',
};

export default function AlertBar() {
  const { alerts } = useBookingStore();
  const [isExpanded, setIsExpanded] = useState(true);

  if (alerts.length === 0) return null;

  const errorCount = alerts.filter((a) => a.severity === 'error').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  const handleAlertClick = (bookingId: string) => {
    const element = document.getElementById(`booking-${bookingId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
      }, 2000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 flex items-center justify-between hover:bg-red-700/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="font-medium">
              共 {alerts.length} 条预警
              {errorCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {errorCount} 条紧急
                </span>
              )}
              {warningCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-400/30 rounded-full text-xs text-yellow-100">
                  {warningCount} 条提醒
                </span>
              )}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        {isExpanded && (
          <div className="pb-3 space-y-2">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleAlertClick(alert.bookingId)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 hover:translate-x-1 ${
                  alert.severity === 'error'
                    ? 'bg-red-700/40 hover:bg-red-700/60'
                    : 'bg-yellow-500/30 hover:bg-yellow-500/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                      alert.severity === 'error' ? 'bg-red-800/50' : 'bg-yellow-600/50'
                    }`}
                  >
                    {alertIcons[alert.type]}
                    {alertLabels[alert.type]}
                  </span>
                  <span className="text-sm">{alert.message}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
