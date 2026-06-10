import { NavLink } from 'react-router-dom';
import { Car, Users, BarChart3, ClipboardList } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: '核销台', icon: Car },
  { to: '/workers', label: '工人进度', icon: Users },
  { to: '/report', label: '日结报表', icon: BarChart3 },
  { to: '/members', label: '会员管理', icon: ClipboardList },
];

export function Sidebar() {
  return (
    <aside className="w-56 bg-gradient-to-b from-brand-900 to-brand-800 text-white flex flex-col h-screen">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">洗车核销台</h1>
            <p className="text-xs text-white/60">Car Wash System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white text-brand-800 shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10 text-xs text-white/40">
        v1.0.0
      </div>
    </aside>
  );
}
