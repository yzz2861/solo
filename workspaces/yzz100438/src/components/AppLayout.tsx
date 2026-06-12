import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Tent,
  Undo2,
  Boxes,
  ClipboardCheck,
  BarChart3,
  Mountain,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/rent', label: '租出登记', icon: Tent },
  { path: '/return', label: '归还登记', icon: Undo2 },
  { path: '/equipment', label: '装备管理', icon: Boxes },
  { path: '/approvals', label: '赔损审批', icon: ClipboardCheck },
  { path: '/reports', label: '报表中心', icon: BarChart3 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const current = navItems.find((n) => n.path === location.pathname) || navItems[0];

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 flex-col border-r border-cream-200 bg-white/60 backdrop-blur-xl sticky top-0 h-screen">
        <div className="px-6 py-6 flex items-center gap-3 border-b border-cream-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forest-600 to-forest-800 flex items-center justify-center shadow-soft">
            <Mountain className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display text-lg text-bark-700 leading-tight">野趣户外</div>
            <div className="text-[11px] text-bark-400 tracking-wider">露营装备租还台</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-forest-800 text-white shadow-card'
                    : 'text-bark-600 hover:bg-cream-100 hover:text-bark-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-[18px] h-[18px] transition-transform group-hover:scale-110 ${
                      isActive ? 'text-ember-300' : ''
                    }`}
                    strokeWidth={2}
                  />
                  <span className="font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-cream-200">
          <div className="text-[11px] text-bark-400 leading-relaxed">
            当前版本 v1.0.0<br />
            刷新页面数据不会丢失
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-cream-200 px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-forest-600 to-forest-800 flex items-center justify-center">
              <Mountain className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-display text-base text-bark-700 leading-tight">野趣户外</div>
              <div className="text-[10px] text-bark-400">露营装备租还台</div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                    isActive ? 'bg-forest-800 text-white' : 'bg-cream-100 text-bark-600'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="hidden lg:flex items-end justify-between mb-6">
            <div>
              <h1 className="font-display text-3xl text-bark-800">{current.label}</h1>
              <p className="text-sm text-bark-400 mt-1">
                {subtitleFor(current.path)}
              </p>
            </div>
            <div className="text-right text-xs text-bark-400">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </div>
          </div>
          <div className="animate-fade-in-up">{children}</div>
        </main>
      </div>
    </div>
  );
}

function subtitleFor(path: string): string {
  switch (path) {
    case '/':
      return '一眼看清今日待办与装备状态，按归还时间先清洁最早归还的装备';
    case '/rent':
      return '登记租客信息，选择可租装备，勾选配件清单，一键开单';
    case '/return':
      return '选择已租出装备检查归还状态，记录配件缺失与损坏，自动进入待清洁队列';
    case '/equipment':
      return '查看所有装备当前状态、租还历史与清洁记录';
    case '/approvals':
      return '店长确认赔损扣款金额，通过后从押金中扣除';
    case '/reports':
      return '导出押金明细、赔损记录与下周可租装备清单';
    default:
      return '';
  }
}
