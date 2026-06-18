import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Route,
  Users,
  Package,
  CheckSquare,
  LifeBuoy,
  User,
  Truck,
  Heart,
  FileBarChart,
  Bell,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: '活动总览', icon: LayoutDashboard, role: 'all' },
  { path: '/routes', label: '路线管理', icon: Route, role: 'leader' },
  { path: '/riders', label: '队员管理', icon: Users, role: 'leader' },
  { path: '/supplies', label: '补给管理', icon: Package, role: 'all' },
  { path: '/checkin', label: '签到记录', icon: CheckSquare, role: 'all' },
  { path: '/rescue', label: '求助救援', icon: LifeBuoy, role: 'all' },
  { path: '/leader', label: '领队视图', icon: User, role: 'leader' },
  { path: '/supply-vehicle', label: '补给车视图', icon: Truck, role: 'supply' },
  { path: '/medic', label: '队医视图', icon: Heart, role: 'medic' },
  { path: '/export', label: '数据导出', icon: FileBarChart, role: 'leader' },
];

export default function Sidebar() {
  const { currentView, setCurrentView, getUnreadAlertsCount } = useAppStore();
  const unreadCount = getUnreadAlertsCount();

  const views = [
    { key: 'leader', label: '领队模式' },
    { key: 'supply', label: '补给车模式' },
    { key: 'medic', label: '队医模式' },
  ];

  const visibleNavItems = navItems.filter(
    (item) => item.role === 'all' || item.role === currentView
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg font-bold">骑</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-800">补给台</h1>
            <p className="text-xs text-gray-500">骑行俱乐部管理系统</p>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-gray-100">
        <p className="text-xs text-gray-400 mb-2 px-2">切换视图</p>
        <div className="flex gap-1">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setCurrentView(v.key as 'leader' | 'supply' | 'medic')}
              className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
                currentView === v.key
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin">
        <p className="text-xs text-gray-400 mb-2 px-2">功能菜单</p>
        <div className="space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.path === '/rescue' && unreadCount > 0 && (
                <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-teal-50 rounded-xl">
          <Bell className="w-5 h-5 text-primary-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800">提醒中心</p>
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} 条未读提醒` : '暂无新提醒'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
