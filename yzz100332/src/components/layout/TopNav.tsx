import { NavLink } from "react-router-dom";
import {
  ClipboardEdit,
  Printer,
  LayoutGrid,
  CircleDot,
  User,
  Calendar,
  HardDriveDownload,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useState } from "react";
import { todayStr } from "@/utils/id";

export default function TopNav() {
  const saveStatus = useAppStore((s) => s.saveStatus);
  const currentOperator = useAppStore((s) => s.currentOperator);
  const tags = useAppStore((s) => s.tags);
  const setOperator = useAppStore((s) => s.setOperator);

  const countConfirmed = tags.filter((t) => t.status === "confirmed").length;
  const countPrinted = tags.filter((t) => t.status === "printed").length;
  const countDraft = tags.filter((t) => t.status === "draft").length;

  const [editing, setEditing] = useState(false);
  const [opName, setOpName] = useState(currentOperator || "");

  useEffect(() => {
    setOpName(currentOperator || "");
  }, [currentOperator]);

  const light =
    saveStatus.status === "saved"
      ? "bg-success animate-save-pulse"
      : saveStatus.status === "saving"
      ? "bg-yellow-400 animate-pulse"
      : saveStatus.status === "failed"
      ? "bg-danger animate-pulse"
      : "bg-white/30";

  const today = todayStr();
  const dateLabel = new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <header className="bg-brand-500 border-b border-white/10 text-white px-6 py-3 flex items-center gap-6 no-print">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-300 to-brand-500 border-2 border-white/20 flex items-center justify-center text-2xl shadow-md">
          🍎
        </div>
        <div className="flex flex-col leading-tight">
          <h1 className="font-display text-2xl tracking-wide text-white">
            鲜果价签通
          </h1>
          <span className="text-xs text-white/50 font-mono">
            FRUIT TAG CHECK v1.0
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-1 ml-2">
        {[
          { to: "/", label: "工作台", icon: ClipboardEdit },
          { to: "/print", label: "打印台", icon: Printer },
          { to: "/board", label: "交班看板", icon: LayoutGrid },
        ].map(({ to, label, icon: I }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all",
                isActive
                  ? "bg-white/15 text-white border border-white/20 shadow-press"
                  : "text-white/70 hover:text-white hover:bg-white/8",
              ].join(" ")
            }
          >
            <I size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 flex items-center justify-end gap-5">
        <div className="hidden md:flex items-center gap-1.5 text-sm text-white/60">
          <Calendar size={14} />
          <span>{dateLabel}</span>
          <span className="font-mono text-white/40 text-xs ml-1">{today}</span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-danger/20 text-danger-light border border-danger/30">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" /> 草稿 {countDraft}
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-warn/20 text-warn-light border border-warn/30">
            <span className="w-1.5 h-1.5 rounded-full bg-warn" /> 待打印 {countConfirmed}
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded bg-success/20 text-success-light border border-success/30">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> 已打印 {countPrinted}
          </span>
        </div>

        <div className="flex items-center gap-2 group relative">
          <CircleDot size={10} className={[light, "rounded-full"].join(" ")} />
          <span className="text-xs text-white/60 hidden lg:inline">
            {saveStatus.status === "saved"
              ? "已保存"
              : saveStatus.status === "saving"
              ? "保存中"
              : saveStatus.status === "failed"
              ? "保存失败"
              : "草稿就绪"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                className="w-24 px-2 py-1 rounded bg-white/10 border border-white/20 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                placeholder="店员姓名"
                value={opName}
                onChange={(e) => setOpName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && opName.trim()) {
                    setOperator(opName.trim());
                    setEditing(false);
                  }
                }}
                autoFocus
              />
              <button
                className="btn-ghost !py-1 !px-2 text-xs"
                onClick={() => {
                  if (opName.trim()) {
                    setOperator(opName.trim());
                    setEditing(false);
                  }
                }}
              >
                <HardDriveDownload size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/8 border border-white/15 text-sm text-white/80 hover:bg-white/15 hover:text-white transition-colors"
            >
              <User size={14} />
              <span className="max-w-[80px] truncate">
                {currentOperator || "设置姓名"}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
