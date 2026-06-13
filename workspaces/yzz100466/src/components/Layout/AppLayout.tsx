import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Menu,
  X,
  FileInput,
  Search,
  LineChart,
  AlertTriangle,
  GitBranch,
  Building2,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '数据录入', icon: FileInput },
  { path: '/query', label: '裂缝查询', icon: Search },
  { path: '/engineer', label: '工程师报告', icon: LineChart },
  { path: '/management', label: '管理处报告', icon: AlertTriangle },
  { path: '/mapping', label: '裂缝映射', icon: GitBranch },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-primary-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-primary-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary-300" />
              <span className="font-bold text-lg">桥梁养护</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-primary-800 transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                >
                  {({ isActive }) => (
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 ${
                        isActive
                          ? 'bg-primary-700 text-white'
                          : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <span className="text-sm font-medium">{item.label}</span>
                      )}
                      {sidebarOpen && isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </div>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-primary-800">
            <p className="text-xs text-primary-400">
              桥梁裂缝增长复核系统
            </p>
            <p className="text-xs text-primary-500 mt-1">v1.0.0</p>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-neutral-800">
              桥梁裂缝增长复核系统
            </h1>
            <p className="text-xs text-neutral-500">
              高效管理裂缝监测数据，智能预警安全风险
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600">
              今日: {new Date().toLocaleDateString('zh-CN')}
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
