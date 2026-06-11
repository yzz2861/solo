import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Wallet,
  Edit3,
  Bell,
  ChevronRight,
  Clock,
  User,
  AlertTriangle,
  AlertCircle,
  Info,
  ImageOff,
  ClockAlert,
  Eye,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  EmptyState,
  Loading,
} from '@/components/ui';
import { useAppStore } from '@/store';
import {
  formatDateTime,
  formatTime,
  STATUS_COLORS,
  STATUS_LABELS,
  ALERT_LABELS,
  ALERT_ICONS,
  cn,
} from '@/utils/helpers';
import type { Alert, AlertType } from '@shared/types';

const alertLevelIcons = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const alertLevelColors = {
  error: 'bg-vermilion-700/20 border-vermilion-600 text-vermilion-400',
  warning: 'bg-gold-700/20 border-gold-600 text-gold-400',
  info: 'bg-ink-600/50 border-ink-500 text-ivory-300',
};

const typeAlertIcons: Record<AlertType, typeof ImageOff> = {
  image_invalid: ImageOff,
  time_conflict: ClockAlert,
  deposit_pending: Wallet,
  sensitive_area: Eye,
  revision_high: Edit3,
  allergy_warning: AlertTriangle,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    bookings,
    alerts,
    designs,
    deposits,
    loading,
    loadAllData,
    loadBookings,
    loadDesigns,
    loadDeposits,
  } = useAppStore();

  useEffect(() => {
    loadAllData();
    loadBookings();
    loadDesigns();
    loadDeposits();
  }, [loadAllData, loadBookings, loadDesigns, loadDeposits]);

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todayBookings = bookings.filter(
      (b) => b.start_time.split('T')[0] === today
    );

    const pendingDeposits = deposits.filter((d) => !d.paid_at);
    const pendingDepositTotal = pendingDeposits.reduce(
      (sum, d) => sum + d.amount,
      0
    );

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const monthStartStr = startOfMonth.toISOString().split('T')[0];
    const monthRevisions = bookings.reduce((sum, b) => {
      if (b.start_time >= monthStartStr) {
        return sum + (b.revision_count || 0);
      }
      return sum;
    }, 0);

    return {
      todayBookings: todayBookings.length,
      pendingDeposits: pendingDepositTotal,
      monthRevisions,
      alertsCount: alerts.length,
    };
  }, [bookings, deposits, alerts, today]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 5);
  }, [bookings]);

  const recentDesigns = useMemo(() => {
    return [...designs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [designs]);

  const groupedAlerts = useMemo(() => {
    const groups: Record<string, Alert[]> = {};
    alerts.forEach((alert) => {
      if (!groups[alert.type]) {
        groups[alert.type] = [];
      }
      groups[alert.type].push(alert);
    });
    return groups;
  }, [alerts]);

  const handleAlertClick = (alert: Alert) => {
    if (alert.relatedType === 'booking' && alert.relatedId) {
      navigate('/bookings');
    } else if (alert.relatedType === 'client' && alert.relatedId) {
      navigate('/clients');
    } else if (alert.relatedType === 'design' && alert.relatedId) {
      navigate('/gallery');
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    suffix,
  }: {
    title: string;
    value: number | string;
    icon: typeof CalendarDays;
    suffix?: string;
  }) => (
    <Card decorativeBorder className="hover:border-ink-500 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-ivory-100 font-display">
              {value}
              {suffix && (
                <span className="text-lg text-ink-400 ml-1">{suffix}</span>
              )}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-ink-900 border border-ink-700">
            <Icon className="w-6 h-6 text-vermilion-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading.bookings || loading.alerts || loading.designs) {
    return (
      <div className="animate-slide-up">
        <h2 className="font-display text-2xl font-bold text-ivory-100 mb-6">仪表盘</h2>
        <div className="flex items-center justify-center h-64">
          <Loading text="加载中..." size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-ivory-100">仪表盘</h2>
        <span className="text-sm text-ink-400">
          {formatDateTime(new Date(), 'YYYY年MM月DD日')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="今日预约数"
          value={stats.todayBookings}
          icon={CalendarDays}
          suffix="个"
        />
        <StatCard
          title="待收定金"
          value={stats.pendingDeposits.toLocaleString()}
          icon={Wallet}
          suffix="元"
        />
        <StatCard
          title="本月改稿次数"
          value={stats.monthRevisions}
          icon={Edit3}
          suffix="次"
        />
        <StatCard
          title="提醒数量"
          value={stats.alertsCount}
          icon={Bell}
          suffix="条"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-vermilion-500" />
              提醒列表
            </CardTitle>
            <Badge variant="warning">{alerts.length} 条</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <EmptyState
              title="暂无提醒"
              description="目前没有需要注意的事项"
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAlerts).map(([type, typeAlerts]) => {
                const alertType = type as AlertType;
                const TypeIcon = typeAlertIcons[alertType] || AlertTriangle;
                const level = typeAlerts[0].level;
                const LevelIcon = alertLevelIcons[level];
                const levelColor = alertLevelColors[level];

                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <div
                        className={cn(
                          'p-1.5 rounded border',
                          levelColor
                        )}
                      >
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-ivory-200">
                        {ALERT_LABELS[alertType]}
                      </span>
                      <Badge variant="outline" size="sm">
                        {typeAlerts.length} 条
                      </Badge>
                    </div>
                    <div className="space-y-2 ml-10">
                      {typeAlerts.map((alert) => {
                        const AlertLevelIcon = alertLevelIcons[alert.level];
                        return (
                          <div
                            key={alert.id}
                            onClick={() => handleAlertClick(alert)}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border cursor-pointer',
                              'transition-all duration-200 hover:bg-ink-700/50',
                              alertLevelColors[alert.level]
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <AlertLevelIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">{alert.message}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-60" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-vermilion-500" />
                最近预约
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/bookings')}
              >
                查看全部 <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <EmptyState
                title="暂无预约"
                description="还没有任何预约记录"
              />
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-ink-900/50 border border-ink-700 hover:bg-ink-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-ink-800 border border-ink-700">
                        <CalendarDays className="w-4 h-4 text-vermilion-500" />
                        <span className="text-xs text-ink-400">
                          {formatTime(booking.start_time)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ivory-100">
                          {booking.client_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-ink-400">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(booking.start_time, 'MM-DD HH:mm')}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-ink-400 mt-0.5">
                          <User className="w-3 h-3" />
                          {booking.artist_name}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded border',
                        STATUS_COLORS[booking.status]
                      )}
                    >
                      {STATUS_LABELS[booking.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-vermilion-500" />
                最近改稿
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/gallery')}
              >
                查看全部 <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentDesigns.length === 0 ? (
              <EmptyState
                title="暂无图案"
                description="还没有任何设计图案"
              />
            ) : (
              <div className="space-y-3">
                {recentDesigns.map((design) => (
                  <div
                    key={design.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-ink-900/50 border border-ink-700 hover:bg-ink-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-ink-800 border border-ink-700">
                        <Edit3 className="w-5 h-5 text-gold-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ivory-100">
                          {design.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-ink-400 mt-0.5">
                          <User className="w-3 h-3" />
                          {design.client_name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="warning" size="sm">
                        v{design.current_version}
                      </Badge>
                      <p className="text-xs text-ink-400 mt-1">
                        {formatDateTime(design.created_at, 'MM-DD')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
