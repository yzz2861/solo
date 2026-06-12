import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { useAuditStore } from '@/store/auditStore'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/checklist', icon: ClipboardList, label: '清单比对' },
  { to: '/files', icon: FolderOpen, label: '文件管理' },
  { to: '/export', icon: FileDown, label: '导出报告' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { session, toggleAuditDayMode } = useAuditStore()

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-[#1C1C1E] border-r border-zinc-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800">
        <Shield className="h-7 w-7 shrink-0 text-amber-500" />
        {!collapsed && (
          <h1 className="text-[#FAFAFA] text-base font-bold tracking-tight whitespace-nowrap">
            验厂文件夹助手
          </h1>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-zinc-800 px-3 py-4 space-y-3">
        <div
          className={cn(
            'flex items-center gap-3',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!collapsed && (
            <span className="text-xs text-zinc-500">验厂日模式</span>
          )}
          <button
            onClick={toggleAuditDayMode}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
              session.auditDayMode ? 'bg-red-500' : 'bg-zinc-700'
            )}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                session.auditDayMode ? 'translate-x-4' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {session.auditDayMode && (
          <div
            className={cn(
              'flex items-center justify-center',
              collapsed ? '' : 'justify-start'
            )}
          >
            <span className="animate-pulse rounded bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400 border border-red-500/40">
              验厂日
            </span>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors',
            collapsed ? 'justify-center' : ''
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>收起侧栏</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
