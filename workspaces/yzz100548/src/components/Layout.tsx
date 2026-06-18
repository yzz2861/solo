import { NavLink, useLocation } from "react-router-dom";
import {
  Users,
  Layers,
  FileDown,
  ClipboardList,
  Building2,
  GraduationCap,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentRole, setCurrentRole } = useAppStore();

  const navItems = [
    { path: "/students", label: "信息录入", icon: Users },
    { path: "/groups", label: "分组管理", icon: Layers },
    { path: "/export", label: "导出中心", icon: FileDown },
    { path: "/followup", label: "跟进管理", icon: ClipboardList },
  ];

  if (currentRole === "年级组长") {
    navItems.push({ path: "/grade-view", label: "年级总览", icon: Building2 });
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-neutral-200 flex flex-col">
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg text-neutral-800">
                家长会分组
              </h1>
              <p className="text-xs text-neutral-500">座谈管理系统</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-neutral-100">
          <label className="text-xs text-neutral-500 mb-2 block">当前身份</label>
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
            <button
              onClick={() => setCurrentRole("班主任")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                currentRole === "班主任"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              班主任
            </button>
            <button
              onClick={() => setCurrentRole("年级组长")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                currentRole === "年级组长"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              年级组长
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary-500 text-white shadow-md shadow-primary-500/25"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <div className="text-xs text-neutral-400 text-center">
            三年级(1)班 · 2026春季
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
