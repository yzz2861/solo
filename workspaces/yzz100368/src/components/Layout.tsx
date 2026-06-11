import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  ClipboardList,
  Stethoscope,
  FileSearch,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '概览', icon: LayoutDashboard },
  { to: '/upload', label: '录入病历', icon: Upload },
  { to: '/records', label: '病历列表', icon: ClipboardList },
  { to: '/qa', label: '质控中心', icon: FileSearch },
];

export default function Layout() {
  const location = useLocation();
  const showSidebar = !location.pathname.startsWith('/record/');

  return (
    <div className="flex min-h-screen">
      {showSidebar && (
        <aside className="w-60 shrink-0 bg-gradient-to-b from-medical-900 to-medical-800 text-white">
          <div className="px-6 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="font-serif font-semibold text-lg">病历规范提取</div>
                <div className="text-xs text-medical-200">社区门诊质控系统</div>
              </div>
            </div>
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white shadow-inner'
                        : 'text-medical-100/80 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 w-60">
            <div className="text-xs text-medical-200">当前登录</div>
            <div className="text-sm font-medium mt-1">录入护士 · 王琳</div>
          </div>
        </aside>
      )}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
