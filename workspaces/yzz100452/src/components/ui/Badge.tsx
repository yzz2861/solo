import * as React from "react";
import { cn } from "../../utils/cn";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success:
    "bg-signal-green/15 text-signal-green border-signal-green/35",
  warning:
    "bg-signal-orange/15 text-signal-orange border-signal-orange/35",
  danger:
    "bg-signal-red/15 text-signal-red border-signal-red/35",
  info:
    "bg-signal-blue/15 text-signal-blue border-signal-blue/35",
  neutral:
    "bg-space-600/40 text-space-300 border-space-500/35",
};

const dotStyles: Record<BadgeVariant, string> = {
  success: "bg-signal-green",
  warning: "bg-signal-orange",
  danger: "bg-signal-red",
  info: "bg-signal-blue",
  neutral: "bg-space-400",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  children,
  dot = false,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            dotStyles[variant]
          )}
        />
      )}
      {children}
    </span>
  );
};
