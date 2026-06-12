import { Outlet, NavLink } from 'react-router-dom'
import { FlaskConical, ClipboardList, Calculator, Archive } from 'lucide-react'

const links = [
  { to: '/', label: '数据录入', Icon: ClipboardList },
  { to: '/review', label: '复核结果', Icon: Calculator },
  { to: '/records', label: '记录管理', Icon: Archive },
]

export default function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`

  return (
    <div className="min-h-screen bg-[#FAFAF5]">
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-[#0D7377] flex-col z-30">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <FlaskConical className="w-6 h-6 text-white shrink-0" />
          <h1 className="text-white font-bold text-[15px] leading-snug">菌落稀释计数复核</h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={navClass}>
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="md:hidden fixed top-0 inset-x-0 bg-[#0D7377] z-30 shadow-lg">
        <div className="flex items-center gap-2 px-4 py-3">
          <FlaskConical className="w-5 h-5 text-white shrink-0" />
          <h1 className="text-white font-bold text-sm">菌落稀释计数复核</h1>
        </div>
        <nav className="flex gap-1 px-3 pb-2 overflow-x-auto">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={navClass}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs whitespace-nowrap">{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="md:ml-56 min-h-screen">
        <div className="pt-[88px] md:pt-0 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
