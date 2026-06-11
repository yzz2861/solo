import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { usePriceStore } from "@/store/usePriceStore";
import { Mic, ShieldCheck, FileText, History, Store } from "lucide-react";

const NAV_ITEMS = [
  { to: "/input", label: "数据录入", icon: Mic },
  { to: "/verify", label: "纠错校验", icon: ShieldCheck },
  { to: "/broadcast", label: "广播稿", icon: FileText },
  { to: "/history", label: "留痕追溯", icon: History },
];

export default function Layout() {
  const initStore = usePriceStore((s) => s.initStore);
  const session = usePriceStore((s) => s.getCurrentSession());

  useEffect(() => {
    initStore();
  }, [initStore]);

  const pendingCount = session?.items.filter((i) => i.status === "pending").length || 0;
  const vendorCount = session?.items.filter((i) => i.status === "ask_vendor").length || 0;

  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      <header className="bg-[#3D2B1F] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-7 h-7 text-orange-400" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">农贸价格播报纠错</h1>
              <p className="text-stone-400 text-xs">口述 · 价签 · 昨日 — 三源比价，智能纠错</p>
            </div>
          </div>
          {session && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-stone-400">{session.date}</span>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 bg-amber-600 text-white rounded-full text-xs font-medium">
                  {pendingCount}待确认
                </span>
              )}
              {vendorCount > 0 && (
                <span className="px-2.5 py-0.5 bg-orange-600 text-white rounded-full text-xs font-medium">
                  {vendorCount}待问摊主
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                session.status === "published" ? "bg-green-600" :
                session.status === "verified" ? "bg-blue-600" :
                "bg-stone-600"
              }`}>
                {session.status === "published" ? "已发布" : session.status === "verified" ? "已定稿" : "草稿"}
              </span>
            </div>
          )}
        </div>
      </header>

      <nav className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? "text-orange-600 border-orange-500"
                    : "text-stone-500 border-transparent hover:text-stone-700 hover:border-stone-300"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-xs text-stone-400">
          农贸价格播报纠错系统 · 改价留痕，次日可追溯
        </div>
      </footer>
    </div>
  );
}
