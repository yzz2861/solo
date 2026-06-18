import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ConflictAlert } from "@/types";

const TYPE_MAP = {
  error: {
    icon: AlertCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    iconCls: "text-red-500",
    title: "text-red-800",
    detail: "text-red-700",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconCls: "text-amber-500",
    title: "text-amber-800",
    detail: "text-amber-700",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconCls: "text-blue-500",
    title: "text-blue-800",
    detail: "text-blue-700",
  },
};

export default function ConflictBanner({ alerts }: { alerts: ConflictAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in-up">
      {alerts.map((a, i) => {
        const cfg = TYPE_MAP[a.type];
        const Icon = cfg.icon;
        return (
          <div
            key={i}
            className={`${cfg.bg} ${cfg.border} border rounded-xl p-3 animate-shake`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start gap-2.5">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconCls}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold ${cfg.title}`}>{a.title}</div>
                <div className={`text-[11px] mt-0.5 ${cfg.detail} opacity-90`}>
                  {a.detail}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CollapsibleAlertSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {open && <div className="p-3 bg-white border-t border-gray-100">{children}</div>}
    </div>
  );
}
