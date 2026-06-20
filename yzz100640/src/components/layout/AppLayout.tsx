import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Sprout, BarChart3, BookOpen, Lightbulb, Settings, LogOut } from 'lucide-react';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-cream-50 bg-leaf-pattern">
      <header className="h-16 bg-gradient-to-r from-leaf-700 to-leaf-600 text-white shadow-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-serif text-xl font-bold">
          <Sprout size={24} />
          <span>农技资料问答助手</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-leaf-500 w-9 h-9 rounded-full flex items-center justify-center">
            <span className="font-medium">技</span>
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 transition-colors">
            <LogOut size={16} />
            <span>退出</span>
          </button>
        </div>
      </header>
      <div className="flex-1 flex">
        <aside className="w-56 bg-white/80 backdrop-blur border-r border-leaf-100 py-6 px-3">
          <div className="text-xs text-leaf-500 uppercase tracking-wider px-3 mb-2">主菜单</div>
          <nav className="flex flex-col">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-leaf-100 to-leaf-50 text-leaf-700 font-medium border-l-4 border-leaf-600'
                    : 'text-leaf-700 hover:bg-leaf-50'
                }`
              }
            >
              <Sprout size={18} />
              <span>问答主页</span>
            </NavLink>
            <NavLink
              to="/materials"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-leaf-100 to-leaf-50 text-leaf-700 font-medium border-l-4 border-leaf-600'
                    : 'text-leaf-700 hover:bg-leaf-50'
                }`
              }
            >
              <BookOpen size={18} />
              <span>资料管理</span>
            </NavLink>
            <NavLink
              to="/experience"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-leaf-100 to-leaf-50 text-leaf-700 font-medium border-l-4 border-leaf-600'
                    : 'text-leaf-700 hover:bg-leaf-50'
                }`
              }
            >
              <Lightbulb size={18} />
              <span>本地经验</span>
            </NavLink>
            <NavLink
              to="/statistics"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-leaf-100 to-leaf-50 text-leaf-700 font-medium border-l-4 border-leaf-600'
                    : 'text-leaf-700 hover:bg-leaf-50'
                }`
              }
            >
              <BarChart3 size={18} />
              <span>统计导出</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-leaf-100 to-leaf-50 text-leaf-700 font-medium border-l-4 border-leaf-600'
                    : 'text-leaf-700 hover:bg-leaf-50'
                }`
              }
            >
              <Settings size={18} />
              <span>系统设置</span>
            </NavLink>
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
