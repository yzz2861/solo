import { NavLink, useLocation } from 'react-router-dom';
import { Upload, BookOpen, ClipboardCheck, FileBarChart, Library } from 'lucide-react';

const navItems = [
  { to: '/', label: '数据导入', icon: Upload },
  { to: '/records', label: '借阅单列表', icon: BookOpen },
  { to: '/review', label: '复核工作台', icon: ClipboardCheck },
  { to: '/report', label: '报告导出', icon: FileBarChart },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-60 bg-primary text-white min-h-screen flex flex-col">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10">
        <Library className="w-7 h-7 text-accent" />
        <div>
          <div className="font-serif text-base font-bold leading-tight">图书馆清账</div>
          <div className="text-[11px] text-white/60 leading-tight">期末管理系统</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-white/15 text-white shadow-inner'
                  : 'text-white/75 hover:text-white hover:bg-white/8'
              }`}
            >
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 text-[11px] text-white/40">
        本地数据存储 · 无需联网
      </div>
    </aside>
  );
}
