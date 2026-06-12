import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenLine, FileBarChart, TrendingUp, ShoppingCart, ChefHat } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: '后厨看板', icon: LayoutDashboard },
  { to: '/entry', label: '数据录入', icon: PenLine },
  { to: '/report', label: '总经理报表', icon: FileBarChart },
  { to: '/analysis', label: '周误差分析', icon: TrendingUp },
  { to: '/procurement', label: '采购建议', icon: ShoppingCart },
];

export default function NavBar() {
  return (
    <nav className="bg-surface-900 border-b border-surface-800 shadow-card sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg text-white font-semibold leading-tight">早餐浪费图</h1>
            <p className="text-[11px] text-surface-700 leading-tight">智慧备餐 · 减少浪费</p>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-500/20 text-brand-400 shadow-inner-glow'
                      : 'text-surface-700 hover:text-white hover:bg-surface-850'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <div className="text-xs text-surface-700 font-mono">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </div>
      </div>
    </nav>
  );
}
