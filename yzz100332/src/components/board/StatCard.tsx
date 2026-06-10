import { ReactNode } from "react";

interface Props {
  label: string;
  value: number;
  tone: "gray" | "warn" | "success" | "brand" | "info";
  icon: ReactNode;
  sub?: ReactNode;
  highlight?: boolean;
}

const TONE: Record<Props["tone"], { bg: string; border: string; text: string; accent: string }> = {
  gray: {
    bg: "from-gray-50 to-gray-100",
    border: "border-gray-200",
    text: "text-ink",
    accent: "bg-gray-400 text-white",
  },
  warn: {
    bg: "from-warn/5 to-orange-100/50",
    border: "border-warn/25",
    text: "text-warn-dark",
    accent: "bg-warn text-white",
  },
  success: {
    bg: "from-success/5 to-emerald-100/50",
    border: "border-success/25",
    text: "text-success-dark",
    accent: "bg-success text-white",
  },
  brand: {
    bg: "from-brand-500/5 to-brand-200/30",
    border: "border-brand-500/20",
    text: "text-brand-500",
    accent: "bg-brand-500 text-white",
  },
  info: {
    bg: "from-blue-50 to-sky-100/50",
    border: "border-blue-400/20",
    text: "text-blue-700",
    accent: "bg-blue-500 text-white",
  },
};

export default function StatCard({ label, value, tone, icon, sub, highlight }: Props) {
  const t = TONE[tone];
  return (
    <div
      className={[
        "panel p-5 relative overflow-hidden transition-all",
        `bg-gradient-to-br ${t.bg}`,
        t.border,
        highlight ? "ring-2 ring-warn/40 shadow-[0_8px_24px_rgba(255,122,69,0.15)]" : "",
      ].join(" ")}
    >
      <div
        className={[
          "absolute -right-3 -top-3 w-24 h-24 rounded-full opacity-15 blur-sm",
          t.accent,
        ].join(" ")}
        aria-hidden
      />
      <div className="flex items-start justify-between relative">
        <div className="flex-1">
          <div className="text-xs font-medium text-ink-light tracking-wide">
            {label}
          </div>
          <div className={`font-mono mt-2 flex items-baseline gap-1 ${t.text}`}>
            <span className="text-5xl font-extrabold leading-none">{value}</span>
            <span className="text-xs opacity-60">张</span>
          </div>
          {sub !== undefined && sub !== null && (
            <div className="mt-2 text-xs text-ink-light flex items-center gap-1">
              {sub}
            </div>
          )}
        </div>
        <div
          className={[
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-md",
            t.accent,
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
