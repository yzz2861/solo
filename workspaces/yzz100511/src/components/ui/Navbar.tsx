import { NavLink, useLocation } from 'react-router-dom';
import { Building2, LayoutGrid, FileCheck, Power, Download } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '3D布展', icon: LayoutGrid },
    { path: '/export', label: '方案导出', icon: Download },
    { path: '/approval', label: '审批管理', icon: FileCheck },
    { path: '/dismantle', label: '撤展管理', icon: Power },
  ];

  return (
    <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">商场中庭布展承重系统</h1>
            <p className="text-xs text-slate-400">Mall Atrium Exhibition Load Planning</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-white">物业管理员</p>
            <p className="text-xs text-slate-400">万象城购物中心</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold">
            W
          </div>
        </div>
      </div>
    </nav>
  );
};
