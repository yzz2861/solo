import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Leaf,
  LayoutDashboard,
  Archive,
  BookOpen,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from 'lucide-react'
import { useStore } from '@/store'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '工作台' },
  { to: '/specimens', icon: Archive, label: '标本台账' },
  { to: '/borrows', icon: BookOpen, label: '借阅管理' },
  { to: '/statistics', icon: BarChart3, label: '统计分析' },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const role = useStore((s) => s.role)
  const setRole = useStore((s) => s.setRole)
  const navigate = useNavigate()

  const handleSwitchRole = () => {
    setRole(null)
    navigate('/')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-forest-500 text-white flex flex-col transition-all duration-300 shrink-0`}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-forest-600">
          <Leaf className="w-7 h-7 text-sand-300 shrink-0" />
          {!collapsed && (
            <span className="text-lg font-serif font-bold tracking-wide whitespace-nowrap">
              标本借阅柜
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-forest-600 text-white'
                    : 'text-forest-100 hover:bg-forest-600/50'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-forest-600 px-3 py-3 space-y-2">
          {!collapsed && role && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-forest-200">当前角色</span>
              <span className="text-sand-300 font-medium">{role}</span>
            </div>
          )}
          <button
            onClick={handleSwitchRole}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-forest-100 hover:bg-forest-600/50 transition-colors duration-150"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>切换角色</span>}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-forest-100 hover:bg-forest-600/50 transition-colors duration-150"
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronsLeft className="w-4 h-4 shrink-0" />
            )}
            {!collapsed && <span>收起侧栏</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 bg-sand-50">
        <Outlet />
      </main>
    </div>
  )
}
