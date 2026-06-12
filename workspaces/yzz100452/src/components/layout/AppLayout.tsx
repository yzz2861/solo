import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PackagePlus,
  CalendarClock,
  ScanEye,
  ClipboardList,
  Scale,
  ScrollText,
  Receipt,
  Package,
  Wallet,
  LogOut,
  ChevronDown,
  Camera,
  User as UserIcon,
  type LucideIcon,
  Boxes,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, ROLE_DISPLAY, type UserRole } from "@/store/authStore";

interface MenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const ROLE_MENUS: Record<UserRole, MenuItem[]> = {
  clerk: [
    { to: "/clerk/dashboard", label: "工作台", icon: LayoutDashboard },
    { to: "/clerk/equipment", label: "设备管理", icon: Boxes },
    { to: "/clerk/equipment/new", label: "设备入库", icon: PackagePlus },
    { to: "/clerk/appointments", label: "预约管理", icon: CalendarClock },
  ],
  inspector: [
    { to: "/inspector/workbench", label: "检测工作台", icon: ScanEye },
    { to: "/inspector/workbench", label: "待检队列", icon: ClipboardList },
  ],
  manager: [
    { to: "/manager/price-audit", label: "调价审批", icon: Scale },
    { to: "/manager/audit-log", label: "审计日志", icon: ScrollText },
    { to: "/manager/settlement", label: "成交结算", icon: Receipt },
  ],
  consignor: [
    { to: "/consignor/portal", label: "我的设备", icon: Package },
    { to: "/consignor/fees", label: "扣费明细", icon: Wallet },
  ],
  buyer: [],
};

const BRASS_GRADIENT = "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)";

export default function AppLayout() {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const menus = currentUser ? ROLE_MENUS[currentUser.role] : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const activeIndex = menus.findIndex((m) => m.to === location.pathname);

  return (
    <div className="h-screen w-screen flex flex-col bg-space-950 overflow-hidden">
      <style>{`
        .nav-indicator {
          position: absolute;
          left: 8px;
          right: 8px;
          height: 40px;
          border-radius: 6px;
          background: linear-gradient(135deg, rgba(224,185,110,0.18) 0%, rgba(147,112,61,0.18) 100%);
          border: 1px solid rgba(201,169,110,0.4);
          box-shadow: 0 0 12px rgba(201,169,110,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
          pointer-events: none;
          transition: transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
          z-index: 0;
        }
        .nav-indicator::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          border-radius: 0 2px 2px 0;
          background: ${BRASS_GRADIENT};
          box-shadow: 0 0 8px rgba(201,169,110,0.6);
        }
      `}</style>

      <header
        className="flex items-center justify-between px-5 border-b border-brass/15 backdrop-blur-sm"
        style={{
          height: "52px",
          background:
            "linear-gradient(180deg, rgba(26,29,35,0.98) 0%, rgba(22,25,30,0.98) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-md"
            style={{
              width: 34,
              height: 34,
              background: BRASS_GRADIENT,
              boxShadow: "0 0 14px rgba(201,169,110,0.4)",
            }}
          >
            <Camera className="w-[18px] h-[18px] text-space-950" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="font-mono font-bold text-[15px] tracking-wide"
              style={{
                background: BRASS_GRADIENT,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              镜头銘
            </span>
            <span className="text-[10px] text-space-400 font-mono mt-1 tracking-wider">
              LENS · INSCRIPTION
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-brass-gradient-subtle border border-brass/20">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: BRASS_GRADIENT, boxShadow: "0 0 6px rgba(201,169,110,0.8)" }}
            />
            <span className="text-[12px] font-medium text-brass-300 tracking-wide">
              {currentUser ? ROLE_DISPLAY[currentUser.role] : "未登录"}
            </span>
          </div>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-space-600 bg-space-800/60 hover:border-brass/40 hover:bg-space-800 transition-all duration-150"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: BRASS_GRADIENT }}
              >
                <UserIcon className="w-[14px] h-[14px] text-space-950" strokeWidth={2.2} />
              </div>
              <span className="text-[13px] text-space-200 font-medium">
                {currentUser?.displayName || "用户"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-space-400 transition-transform duration-200 ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 w-48 rounded-md border border-brass/20 bg-space-900/98 backdrop-blur-sm shadow-xl overflow-hidden z-50"
                  style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,110,0.08)" }}
                >
                  <div className="px-4 py-3 border-b border-space-700/80">
                    <div className="text-[13px] font-medium text-space-100">
                      {currentUser?.displayName}
                    </div>
                    <div className="text-[11px] text-space-400 mt-0.5 font-mono">
                      @{currentUser?.username}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-signal-red hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          ref={sidebarRef}
          className="flex flex-col border-r border-brass/10 overflow-hidden"
          style={{
            width: 220,
            background:
              "linear-gradient(180deg, rgba(22,25,30,0.98) 0%, rgba(18,21,26,0.98) 100%)",
          }}
        >
          <div className="px-4 py-4 border-b border-space-700/60">
            <div className="text-[10px] font-mono uppercase tracking-widest text-space-500 mb-1">
              Navigation
            </div>
            <div className="h-px divider-brass" />
          </div>

          <nav className="flex-1 px-2 py-3 relative overflow-y-auto scrollbar-thin">
            {activeIndex >= 0 && (
              <div
                className="nav-indicator"
                style={{
                  transform: `translateY(${activeIndex * 48 + 4}px)`,
                }}
              />
            )}
            <ul className="relative space-y-1">
              {menus.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to} style={{ height: 48 }}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 h-[40px] mx-2 px-3 rounded-md z-10 transition-colors duration-200 ${
                          isActive
                            ? "text-brass-200"
                            : "text-space-400 hover:text-space-200"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className="w-[18px] h-[18px] flex-shrink-0"
                            strokeWidth={isActive ? 2.1 : 1.8}
                          />
                          <span className="text-[13px] font-medium tracking-wide">
                            {item.label}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="px-4 py-3 border-t border-space-700/60">
            <div className="text-[10px] font-mono text-space-500">
              v1.0.0 · BUILD 202606
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
          <div className="min-h-full p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
