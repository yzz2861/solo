import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Palette,
  Sun,
  FileOutput,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scissors,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/clients', label: '客户管理', icon: Users },
  { path: '/bookings', label: '预约管理', icon: CalendarDays },
  { path: '/gallery', label: '图案柜', icon: Palette },
  { path: '/today', label: '当日前台', icon: Sun },
  { path: '/export', label: '导出中心', icon: FileOutput },
  { path: '/settings', label: '系统设置', icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'relative h-screen bg-ink-900 border-r border-ink-700 flex flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-ink-700">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-vermilion-700 flex items-center justify-center flex-shrink-0">
            <Scissors className="w-5 h-5 text-ivory-100" />
          </div>
          {!collapsed && (
            <span className="font-display text-lg font-bold text-ivory-100 whitespace-nowrap transition-opacity duration-200">
              纹身工作室
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                      isActive
                        ? 'bg-vermilion-700/20 text-vermilion-500 border-l-2 border-vermilion-600'
                        : 'text-ink-300 hover:bg-ink-800 hover:text-ivory-100'
                    )
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  {!collapsed && (
                    <span className="text-sm font-medium whitespace-nowrap transition-opacity duration-200">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-ink-800 border border-ink-600 flex items-center justify-center text-ink-400 hover:text-ivory-100 hover:bg-ink-700 transition-all duration-200 shadow-lg"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      <div className="h-12 border-t border-ink-700 flex items-center justify-center">
        <div className="flex items-center gap-2 text-ink-500 text-xs">
          <div className="w-2 h-2 rounded-full bg-military-600 animate-pulse" />
          {!collapsed && <span>系统运行中</span>}
        </div>
      </div>
    </aside>
  );
}
