import { Link, useLocation, Outlet } from "react-router-dom"
import { Train, Edit3, BarChart3 } from "lucide-react"

const navItems = [
  { path: "/", label: "首页", icon: Train },
  { path: "/editor", label: "关卡编辑", icon: Edit3 },
  { path: "/scores", label: "成绩管理", icon: BarChart3 },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#1a1f36] text-gray-100">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#1a1f36]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-wide">
            <Train className="h-6 w-6 text-[#457b9d]" />
            <span className="bg-gradient-to-r from-[#457b9d] to-[#2a9d8f] bg-clip-text text-transparent">
              换乘调度
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon
              const active = location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path))
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
