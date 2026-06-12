import { useState } from "react";
import { NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  FileDown,
  CalendarClock,
  UserRound,
  ChevronDown,
  Menu,
  X,
  Stethoscope,
  ShieldCheck,
  UserCog,
  Warehouse,
  Search,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useInventoryStore, type UserRole } from "../store/inventory";

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: "管理员", icon: ShieldCheck, color: "text-purple-600 bg-purple-50" },
  doctor: { label: "医生", icon: Stethoscope, color: "text-medical-600 bg-medical-50" },
  nurse: { label: "护士", icon: UserCog, color: "text-success-600 bg-success-50" },
  warehouse: { label: "仓管", icon: Warehouse, color: "text-warning-600 bg-warning-50" },
};

const navItems = [
  {
    to: "/",
    label: "库存总览",
    icon: LayoutDashboard,
  },
  {
    to: "/register",
    label: "附件登记",
    icon: ClipboardList,
  },
  {
    to: "/inventory",
    label: "库存管理",
    icon: Package,
  },
  {
    to: "/reports",
    label: "导出报表",
    icon: FileDown,
  },
  {
    to: "/tomorrow",
    label: "明日预配",
    icon: CalendarClock,
  },
  {
    to: "/patients",
    label: "患者详情",
    icon: UserRound,
  },
];

export function Layout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedRole, setSelectedRole, searchQuery, setSearchQuery } = useInventoryStore();

  const currentRole = roleConfig[selectedRole];
  const RoleIcon = currentRole.icon;

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setRoleDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-0 lg:w-20"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-medical-500 to-medical-700 flex items-center justify-center text-white shadow-md shrink-0">
              <Stethoscope size={22} />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-base">口腔附件库存台</span>
                <span className="text-xs text-slate-500">Dental Inventory System</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "sidebar-item",
                  isActive && "sidebar-item-active",
                  !sidebarOpen && "lg:justify-center lg:px-0"
                )}
                onClick={() => {
                  if (item.to === "/patients" && searchQuery) {
                    navigate(`/patients?search=${encodeURIComponent(searchQuery)}`);
                  }
                }}
              >
                <Icon size={20} className="shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                <UserRound size={20} className="text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">系统用户</p>
                <span className={cn("text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full", currentRole.color)}>
                  <RoleIcon size={12} />
                  {currentRole.label}
                </span>
              </div>
            </div>
          ) : (
            <div className="lg:flex justify-center hidden">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                <UserRound size={20} className="text-slate-600" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4 shrink-0 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索患者姓名、附件编号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center", currentRole.color)}>
                  <RoleIcon size={16} />
                </span>
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">{currentRole.label}</span>
                <ChevronDown size={16} className="text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-popover p-1 animate-slide-down z-50">
                  {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                    const cfg = roleConfig[role];
                    const Icon = cfg.icon;
                    const isSelected = selectedRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(role)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                          isSelected
                            ? "bg-medical-50 text-medical-700"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.color)}>
                          <Icon size={16} />
                        </span>
                        <span className="font-medium">{cfg.label}</span>
                        {isSelected && (
                          <ShieldCheck size={16} className="ml-auto text-medical-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <div className="animate-fade-in">{children ?? <Outlet />}</div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
