import * as React from "react";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger" | "outline";
type BadgeSize = "sm" | "md" | "lg";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-medical-100 text-medical-700 border-medical-200",
  secondary: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-success-100 text-success-700 border-success-200",
  warning: "bg-warning-100 text-warning-700 border-warning-200",
  danger: "bg-danger-100 text-danger-700 border-danger-200",
  outline: "bg-transparent text-slate-700 border-slate-300",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 font-medium rounded-md border transition-colors",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export type { BadgeVariant, BadgeSize };
