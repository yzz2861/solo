import { NavLink } from 'react-router-dom';
import { Leaf, ClipboardList, BarChart3, CalendarDays } from 'lucide-react';

const NavBar = () => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-greenhouse-600 text-white shadow-soft'
        : 'text-greenhouse-800 hover:bg-greenhouse-50'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-greenhouse-50 shadow-soft">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-greenhouse-gradient flex items-center justify-center shadow-card">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-greenhouse-800 leading-tight">
                温室灌溉智能估算
              </h1>
              <p className="text-xs text-greenhouse-500">
                基于 FAO Penman-Monteith · 番茄专用
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <NavLink to="/" className={linkClass}>
              <ClipboardList className="w-4 h-4" />
              <span className="text-sm font-medium">数据录入</span>
            </NavLink>
            <NavLink to="/report" className={linkClass}>
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">估算报告</span>
            </NavLink>
            <NavLink to="/history" className={linkClass}>
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm font-medium">历史回填</span>
            </NavLink>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-greenhouse-50">
            <CalendarDays className="w-4 h-4 text-greenhouse-600" />
            <span className="text-sm text-greenhouse-800 font-medium">
              {dateStr} · 周{weekdays[today.getDay()]}
            </span>
          </div>
        </div>

        <div className="md:hidden mt-3 flex items-center gap-1.5">
          <NavLink to="/" className={linkClass}>
            <ClipboardList className="w-4 h-4" />
            <span className="text-sm font-medium">录入</span>
          </NavLink>
          <NavLink to="/report" className={linkClass}>
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">报告</span>
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            <CalendarDays className="w-4 h-4" />
            <span className="text-sm font-medium">历史</span>
          </NavLink>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
