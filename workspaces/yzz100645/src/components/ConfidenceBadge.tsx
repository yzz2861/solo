import type { ConfidenceLevel, ConfidenceReason } from "@/types";
import { CONFIDENCE_LABELS, REASON_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { motion } from "framer-motion";

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  reasons?: ConfidenceReason[];
  size?: "sm" | "md";
  showIcon?: boolean;
}

const config = {
  high: {
    className: "badge-high",
    Icon: CheckCircle2,
    ringClass: "ring-emerald-200",
  },
  medium: {
    className: "badge-medium",
    Icon: Info,
    ringClass: "ring-amber-200",
  },
  low: {
    className: "badge-low-pulse",
    Icon: AlertTriangle,
    ringClass: "ring-red-200",
  },
} as const;

export default function ConfidenceBadge({
  confidence,
  reasons = [],
  size = "sm",
  showIcon = true,
}: ConfidenceBadgeProps) {
  const { className, Icon } = config[confidence];
  const label = CONFIDENCE_LABELS[confidence];

  const tooltipContent =
    reasons.length > 0
      ? reasons.map((r) => REASON_LABELS[r]).join(" · ")
      : null;

  const variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
  };

  return (
    <motion.span
      variants={variants}
      initial="initial"
      animate="animate"
      className={cn(
        className,
        "inline-flex items-center gap-1 whitespace-nowrap select-none",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
      title={tooltipContent || undefined}
    >
      {showIcon && <Icon size={size === "sm" ? 12 : 14} />}
      {label}
      {reasons.length > 0 && size === "md" && (
        <span className="opacity-70 ml-1">({reasons.length})</span>
      )}
    </motion.span>
  );
}

export function ReasonTagList({ reasons }: { reasons: ConfidenceReason[] }) {
  if (!reasons.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map((r, i) => (
        <span
          key={r + i}
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ring-inset",
            r === "direct_statement" &&
              "bg-emerald-50 text-emerald-700 ring-emerald-200",
            r === "manual_override" &&
              "bg-sky-50 text-sky-700 ring-sky-200",
            (r === "forward_chain" ||
              r === "screenshot_ocr" ||
              r === "vague_time" ||
              r === "context_revocation") &&
              "bg-red-50 text-red-700 ring-red-200"
          )}
        >
          {REASON_LABELS[r]}
        </span>
      ))}
    </div>
  );
}
