import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ListChecks,
  FileDown,
  LogOut,
  Wrench,
  ChevronRight,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import type { StaffRole } from '@/shared/types'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  roles: StaffRole[]
}

const navItems: NavItem[] = [
  {
    to: '/cs/workbench',
    label: '客服工作台',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['cs'],
  },
  {
    to: '/cs/tickets',
    label: '工单列表',
    icon: <ListChecks className="w-5 h-5" />,
    roles: ['cs', 'admin'],
  },
  {
    to: '/admin/export',
    label: '导出中心',
    icon: <FileDown className="w-5 h-5" />,
    roles: ['admin'],
  },
]

const breadcrumbMap: Record<string, string> = {
  '/cs/workbench': '客服工作台',
  '/cs/tickets': '工单列表',
  '/admin/export': '导出中心',
}

export default function CSLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const staff = useAuthStore((s) => s.staff)
  const logout = useAuthStore((s) => s.logout)
  const userRole = useAuthStore((s) => s.userRole)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const getBreadcrumb = () => {
    const path = location.pathname
    if (path.startsWith('/cs/tickets/') && path !== '/cs/tickets') {
      return [
        { label: '工单列表', to: '/cs/tickets' },
        { label: '工单详情', to: null },
      ]
    }
    const label = breadcrumbMap[path]
    return label ? [{ label, to: null }] : [{ label: '首页', to: null }]
  }

  const breadcrumbs = getBreadcrumb()
  const visibleNavItems = navItems.filter((item) =>
    userRole ? item.roles.includes(userRole) : false
  )

  const getRoleBadge = (role: StaffRole | null) => {
    const map: Record<StaffRole, { label: string; className: string }> = {
      cs: {
        label: '客服',
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      },
      tech: {
        label: '维修',
        className: 'bg-green-500/20 text-green-300 border-green-500/30',
      },
      admin: {
        label: '主管',
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      },
    }
    if (!role) return null
    const cfg = map[role]
    return (
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded border ${cfg.className}`}
      >
        {cfg.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col min-h-screen shadow-xl flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
              <Wrench className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">报修工单</h1>
              <p className="text-slate-400 text-xs">Maintenance System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30 shadow-lg shadow-blue-500/10'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {staff?.name?.charAt(0) || <User className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {staff?.name || '未登录'}
              </p>
              {getRoleBadge(userRole)}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                {crumb.to ? (
                  <NavLink
                    to={crumb.to}
                    className="text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    {crumb.label}
                  </NavLink>
                ) : (
                  <span className="text-slate-900 font-medium">{crumb.label}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-500">当前登录</p>
              <p className="text-sm font-medium text-slate-900">
                {staff?.name} <span className="text-slate-400">({staff?.id})</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>退出登录</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
