import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Mic, BarChart3, Bookmark, User, GraduationCap, Moon, Sun } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useTheme } from '@/hooks/useTheme'

const navItems = [
  { to: '/review', icon: Mic, label: '练习复盘' },
  { to: '/compare', icon: BarChart3, label: '多周对比' },
  { to: '/marks', icon: Bookmark, label: '重点标记' },
]

export default function Layout() {
  const { role, setRole } = useAppStore()
  const { theme, toggleTheme, isDark } = useTheme()
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-canvas dark:bg-canvas-dark">
      <aside className="w-[220px] shrink-0 flex flex-col bg-navy dark:bg-navy-dark text-white">
        <div className="px-5 py-6">
          <h1 className="font-display text-xl font-bold">
            <span className="text-amber">♪</span> 音高复盘
          </h1>
          <p className="text-[10px] text-white/30 mt-1 tracking-wider">VOCAL PITCH REVIEW</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setRole('teacher')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                role === 'teacher'
                  ? 'bg-amber text-navy'
                  : 'bg-white/5 text-white/40 hover:text-white/70'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              老师
            </button>
            <button
              onClick={() => setRole('student')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                role === 'student'
                  ? 'bg-amber text-navy'
                  : 'bg-white/5 text-white/40 hover:text-white/70'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              学生
            </button>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/40 hover:text-white/70 transition-all"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {isDark ? '浅色模式' : '深色模式'}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
