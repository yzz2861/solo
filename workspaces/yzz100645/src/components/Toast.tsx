import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

const colorMap = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  info: "bg-steel-600",
} as const;

const ringMap = {
  success: "ring-emerald-200",
  error: "ring-red-200",
  info: "ring-steel-200",
} as const;

export default function Toast() {
  const { toast, hideToast } = useUIStore();
  const { open, type, message } = toast;
  const Icon = iconMap[type];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-6 left-1/2 z-[100] max-w-md"
        >
          <div
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl ring-1",
              "bg-white/95 backdrop-blur-md",
              ringMap[type]
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-md",
                colorMap[type]
              )}
            >
              <Icon size={16} />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-medium text-steel-800">{message}</p>
            </div>
            <button
              onClick={hideToast}
              className="p-1 rounded-lg hover:bg-steel-100 text-steel-400 hover:text-steel-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
