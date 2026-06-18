import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import {
  LayoutDashboard,
  ClipboardPlus,
  ListChecks,
  Truck,
  FileSpreadsheet,
  ChevronDown,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/useStore"

const navItems = [
  { to: "/", label: "工作台", icon: LayoutDashboard },
  { to: "/register", label: "登记", icon: ClipboardPlus },
  { to: "/orders", label: "工单", icon: ListChecks },
  { to: "/recycling", label: "回收", icon: Truck },
  { to: "/finance", label: "财务", icon: FileSpreadsheet },
]

const roles = [
  { value: "clerk" as const, label: "店员" },
  { value: "reviewer" as const, label: "审核员" },
  { value: "technician" as const, label: "师傅" },
  { value: "finance" as const, label: "财务" },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { currentRole, setCurrentRole } = useStore()

  return (
    <div className="flex h-screen overflow-hidden bg-surface-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-dark-200 transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-bold text-white font-serif">以旧换新台</h1>
            <p className="mt-0.5 text-xs text-dark-50">家电门店管理</p>
          </div>
          <button
            className="text-dark-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "active bg-brand-500 text-white"
                    : "text-dark-50 hover:bg-dark-100 hover:text-white"
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-dark-100 px-4 py-4">
          <div className="relative">
            <select
              value={currentRole}
              onChange={(e) =>
                setCurrentRole(e.target.value as typeof currentRole)
              }
              className="w-full appearance-none rounded-lg bg-dark-100 px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-50"
            />
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b border-surface-200 bg-white px-4 lg:px-6">
          <button
            className="mr-3 text-dark-200 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <span className="text-sm text-dark-50">
            {roles.find((r) => r.value === currentRole)?.label}模式
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
