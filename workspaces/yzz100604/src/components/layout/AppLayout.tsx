import { NavLink, Outlet } from 'react-router-dom'
import {
  Thermometer,
  ListOrdered,
  ClipboardList,
  BookOpen,
  User,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/formatters'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/', label: '单点位评估', icon: Thermometer, end: true },
  { to: '/batch', label: '批量调度', icon: ListOrdered },
  { to: '/archive', label: '撒盐档案', icon: ClipboardList },
  { to: '/thresholds', label: '阈值说明', icon: BookOpen },
]

export default function AppLayout() {
  const today = formatDate(Date.now())

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col bg-[#0F2B5B] text-white">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/20">
            <Thermometer className="h-5 w-5 text-sky-300" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">桥面结冰风险</div>
            <div className="text-xs text-slate-300">Ice Risk System</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                  isActive
                    ? 'bg-sky-500/20 text-white shadow-inner ring-1 ring-sky-400/30'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px] transition-colors',
                  'text-slate-400 group-hover:text-white',
                  'aria-[current=page]:text-sky-300'
                )}
              />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4 text-xs text-slate-400">
          v1.0.0 · 江苏高速公路管理
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">
            桥面结冰风险估算系统
          </h1>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="h-4 w-4" />
              <span>{today}</span>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium text-slate-700">
                  值班队长 · 张建国
                </div>
                <div className="text-xs text-slate-400">
                  南京 · 路网调度中心
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
