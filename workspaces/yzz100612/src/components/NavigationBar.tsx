import { useNavigate, useLocation } from 'react-router-dom'
import { Anchor, FileText, Archive } from 'lucide-react'

const navItems = [
  { path: '/', label: '锚链估算', icon: Anchor },
  { path: '/report', label: '船长报告', icon: FileText },
  { path: '/archive', label: '俱乐部存档', icon: Archive },
]

export default function NavigationBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-cyan-900/40 bg-[#0a1628]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Anchor className="h-6 w-6 text-cyan-400" />
          <span className="font-serif text-lg font-bold tracking-wide text-white">
            锚链估算
          </span>
        </div>
        <div className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-inner shadow-cyan-500/10'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
