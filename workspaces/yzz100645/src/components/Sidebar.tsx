import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MailPlus,
  ClipboardList,
  Link2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Package2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useCommitmentStore } from "@/stores/commitmentStore";

const navItems = [
  {
    path: "/",
    label: "工作台",
    icon: LayoutDashboard,
    badgeKey: "pending",
  },
  {
    path: "/email/import",
    label: "邮件导入",
    icon: MailPlus,
  },
  {
    path: "/commitments/pending",
    label: "承诺抽取",
    icon: ClipboardList,
    badgeKey: "pending",
  },
  {
    path: "/orders/link",
    label: "订单关联",
    icon: Link2,
    badgeKey: "unlinked",
  },
  {
    path: "/commitments/export",
    label: "承诺表导出",
    icon: FileSpreadsheet,
  },
] as const;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, setActiveRoute } = useUIStore();
  const pendingCount = useCommitmentStore((s) => s.getPendingCount());
  const unlinkedCount = useCommitmentStore((s) => s.getUnlinkedCount());

  const handleNav = (path: string) => {
    setActiveRoute(path);
    navigate(path);
  };

  const getBadgeCount = (key?: string) => {
    if (key === "pending") return pendingCount;
    if (key === "unlinked") return unlinkedCount;
    return 0;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 72 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative h-screen flex-shrink-0 bg-gradient-to-b from-steel-800 to-steel-900 text-white flex flex-col shadow-xl"
      >
        <div className="h-16 flex items-center gap-3 px-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-steel-500 to-amber-custom flex items-center justify-center shadow-lg shadow-steel-700/50 flex-shrink-0">
            <Package2 size={20} className="text-white" />
          </div>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="overflow-hidden"
            >
              <h1 className="font-serif text-base font-semibold tracking-wide leading-tight">
                承诺抽取
              </h1>
              <p className="text-xs text-steel-300 mt-0.5">Supplier Commitment</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const badgeCount = getBadgeCount((item as { badgeKey?: string }).badgeKey);
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="relative"
              >
                <button
                  onClick={() => handleNav(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/10 text-white shadow-inner"
                      : "text-steel-200 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-amber-custom transition-opacity duration-200",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Icon
                    size={18}
                    className={cn(
                      "flex-shrink-0",
                      isActive ? "text-amber-custom" : ""
                    )}
                  />
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 text-left truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {sidebarOpen && badgeCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold rounded-full bg-confidence-low text-white animate-pulse-soft">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                  {!sidebarOpen && badgeCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-confidence-low" />
                  )}
                </button>
              </motion.div>
            );
          })}
        </nav>

        <button
          onClick={toggleSidebar}
          className="h-12 border-t border-white/10 flex items-center justify-center text-steel-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </motion.aside>
    </AnimatePresence>
  );
}
