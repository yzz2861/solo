import React from 'react';
import type { UserRole } from '@/types';
import {
  LayoutDashboard,
  FilePlus,
  ListChecks,
  BarChart3,
  Users,
  Zap,
  Bell,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { RoleSwitcher } from './RoleSwitcher';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
  badge?: () => number;
}

interface Props {
  currentPath: string;
  onNavigate: (to: string) => void;
}

export const AppHeader: React.FC<Props> = ({ currentPath, onNavigate }) => {
  const { currentRole, setRole, hazards } = useAppStore();

  const overdueCount = hazards.filter((h) => h.isOverdue && h.status !== 'CLOSED').length;

  const navItems: NavItem[] = [
    {
      to: '/',
      label: '首页仪表盘',
      icon: LayoutDashboard,
      roles: ['SAFETY_OFFICER', 'ELECTRICIAN', 'PROJECT_MANAGER', 'SAFETY_INSPECTOR'],
    },
    {
      to: '/register',
      label: '隐患登记',
      icon: FilePlus,
      roles: ['SAFETY_OFFICER'],
    },
    {
      to: '/hazards',
      label: '隐患列表',
      icon: ListChecks,
      roles: ['SAFETY_OFFICER', 'ELECTRICIAN', 'PROJECT_MANAGER', 'SAFETY_INSPECTOR'],
      badge: () =>
        currentRole === 'ELECTRICIAN'
          ? hazards.filter((h) => h.status === 'PENDING_RECTIFICATION' || h.status === 'REJECTED').length
          : currentRole === 'SAFETY_OFFICER'
          ? hazards.filter((h) => h.status === 'PENDING_REVIEW').length
          : 0,
    },
    {
      to: '/statistics',
      label: '统计分析',
      icon: BarChart3,
      roles: ['PROJECT_MANAGER'],
    },
    {
      to: '/meeting',
      label: '安监例会',
      icon: Users,
      roles: ['SAFETY_INSPECTOR', 'PROJECT_MANAGER'],
    },
  ];

  const visibleItems = navItems.filter((n) => n.roles.includes(currentRole));

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-steel-blue-dark via-steel-blue to-steel-blue-light text-white shadow-lg">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center h-16 gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigate('/')}
          >
            <div
              className="w-10 h-10 rounded-[4px] bg-safety-orange flex items-center justify-center
                         shadow-[0_2px_12px_rgba(255,107,53,0.4)] group-hover:scale-105 transition-transform"
            >
              <Zap size={22} strokeWidth={2.8} fill="currentColor" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-black tracking-wide">工地临电巡检台</h1>
              <p className="text-[11px] opacity-70">
                Temporary Power Inspection Platform
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 ml-4 flex-1">
            {visibleItems.map((item) => {
              const active =
                item.to === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.to);
              const Icon = item.icon;
              const count = item.badge ? item.badge() : 0;
              return (
                <button
                  key={item.to}
                  onClick={() => onNavigate(item.to)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-[4px] text-sm font-medium transition-all
                    ${
                      active
                        ? 'bg-white/15 text-white shadow-inner'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Icon size={17} strokeWidth={2} />
                  <span>{item.label}</span>
                  {count > 0 && (
                    <span
                      className="min-w-[20px] h-5 px-1.5 rounded-full bg-danger-red text-white
                                 text-[11px] font-bold flex items-center justify-center animate-pulse-slow"
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 ml-auto">
            <div className="relative">
              <div
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15
                           flex items-center justify-center cursor-pointer transition-colors"
              >
                <Bell size={18} strokeWidth={2} />
                {overdueCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
                               bg-danger-red text-white text-[10px] font-bold flex items-center justify-center
                               border-2 border-steel-blue animate-pulse-slow"
                  >
                    {overdueCount}
                  </span>
                )}
              </div>
            </div>
            <RoleSwitcher currentRole={currentRole} onChange={setRole} />
          </div>
        </div>
      </div>
    </header>
  );
};
