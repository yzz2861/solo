import * as React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useInventoryStore, type ToastMessage } from "../../store/inventory";

type ToastType = ToastMessage["type"];

const toastConfig: Record<
  ToastType,
  { icon: React.ElementType; bg: string; border: string; iconColor: string; iconBg: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: "bg-white",
    border: "border-success-200",
    iconColor: "text-success-600",
    iconBg: "bg-success-50",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-white",
    border: "border-danger-200",
    iconColor: "text-danger-600",
    iconBg: "bg-danger-50",
  },
  info: {
    icon: Info,
    bg: "bg-white",
    border: "border-medical-200",
    iconColor: "text-medical-600",
    iconBg: "bg-medical-50",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-white",
    border: "border-warning-200",
    iconColor: "text-warning-600",
    iconBg: "bg-warning-50",
  },
};

interface ToastItemProps {
  toast: ToastMessage;
  onClose: () => void;
  index: number;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose, index }) => {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-full max-w-sm rounded-xl border shadow-popover p-4",
        config.bg,
        config.border,
        "animate-slide-up"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      role="alert"
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center",
          config.iconBg
        )}
      >
        <Icon size={18} className={config.iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 leading-5 break-words">
          {toast.message}
        </p>
      </div>

      <button
        onClick={onClose}
        className="shrink-0 w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors -mr-1 -mt-1"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useInventoryStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast, index) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onClose={() => removeToast(toast.id)}
            index={index}
          />
        </div>
      ))}
    </div>
  );
};

export function useToast() {
  const addToast = useInventoryStore((state) => state.addToast);

  return {
    success: (message: string, duration?: number) =>
      addToast({ type: "success", message, duration }),
    error: (message: string, duration?: number) =>
      addToast({ type: "error", message, duration }),
    info: (message: string, duration?: number) =>
      addToast({ type: "info", message, duration }),
    warning: (message: string, duration?: number) =>
      addToast({ type: "warning", message, duration }),
    custom: (toast: Omit<ToastMessage, "id">) => addToast(toast),
  };
}

export { ToastItem };
