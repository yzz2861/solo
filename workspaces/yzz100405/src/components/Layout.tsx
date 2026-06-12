import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, Plus, LayoutGrid, FileText, PawPrint } from 'lucide-react';

const navItems = [
  { to: '/board', label: '任务看板', icon: ClipboardList },
  { to: '/register', label: '寄养登记', icon: Plus },
  { to: '/cage-check', label: '笼位核对', icon: LayoutGrid },
  { to: '/handover', label: '交接导出', icon: FileText },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print bg-warm-500 text-white shadow-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PawPrint className="w-6 h-6" />
            <h1 className="font-serif text-lg font-semibold tracking-wide">宠物寄养喂药管理</h1>
          </div>
          <span className="text-warm-200 text-xs hidden sm:block">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </span>
        </div>
      </header>

      <nav className="no-print bg-white border-b border-warm-200 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? 'border-warm-500 text-warm-700'
                    : 'border-transparent text-warm-400 hover:text-warm-600 hover:border-warm-300'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      <footer className="no-print text-center text-xs text-warm-300 py-3 border-t border-warm-100">
        宠物寄养喂药管理系统 · 数据仅保存在本地浏览器
      </footer>
    </div>
  );
}
