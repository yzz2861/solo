import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Database, Grid3X3, ClipboardList, CalendarDays, Settings, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: '工作台', end: true },
  { to: '/data', icon: Database, label: '数据管理' },
  { to: '/clustering', icon: Grid3X3, label: '聚类分析' },
  { to: '/checklist', icon: ClipboardList, label: '改进清单' },
  { to: '/courses', icon: CalendarDays, label: '课程跟进' },
  { to: '/settings', icon: Settings, label: '设置' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className={cn(
        'h-screen bg-white/80 backdrop-blur-xl border-r border-brand-100/60 flex flex-col transition-all duration-300 sticky top-0',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className={cn(
        'h-20 flex items-center gap-3 px-6 border-b border-brand-100/60',
        collapsed && 'px-4 justify-center'
      )}>
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-soft shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <div className="font-serif font-bold text-base text-brand-800 leading-tight">
              课效聚类
            </div>
            <div className="text-[11px] text-brand-400 font-medium">
              Feedback Insight
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              collapsed ? 'justify-center px-0' : '',
              isActive ? 'nav-item-active' : 'nav-item'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-brand-100/60">
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4">
            <div className="text-xs font-semibold text-amber-700 mb-1">💡 小贴士</div>
            <p className="text-[11px] text-amber-700/80 leading-relaxed">
              导入作业反馈后，系统会自动进行多标签聚类。同一句话既抱怨题目又暴露知识点，会同时归入多个主题哦。
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
