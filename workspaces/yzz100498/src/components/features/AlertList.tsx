import React from 'react';
import { X, Trash2, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert as AlertType, RiskLevel } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';
import { cn } from '../../lib/utils';

const alertTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  waste: { icon: <Trash2 className="w-4 h-4" />, color: 'text-orange-600' },
  shortage: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600' },
  anomaly: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-purple-600' },
  verification: { icon: <Info className="w-4 h-4" />, color: 'text-blue-600' },
};

const riskLevelBadge: Record<RiskLevel, { variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  low: { variant: 'success' },
  medium: { variant: 'warning' },
  high: { variant: 'danger' },
  critical: { variant: 'danger' },
};

const AlertItem: React.FC<{ alert: AlertType; onRead: (id: string) => void }> = ({ alert, onRead }) => {
  const config = alertTypeConfig[alert.type];
  const badgeConfig = riskLevelBadge[alert.level];
  
  return (
    <div className={cn(
      'p-4 rounded-lg border transition-all',
      alert.isRead ? 'bg-gray-50 border-gray-100' : 'bg-white border-blue-200 shadow-sm'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', config.color)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              'font-medium text-sm',
              alert.isRead ? 'text-gray-600' : 'text-gray-800'
            )}>
              {alert.title}
            </h4>
            <Badge variant={badgeConfig.variant} dot>
              {alert.level === 'low' ? '低' : alert.level === 'medium' ? '中' : alert.level === 'high' ? '高' : '严重'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mb-2">{alert.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{formatRelativeTime(alert.createdAt)}</span>
            {!alert.isRead && (
              <button
                onClick={() => onRead(alert.id)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" />
                标记已读
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AlertList: React.FC<{ maxItems?: number }> = ({ maxItems = 10 }) => {
  const { alerts, markAlertRead, markAllAsRead, unreadCount } = useAlerts();
  const displayAlerts = alerts.slice(0, maxItems);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          预警信息
          {unreadCount > 0 && (
            <Badge variant="danger">{unreadCount} 条未读</Badge>
          )}
        </CardTitle>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            全部已读
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>暂无预警信息</p>
          </div>
        ) : (
          displayAlerts.map(alert => (
            <AlertItem key={alert.id} alert={alert} onRead={markAlertRead} />
          ))
        )}
      </CardContent>
    </Card>
  );
};
