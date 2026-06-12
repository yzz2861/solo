import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardEdit, LayoutGrid, FileDown, BarChart3 } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: '反馈录入', icon: ClipboardEdit },
  { to: '/grouped', label: '部位分组', icon: LayoutGrid },
  { to: '/export', label: '修改单导出', icon: FileDown },
  { to: '/analytics', label: '高频统计', icon: BarChart3 },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-charcoal-900 text-charcoal-50 flex flex-col no-print fixed h-full z-20">
        <div className="px-5 py-6 border-b border-charcoal-700">
          <h1 className="font-serif text-xl font-bold tracking-wide">FitBack</h1>
          <p className="text-xs text-charcoal-400 mt-1">样衣试穿反馈</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-charcoal-700 text-white'
                    : 'text-charcoal-300 hover:bg-charcoal-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-charcoal-700">
          <p className="text-xs text-charcoal-500">v1.0 · 数据本地存储</p>
        </div>
      </aside>

      <main className="flex-1 ml-56">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
