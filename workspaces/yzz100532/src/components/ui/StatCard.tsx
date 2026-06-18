import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type StatCardVariant = "cyan" | "orange" | "green" | "red";

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  variant?: StatCardVariant;
  className?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
}

const variantStyles: Record<StatCardVariant, {
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
  shadow: string;
}> = {
  cyan: {
    gradient: "bg-gradient-to-br from-tech-cyan/10 to-tech-cyan-dark/5",
    border: "border-tech-cyan/30",
    iconBg: "bg-tech-cyan/20",
    iconColor: "text-tech-cyan",
    shadow: "hover:shadow-glow-cyan",
  },
  orange: {
    gradient: "bg-gradient-to-br from-warning-orange/10 to-warning-orange-dark/5",
    border: "border-warning-orange/30",
    iconBg: "bg-warning-orange/20",
    iconColor: "text-warning-orange",
    shadow: "hover:shadow-glow-orange",
  },
  green: {
    gradient: "bg-gradient-to-br from-safety-green/10 to-safety-green-dark/5",
    border: "border-safety-green/30",
    iconBg: "bg-safety-green/20",
    iconColor: "text-safety-green",
    shadow: "hover:shadow-glow-green",
  },
  red: {
    gradient: "bg-gradient-to-br from-alert-red/10 to-alert-red-dark/5",
    border: "border-alert-red/30",
    iconBg: "bg-alert-red/20",
    iconColor: "text-alert-red",
    shadow: "hover:shadow-glow-red",
  },
};

export function StatCard({
  icon,
  value,
  label,
  variant = "cyan",
  className,
  trend,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative p-5 rounded border",
        "backdrop-blur-sm",
        "transition-all duration-300",
        "overflow-hidden",
        styles.gradient,
        styles.border,
        styles.shadow,
        className
      )}
    >
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32",
          "rounded-full blur-3xl opacity-20",
          variant === "cyan" && "bg-tech-cyan",
          variant === "orange" && "bg-warning-orange",
          variant === "green" && "bg-safety-green",
          variant === "red" && "bg-alert-red"
        )}
        style={{ transform: "translate(30%, -30%)" }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              styles.iconBg,
              styles.iconColor
            )}
          >
            {icon}
          </div>

          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.isUp ? "text-safety-green" : "text-alert-red"
              )}
            >
              <span>{trend.isUp ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <motion.p
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold font-orbitron text-white tracking-wider"
          >
            {value}
          </motion.p>
          <p className="mt-1 text-sm text-gray-400">{label}</p>
        </div>
      </div>

      <div className={cn("absolute bottom-0 left-0 right-0 h-0.5", styles.iconColor)}>
        <motion.div
          className="h-full bg-current opacity-50"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
}
