import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarDays, Scissors, BarChart3, MapPin } from 'lucide-react'

const navItems = [
  { to: '/', label: '日历', icon: CalendarDays },
  { to: '/groomer', label: '造型师工作台', icon: Scissors },
  { to: '/manager', label: '店长数据', icon: BarChart3 },
  { to: '/route', label: '接送路线', icon: MapPin },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="flex flex-col bg-paw-50 border-r border-paw-200 w-56 shrink-0 md:w-56 sm:w-16 transition-all">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-paw-200">
          <span className="text-2xl">🐾</span>
          <span className="text-lg font-semibold text-brand-700 sm:hidden md:inline">宠物美容预约</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-brand-700 hover:bg-paw-100'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="sm:hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6 paw-bg">
        {children}
      </main>
    </div>
  )
}
