import { AlertTriangle, AlertOctagon, X, CheckCircle } from 'lucide-react';
import type { CalculationWarnings } from '@/types/water-tower';

interface Props {
  warnings: CalculationWarnings;
  onDismiss: (msg: string) => void;
  dismissed: string[];
}

const AlertBanner = ({ warnings, onDismiss, dismissed }: Props) => {
  const hasDanger = warnings.levelExceeded || warnings.zeroFlow || warnings.flowRateZero;
  const hasWarning = warnings.excessiveUsage;

  if (!hasDanger && !hasWarning) return null;

  const visibleMessages = warnings.messages.filter((m) => !dismissed.includes(m));
  if (visibleMessages.length === 0) return null;

  const icon = hasDanger ? (
    <AlertOctagon className="w-5 h-5 shrink-0" strokeWidth={2.4} />
  ) : (
    <AlertTriangle className="w-5 h-5 shrink-0" strokeWidth={2.4} />
  );

  const styleClass = hasDanger
    ? 'bg-danger-gradient text-white shadow-lg animate-pulse-danger'
    : 'bg-warning-gradient text-white shadow-lg';

  const label = hasDanger ? '严重警告' : '注意提醒';

  return (
    <div className="container mt-6 animate-fade-up">
      <div className={`${styleClass} rounded-2xl overflow-hidden`}>
        <div className="px-5 py-4 flex items-start gap-4">
          <div className="shrink-0 mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-base">{label}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-medium">
                {visibleMessages.length} 项
              </span>
            </div>
            <ul className="space-y-1.5">
              {visibleMessages.map((msg) => (
                <li
                  key={msg}
                  className="flex items-start gap-3 text-sm bg-white/10 rounded-lg px-3 py-2"
                >
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                  <span className="flex-1">{msg}</span>
                  <button
                    onClick={() => onDismiss(msg)}
                    className="shrink-0 p-1 rounded hover:bg-white/20 transition"
                    aria-label="关闭"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
