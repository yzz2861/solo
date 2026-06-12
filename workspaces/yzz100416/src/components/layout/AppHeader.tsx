import { Link, useLocation } from 'react-router-dom';
import {
  Flower2,
  Bell,
  Calendar,
  Printer,
  Download,
  Warehouse,
  Users,
  UserCheck,
  UserCircle2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const roles: { key: 'clerk' | 'florist' | 'manager'; label: string; icon: typeof Users }[] = [
  { key: 'clerk', label: '店员', icon: Users },
  { key: 'florist', label: '扎花师', icon: UserCheck },
  { key: 'manager', label: '店长', icon: UserCircle2 },
];

export const AppHeader = () => {
  const {
    selectedDate,
    setSelectedDate,
    currentRole,
    setRole,
    alerts,
    setAlertCenterOpen,
    setInventoryModalOpen,
  } = useAppStore();
  const location = useLocation();
  const unresolved = alerts.filter(a => !a.resolved).length;
  const isPrint = location.pathname === '/print';

  if (isPrint) return null;

  return (
    <header className="no-print sticky top-0 z-40 backdrop-blur-xl bg-cream-100/80 border-b border-cream-200">
      <div className="max-w-[1800px] mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-300 to-gold-500 flex items-center justify-center shadow-card">
            <Flower2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-serif font-semibold text-coffee-700 text-lg leading-tight">
              花嫁 · 婚车扎花单
            </div>
            <div className="text-[11px] text-coffee-500">Wedding Car Florist Workbench</div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-cream-200 shadow-soft">
          <Calendar className="w-4 h-4 text-gold-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm text-coffee-700 font-medium outline-none cursor-pointer"
          />
        </div>

        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-cream-200/70 border border-cream-200">
          {roles.map(r => {
            const Icon = r.icon;
            const active = currentRole === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-white text-coffee-700 shadow-soft'
                    : 'text-coffee-500 hover:text-coffee-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {r.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link to="/print" target="_blank" className="btn btn-secondary" title="打印早班准备单">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">打印</span>
          </Link>
          <Link to="/export" target="_blank" className="btn btn-secondary" title="导出当日成本与异常">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">导出</span>
          </Link>
          <button
            className="btn btn-secondary"
            onClick={() => setInventoryModalOpen(true)}
            title="花材库存管理"
          >
            <Warehouse className="w-4 h-4" />
            <span className="hidden sm:inline">库存</span>
          </button>
          <button
            className="btn btn-secondary relative"
            onClick={() => setAlertCenterOpen(true)}
            title="预警中心"
          >
            <Bell className="w-4 h-4" />
            {unresolved > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse-warning">
                {unresolved > 99 ? '99+' : unresolved}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
