import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Download,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "主控制台",
    icon: <LayoutDashboard size={20} />,
    path: "/",
  },
  {
    id: "scenarios",
    label: "方案管理",
    icon: <FileText size={20} />,
    path: "/scenarios",
  },
  {
    id: "export",
    label: "预案导出",
    icon: <Download size={20} />,
    path: "/export",
  },
  {
    id: "records",
    label: "演练记录",
    icon: <History size={20} />,
    path: "/records",
  },
];

interface SidebarProps {
  className?: string;
  defaultCollapsed?: boolean;
}

export function Sidebar({ className, defaultCollapsed = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "relative h-screen flex flex-col",
        "bg-gradient-to-b from-mine-blue-dark to-mine-blue",
        "border-r border-tech-cyan/30",
        "shadow-lg",
        className
      )}
    >
      <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-tech-cyan/0 via-tech-cyan/20 to-tech-cyan/0" />

      <div className="relative flex items-center justify-between h-16 px-4 border-b border-tech-cyan/30">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded bg-tech-cyan/20 flex items-center justify-center">
                <span className="text-tech-cyan font-orbitron font-bold text-sm">M</span>
              </div>
              <span className="font-orbitron font-bold text-tech-cyan text-sm tracking-wider">
                MINE ERP
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-10 h-10 rounded bg-tech-cyan/20 flex items-center justify-center">
              <span className="text-tech-cyan font-orbitron font-bold">M</span>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-3 py-3 rounded",
                "transition-all duration-300",
                "group",
                isActive
                  ? "bg-tech-cyan/10 text-tech-cyan"
                  : "text-gray-400 hover:text-tech-cyan hover:bg-tech-cyan/5"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-tech-cyan rounded-r"
                    style={{ boxShadow: "0 0 10px rgba(0, 212, 255, 0.8)" }}
                  />
                )}

                <div
                  className={cn(
                    "relative",
                    isActive && "drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]"
                  )}
                >
                  {item.icon}
                </div>

                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-orbitron text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-tech-cyan/30">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded text-gray-400 hover:text-tech-cyan hover:bg-tech-cyan/5 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium"
              >
                收起菜单
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tech-cyan" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-tech-cyan" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-tech-cyan" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-tech-cyan" />
    </motion.aside>
  );
}
