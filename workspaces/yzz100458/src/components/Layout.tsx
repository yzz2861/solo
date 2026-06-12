import { NavLink, Outlet } from 'react-router-dom'
import {
  Upload,
  ScanSearch,
  CheckCircle2,
  FileBarChart2,
  ClipboardCheck,
  GitCompareArrows,
  Store,
  User,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const navItems = [
  { to: '/import', icon: Upload, label: '照片导入' },
  { to: '/results', icon: ScanSearch, label: '识别结果' },
  { to: '/review/current', icon: CheckCircle2, label: '确认审核' },
  { to: '/reports', icon: FileBarChart2, label: '巡店报告' },
  { to: '/rectification', icon: ClipboardCheck, label: '整改清单' },
  { to: '/recheck', icon: GitCompareArrows, label: '复查对比' },
]

export default function Layout() {
  const currentUser = useAppStore((s) => s.currentUser)

  return (
    <div className="flex h-screen bg-brand-900">
      <aside className="w-60 flex-shrink-0 bg-brand-800 border-r border-brand-700/50 flex flex-col">
        <div className="px-5 py-6 border-b border-brand-700/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-100 tracking-tight">巡店陈列识别</h1>
              <p className="text-[10px] text-gray-500 font-mono">Shelf Inspector</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-brand-700/50'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-brand-700/40">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-gray-500">
                {currentUser.role === 'supervisor' ? '零售督导' : currentUser.role === 'manager' ? '区域经理' : '店长'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
