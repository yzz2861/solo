import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: '审查项目', icon: '📋', end: true },
  { to: '/review/new', label: '新建审查', icon: '➕' },
  { to: '/dashboard', label: '风险汇总', icon: '📊' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print sticky top-0 z-30 bg-brand-500 text-white shadow-lg">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-2xl">
              🛡️
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">合规审查</h1>
              <p className="text-xs text-white/70 leading-tight">直播商品讲解违规提示系统</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all
                  ${isActive ? 'bg-white/15 text-white shadow-inner' : 'text-white/80 hover:text-white hover:bg-white/10'}
                `}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium leading-tight">合规·小王</div>
              <div className="text-xs text-white/60 leading-tight">审核员</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-brand-700 font-bold">
              王
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1800px] w-full mx-auto px-6 py-6">
        <Outlet />
      </main>

      <footer className="no-print border-t border-slate-200 bg-white/60 py-4 text-center text-xs text-slate-500">
        © 2026 直播合规审查系统 · 仅供内部使用 · 所有数据本地存储
      </footer>
    </div>
  )
}
