import { NavLink } from 'react-router-dom';
import { Calculator, Wrench, Home, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavTabs() {
  const navItems = [
    { to: '/', label: '计算', icon: Calculator },
    { to: '/report/contractor', label: '施工队报告', icon: Wrench },
    { to: '/report/owner', label: '业主报告', icon: Home },
    { to: '/history', label: '历史记录', icon: History },
  ];

  return (
    <nav className="bg-white border-b-2 border-zinc-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-0.5',
                  isActive
                    ? 'text-blue-700 border-blue-700 bg-blue-50'
                    : 'text-zinc-600 border-transparent hover:text-blue-600 hover:bg-zinc-50'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
