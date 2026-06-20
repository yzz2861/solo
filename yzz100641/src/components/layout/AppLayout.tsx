import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  Users,
  Download,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

interface SidebarItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  const sidebarItems: SidebarItem[] = [
    {
      path: '/',
      label: '值班总览',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      path: '/intake',
      label: '求助导入',
      icon: <FilePlus className="w-5 h-5" />,
    },
    {
      path: '/duty',
      label: '值班处理',
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      path: '/referrals',
      label: '转介记录',
      icon: <Users className="w-5 h-5" />,
    },
    {
      path: '/export',
      label: '导出中心',
      icon: <Download className="w-5 h-5" />,
    },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={cn(
          'bg-[#1e3a5f] text-white flex flex-col transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg leading-tight">校园求助</h1>
              <p className="text-xs text-white/60">分级处理系统</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 py-4 px-2 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'hover:bg-white/10 group',
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/70 hover:text-white'
                )}
              >
                <span className={cn(
                  'flex-shrink-0 transition-transform duration-200',
                  isActive && 'scale-110'
                )}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 border-t border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </aside>
      
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
