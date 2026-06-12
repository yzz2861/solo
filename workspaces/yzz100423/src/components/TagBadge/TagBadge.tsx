import type { DefectType } from "@/types";
import { DEFECT_TYPE_CONFIG } from "@/utils/constants";

interface TagBadgeProps {
  type: DefectType;
  confidence?: number;
  size?: "sm" | "md";
  showConfidence?: boolean;
}

export default function TagBadge({
  type,
  confidence,
  size = "md",
  showConfidence = true,
}: TagBadgeProps) {
  const config = DEFECT_TYPE_CONFIG[type];

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded ${sizeClasses[size]} font-medium ${config.color} ${config.lightBg} border ${config.borderColor} border-opacity-30`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.bgColor}`}></span>
      {config.label}
      {showConfidence && confidence !== undefined && (
        <span className="opacity-70 text-xs">{confidence}%</span>
      )}
    </span>
  );
}
