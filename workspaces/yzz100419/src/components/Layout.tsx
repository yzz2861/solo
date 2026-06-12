import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Upload, BarChart3, UserX, Shield, User, Users, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { RoleBadge } from '@/components/RoleBadge'
import type { UserRole } from '@/types'

const navItems = [
  { to: '/import', label: '数据导入', icon: Upload },
  { to: '/dashboard', label: '图表看板', icon: BarChart3 },
  { to: '/churn-list', label: '流失名单', icon: UserX },
]

const roleOptions: { value: UserRole; label: string; icon: typeof Shield }[] = [
  { value: 'boss', label: '老板', icon: Shield },
  { value: 'manager', label: '店长', icon: User },
  { value: 'consultant', label: '顾问', icon: Users },
]

const pageTitleMap: Record<string, string> = {
  '/import': '数据导入',
  '/dashboard': '图表看板',
  '/churn-list': '流失名单',
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { role, setRole } = useAppStore()
  const location = useLocation()

  const pageTitle = pageTitleMap[location.pathname] || '复购流失图'

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap');`}</style>

      <div className="flex h-screen overflow-hidden bg-[#F5F0EB] font-[Noto_Sans_SC]">
        <aside
          className={cn(
            'relative flex h-full flex-col border-r border-[#E8DDD5] bg-[#FDF9F6] transition-all duration-300 ease-in-out',
            collapsed ? 'w-16' : 'w-60',
          )}
        >
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="absolute -right-3 top-7 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#E8DDD5] bg-white text-[#B76E79] shadow-sm transition-transform hover:scale-110"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className="flex items-center gap-2 px-4 pt-6 pb-4">
            <Sparkles size={20} className="shrink-0 text-[#B76E79]" />
            {!collapsed && (
              <h1 className="font-[Playfair_Display] text-lg font-bold tracking-wide text-[#B76E79]">
                复购流失图
              </h1>
            )}
          </div>

          <div className={cn('px-3 pb-4', collapsed && 'px-2')}>
            <div
              className={cn(
                'flex gap-1',
                collapsed ? 'flex-col items-center' : 'flex-row',
              )}
            >
              {roleOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={cn(
                    'flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200',
                    collapsed ? 'h-8 w-8' : 'flex-1 gap-1 py-1.5',
                    role === value
                      ? 'bg-[#B76E79] text-white shadow-sm'
                      : 'bg-white text-[#8B7E74] hover:bg-[#F5F0EB] hover:text-[#B76E79]',
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={collapsed ? 16 : 14} />
                  {!collapsed && <span>{label}</span>}
                </button>
              ))}
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-[#B76E79]/10 text-[#B76E79] shadow-sm'
                      : 'text-[#8B7E74] hover:bg-[#B76E79]/5 hover:text-[#B76E79]',
                  )
                }
                title={collapsed ? label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} className={cn(isActive && 'text-[#B76E79]')} />
                    {!collapsed && (
                      <span className={cn(isActive && 'font-semibold')}>{label}</span>
                    )}
                    {isActive && !collapsed && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#B76E79]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {!collapsed && (
            <div className="border-t border-[#E8DDD5] px-4 py-3">
              <p className="text-[10px] tracking-widest text-[#BFB3A8]">
                美容院数据管理
              </p>
            </div>
          )}
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E8DDD5] bg-white/70 px-6 backdrop-blur-sm">
            <h2 className="text-base font-semibold text-[#4A3F37]">{pageTitle}</h2>
            <RoleBadge role={role} />
          </header>

          <main
            className={cn(
              'flex-1 overflow-y-auto p-6',
              '[background-image:radial-gradient(circle_at_1px_1px,rgba(183,110,121,0.04)_1px,transparent_0)]',
              '[background-size:24px_24px]',
            )}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
