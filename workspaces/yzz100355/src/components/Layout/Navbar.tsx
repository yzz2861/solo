import { NavLink, useLocation } from 'react-router-dom';
import { Bot, BarChart3, GitCompare, Settings, Bell, User } from 'lucide-react';
import { cn } from '@/utils/cn';

const navItems = [
  {
    path: '/',
    label: '3D场景',
    icon: Bot,
  },
  {
    path: '/reports',
    label: '报表中心',
    icon: BarChart3,
  },
  {
    path: '/comparison',
    label: '班次对比',
    icon: GitCompare,
  },
];

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="h-14 bg-background-dark/80 backdrop-blur-md border-b border-white/10 px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-white tracking-wide">
              巡逻机器人路线复盘
            </h1>
            <p className="text-[10px] text-white/40 -mt-0.5">Patrol Robot Review System</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>
        <button className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Settings size={18} />
        </button>
        <div className="h-6 w-px bg-white/10" />
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-medium text-white">安保主管</p>
            <p className="text-[10px] text-white/40">管理员</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
