import type { OrderStatus } from "@/types";
import { STATUS_CONFIG } from "@/utils/constants";

interface StatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses[size]} font-medium ${config.color} ${config.bgColor}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
      {config.label}
    </span>
  );
}
