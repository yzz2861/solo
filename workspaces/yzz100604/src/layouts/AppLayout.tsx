import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Gauge, Layers, Archive, FileText, Snowflake, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', label: '单桥评估', icon: Gauge },
  { path: '/batch', label: '批量调度', icon: Layers },
  { path: '/archive', label: '撒盐档案', icon: Archive },
  { path: '/thresholds', label: '阈值说明', icon: FileText },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 frost-texture flex">
      <aside
        className={cn(
          'app-sidebar bg-gradient-to-b from-ice-primary to-[#0f2e44] text-white flex flex-col transition-all duration-300 shrink-0 border-r border-slate-200/50',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center w-full')}>
            <div className="w-10 h-10 rounded-xl bg-sky-400/20 flex items-center justify-center shrink-0">
              <Snowflake className="w-6 h-6 text-sky-300" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-base tracking-tight">结冰风险系统</h1>
                <p className="text-[11px] text-sky-200/70">桥面养护平台</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'bg-sky-400/20 text-white shadow-lg shadow-sky-900/20 border border-sky-400/30'
                    : 'text-sky-100/70 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', active && 'animate-pulse')} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sky-200/60 hover:text-white hover:bg-white/5 transition-colors text-xs',
              collapsed && 'justify-center'
            )}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <><X className="w-4 h-4" /> 收起侧栏</>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="app-header h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-8 sticky top-0 z-40">
          <div>
            <h2 className="font-semibold text-slate-800">
              {NAV_ITEMS.find((n) => n.path === location.pathname)?.label || '系统'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 risk-pulse" />
              系统正常
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ice-primary to-ice-accent flex items-center justify-center text-white text-sm font-bold shadow-md">
              管
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
