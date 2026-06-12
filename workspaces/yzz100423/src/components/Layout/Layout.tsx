import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Camera,
  ClipboardCheck,
  ShieldCheck,
  FileBarChart,
  Settings,
  Wrench,
  Bell,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "工单列表", icon: LayoutDashboard },
  { to: "/screening/new", label: "照片初筛", icon: Camera },
  { to: "/quality", label: "质检工作台", icon: ShieldCheck },
  { to: "/report", label: "报告导出", icon: FileBarChart },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 bg-navy-800 text-white flex flex-col shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">缺陷初筛系统</h1>
              <p className="text-xs text-navy-300">AI 智能辅助</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-900/30"
                    : "text-navy-200 hover:bg-navy-700 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-navy-700">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-navy-700 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">客服小王</p>
              <p className="text-xs text-navy-400 truncate">售后服务组</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {getPageTitle(location.pathname)}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "工单列表";
  if (pathname.startsWith("/screening")) return "照片初筛";
  if (pathname.startsWith("/review")) return "客服审核";
  if (pathname.startsWith("/quality")) return "质检工作台";
  if (pathname.startsWith("/report")) return "报告导出";
  return "维修照片缺陷初筛";
}
