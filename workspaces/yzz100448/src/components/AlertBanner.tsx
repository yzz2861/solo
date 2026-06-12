import { X, AlertTriangle, Car, Clock, Bell } from 'lucide-react';
import type { Alert } from '../types';
import { useStore } from '../store/useStore';

interface AlertBannerProps {
  alert: Alert;
}

const alertStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  plate_error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-500',
  },
  parking_conflict: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: 'text-orange-500',
  },
  all_day_occupied: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: 'text-amber-500',
  },
  plate_changed: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-500',
  },
};

const alertIcons: Record<string, React.ReactNode> = {
  plate_error: <AlertTriangle size={20} />,
  parking_conflict: <Car size={20} />,
  all_day_occupied: <Clock size={20} />,
  plate_changed: <Bell size={20} />,
};

export function AlertBanner({ alert }: AlertBannerProps) {
  const dismissAlert = useStore((state) => state.dismissAlert);
  const style = alertStyles[alert.type] || alertStyles.parking_conflict;
  const icon = alertIcons[alert.type] || <Bell size={20} />;

  if (alert.dismissed) return null;

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg p-4 flex items-start gap-3 animate-slide-down`}
    >
      <div className={`${style.icon} flex-shrink-0 mt-0.5`}>
        {icon}
      </div>
      <div className={`flex-1 ${style.text} text-sm`}>
        {alert.message}
      </div>
      <button
        onClick={() => dismissAlert(alert.id)}
        className={`${style.text} hover:opacity-70 transition-opacity flex-shrink-0`}
      >
        <X size={18} />
      </button>
    </div>
  );
}

interface AlertListProps {
  alerts: Alert[];
}

export function AlertList({ alerts }: AlertListProps) {
  const activeAlerts = alerts.filter((a) => !a.dismissed);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {activeAlerts.map((alert) => (
        <AlertBanner key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
