import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

dayjs.locale('zh-cn');

const pageTitles: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/clients': '客户管理',
  '/bookings': '预约管理',
  '/gallery': '图案柜',
  '/today': '当日前台',
  '/export': '导出中心',
  '/settings': '系统设置',
};

export default function Header() {
  const location = useLocation();
  const { alerts, loadAlerts } = useAppStore();
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000 * 60);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  const title = pageTitles[location.pathname] || '纹身工作室';
  const unreadCount = alerts.length;

  return (
    <header className="h-16 bg-ink-800/95 backdrop-blur border-b border-ink-700 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-xl font-semibold text-ivory-100">
          {title}
        </h1>
        <div className="h-6 w-px bg-ink-600" />
        <div className="flex items-center gap-2 text-ink-400">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-body">
            {currentTime.format('YYYY年MM月DD日 dddd')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          className={cn(
            'relative p-2 rounded-lg transition-all duration-200',
            unreadCount > 0
              ? 'bg-vermilion-700/20 text-vermilion-500 hover:bg-vermilion-700/30'
              : 'text-ink-400 hover:bg-ink-700 hover:text-ivory-100'
          )}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-vermilion-600 text-ivory-100 text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-8 w-px bg-ink-700" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vermilion-600 to-gold-600 flex items-center justify-center">
            <span className="text-ivory-100 font-display font-bold text-sm">
              纹
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-ivory-100">管理员</p>
            <p className="text-xs text-ink-400">超级用户</p>
          </div>
        </div>
      </div>
    </header>
  );
}
