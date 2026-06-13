import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  Database,
  FileBarChart,
  AlertTriangle,
  Fish,
} from 'lucide-react';
import GlobalAlertBar from './GlobalAlertBar';

const navItems = [
  { to: '/', label: '排班看板', icon: CalendarDays },
  { to: '/data', label: '数据录入', icon: Database },
  { to: '/reports', label: '报表输出', icon: FileBarChart },
  { to: '/alerts', label: '预警中心', icon: AlertTriangle },
];

export default function AppLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex">
      <aside className="no-print w-64 shrink-0 bg-ocean-900 text-white flex flex-col min-h-screen">
        <div className="px-5 py-5 border-b border-ocean-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aqua-400 to-ocean-500 flex items-center justify-center text-xl shadow-lg shadow-ocean-950/50">
            <Fish className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-lg leading-tight">海洋馆</h1>
            <p className="text-xs text-ocean-300">喂食讲解排班系统</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-ocean-800 text-xs text-ocean-400">
          数据自动保存至本地 · 刷新不丢失
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <GlobalAlertBar />
        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
