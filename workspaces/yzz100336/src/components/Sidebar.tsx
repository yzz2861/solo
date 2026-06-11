import { NavLink } from 'react-router-dom'
import { LayoutGrid, FolderOpen, Columns2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/editor', icon: LayoutGrid, label: '编辑器' },
  { to: '/schemes', icon: FolderOpen, label: '方案' },
  { to: '/compare', icon: Columns2, label: '对比' },
  { to: '/schemes', icon: Download, label: '导出' },
]

export default function Sidebar() {
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-gray-800 bg-[#111827] py-4">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'group relative flex h-10 w-10 items-center justify-center rounded-lg transition',
              isActive
                ? 'border-l-2 border-amber-500 text-amber-400 bg-amber-500/10'
                : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
            )
          }
        >
          <Icon size={20} />
          <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-gray-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {label}
          </span>
        </NavLink>
      ))}
    </nav>
  )
}
