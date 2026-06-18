import { useStore } from "@/store";
import { CheckCircle2, XCircle, Info, X, AlertTriangle } from "lucide-react";

const TYPE_MAP = {
  success: {
    icon: CheckCircle2,
    iconCls: "text-emerald-500",
    bg: "bg-white",
    border: "border-emerald-100",
    bar: "bg-emerald-400",
  },
  error: {
    icon: XCircle,
    iconCls: "text-red-500",
    bg: "bg-white",
    border: "border-red-100",
    bar: "bg-red-400",
  },
  info: {
    icon: Info,
    iconCls: "text-blue-500",
    bg: "bg-white",
    border: "border-blue-100",
    bar: "bg-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    iconCls: "text-amber-500",
    bg: "bg-white",
    border: "border-amber-100",
    bar: "bg-amber-400",
  },
};

export default function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const cfg = TYPE_MAP[t.type];
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className={`${cfg.bg} ${cfg.border} border rounded-xl shadow-soft-lg pointer-events-auto overflow-hidden animate-toast-in`}
          >
            <div className={`h-1 w-full ${cfg.bar}`} />
            <div className="px-3.5 py-3 flex items-start gap-2.5">
              <Icon className={`w-4.5 h-4.5 mt-0.5 shrink-0 ${cfg.iconCls}`} />
              <div className="flex-1 min-w-0 text-sm text-gray-700 pt-0.5">
                {t.message}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0 -mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
