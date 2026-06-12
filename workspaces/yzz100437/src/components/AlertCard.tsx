import { AlertTriangle, Repeat, Users, Wifi, X, Check } from 'lucide-react';
import { Alert } from '../types';
import { getAlertColorClass, getAlertTypeName } from '../utils/alerts';
import { useStore } from '../store/useStore';
import { formatDate } from '../utils/date';

interface AlertCardProps {
  alert: Alert;
}

const iconMap = {
  duplicate: Repeat,
  consecutive: AlertTriangle,
  shortage: Users,
  online: Wifi,
};

export const AlertCard = ({ alert }: AlertCardProps) => {
  const markAlertRead = useStore((state) => state.markAlertRead);
  const Icon = iconMap[alert.type];

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAlertRead(alert.id);
  };

  return (
    <div
      className={`p-4 rounded-xl border-l-4 transition-all duration-300 ${
        getAlertColorClass(alert.type)
      } ${alert.read ? 'opacity-60' : 'animate-slide-in'} hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-white/50">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {getAlertTypeName(alert.type)}
            </span>
            {!alert.read && (
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            )}
          </div>
          <p className="text-sm font-medium">{alert.message}</p>
          <p className="text-xs opacity-70 mt-1">
            {formatDate(alert.createdAt)}
          </p>
        </div>
        {!alert.read && (
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
            title="标记为已读"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
