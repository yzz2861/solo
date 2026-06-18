import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "warning" | "danger" | "success" | "default";
type ButtonSize = "sm" | "md" | "lg";

interface IndustrialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  pulse?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-tech-cyan/80 to-tech-cyan-dark border-tech-cyan text-white hover:from-tech-cyan hover:to-tech-cyan-dark hover:shadow-glow-cyan",
  warning:
    "bg-gradient-to-b from-warning-orange/80 to-warning-orange-dark border-warning-orange text-white hover:from-warning-orange hover:to-warning-orange-dark hover:shadow-glow-orange",
  danger:
    "bg-gradient-to-b from-alert-red/80 to-alert-red-dark border-alert-red text-white hover:from-alert-red hover:to-alert-red-dark hover:shadow-glow-red",
  success:
    "bg-gradient-to-b from-safety-green/80 to-safety-green-dark border-safety-green text-white hover:from-safety-green hover:to-safety-green-dark hover:shadow-glow-green",
  default:
    "bg-gradient-to-b from-metal-gray/80 to-metal-gray-dark border-metal-gray-light text-white hover:border-tech-cyan hover:shadow-glow-cyan",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

const IndustrialButton = forwardRef<HTMLButtonElement, IndustrialButtonProps>(
  ({ className, variant = "default", size = "md", leftIcon, rightIcon, fullWidth, pulse, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative font-orbitron font-semibold uppercase tracking-wider",
          "border transition-all duration-300",
          "shadow-industrial",
          "overflow-hidden",
          "flex items-center justify-center gap-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98] hover:scale-[1.02]",
          pulse && "animate-pulse-glow",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 hover:translate-x-full" />
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span className="relative z-10">{children}</span>
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

IndustrialButton.displayName = "IndustrialButton";

export { IndustrialButton };
