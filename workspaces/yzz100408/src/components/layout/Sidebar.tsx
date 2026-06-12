import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Upload, BarChart3, Activity,
  UserCog, FileBarChart, Zap,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '峰谷总览' },
  { to: '/analysis', icon: BarChart3, label: '多维分析' },
  { to: '/attribution', icon: Activity, label: '故障/价格归因' },
  { to: '/station-master', icon: UserCog, label: '站长调班' },
  { to: '/report', icon: FileBarChart, label: '运营报告' },
  { to: '/import', icon: Upload, label: '数据导入' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-electric-blue border-r border-white/5 flex flex-col">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-white/5">
        <div className="w-9 h-9 rounded-sm bg-electric-green/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-electric-green" strokeWidth={2} />
        </div>
        <div>
          <div className="text-sm font-semibold text-neutral-slate tracking-wide">
            ChargePeak
          </div>
          <div className="text-[10px] font-mono text-neutral-slate-dark tracking-wider">
            QUEUE ANALYZER
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm rounded-sm transition-all ${
                isActive
                  ? 'bg-electric-green/10 text-electric-green border-l-2 border-electric-green'
                  : 'text-neutral-slate-dark hover:text-neutral-slate hover:bg-white/5 border-l-2 border-transparent'
              }`
            }
          >
            <item.icon className="w-4 h-4" strokeWidth={1.5} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="text-[10px] font-mono text-neutral-slate-dark/60 space-y-1">
          <div>v1.0.0 · holiday edition</div>
          <div>data: processed client-side</div>
        </div>
      </div>
    </aside>
  );
}
