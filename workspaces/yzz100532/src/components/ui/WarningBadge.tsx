import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type WarningLevel = "warning" | "danger" | "info";

interface WarningBadgeProps {
  level?: WarningLevel;
  children: ReactNode;
  className?: string;
  pulse?: boolean;
  icon?: ReactNode;
}

const levelConfig: Record<WarningLevel, {
  bg: string;
  border: string;
  text: string;
  shadow: string;
  icon: ReactNode;
}> = {
  warning: {
    bg: "bg-warning-orange/10",
    border: "border-warning-orange",
    text: "text-warning-orange",
    shadow: "shadow-glow-orange",
    icon: <AlertTriangle size={14} />,
  },
  danger: {
    bg: "bg-alert-red/10",
    border: "border-alert-red",
    text: "text-alert-red",
    shadow: "shadow-glow-red",
    icon: <AlertCircle size={14} />,
  },
  info: {
    bg: "bg-tech-cyan/10",
    border: "border-tech-cyan",
    text: "text-tech-cyan",
    shadow: "shadow-glow-cyan",
    icon: <Info size={14} />,
  },
};

export function WarningBadge({
  level = "info",
  children,
  className,
  pulse = true,
  icon,
}: WarningBadgeProps) {
  const config = levelConfig[level];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1",
        "border rounded-sm",
        "font-orbitron text-xs font-medium",
        "backdrop-blur-sm",
        config.bg,
        config.border,
        config.text,
        pulse && config.shadow,
        className
      )}
    >
      <motion.span
        animate={pulse ? {
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {icon || config.icon}
      </motion.span>
      <span>{children}</span>
    </motion.div>
  );
}
