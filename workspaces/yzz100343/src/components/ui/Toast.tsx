import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Props {
  type?: ToastType;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const styles: Record<ToastType, { bg: string; icon: typeof Info; iconColor: string }> = {
  success: {
    bg: 'bg-green-50 border-green-300 text-green-800',
    icon: CheckCircle2,
    iconColor: 'text-success-green',
  },
  error: {
    bg: 'bg-red-50 border-red-300 text-red-800',
    icon: XCircle,
    iconColor: 'text-danger-red',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-300 text-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-warning-yellow',
  },
  info: {
    bg: 'bg-blue-50 border-blue-300 text-blue-800',
    icon: Info,
    iconColor: 'text-pending-blue',
  },
};

export const Toast: React.FC<Props> = ({
  type = 'info',
  message,
  onClose,
  autoClose = true,
  duration = 3000,
}) => {
  const s = styles[type];
  const Icon = s.icon;

  React.useEffect(() => {
    if (autoClose && onClose) {
      const t = setTimeout(onClose, duration);
      return () => clearTimeout(t);
    }
  }, [autoClose, duration, onClose]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-md border shadow-lg ${s.bg} animate-slide-in min-w-[300px]`}
    >
      <Icon size={20} className={`flex-shrink-0 mt-0.5 ${s.iconColor}`} />
      <p className="text-sm font-medium flex-1">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-white/50 opacity-70 hover:opacity-100"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
