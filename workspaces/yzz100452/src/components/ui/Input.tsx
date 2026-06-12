import * as React from "react";
import { cn } from "../../utils/cn";

type StatusIndicator = "idle" | "loading" | "success" | "warning" | "error";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  status?: StatusIndicator;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

const statusColors: Record<StatusIndicator, string> = {
  idle: "bg-space-500",
  loading: "bg-signal-blue animate-pulse",
  success: "bg-signal-green",
  warning: "bg-signal-orange",
  error: "bg-signal-red",
};

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  status,
  leftIcon,
  rightIcon,
  wrapperClassName,
  className,
  id,
  ...props
}) => {
  const inputId = id || React.useId();

  return (
    <div className={cn("w-full", wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className="label-field">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-space-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            "input-field",
            leftIcon && "pl-9",
            (rightIcon || status) && "pr-9",
            error && "border-signal-red/60 focus:border-signal-red focus:ring-2 focus:ring-signal-red/20",
            className
          )}
          {...props}
        />
        {status && !rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                statusColors[status]
              )}
            />
          </div>
        )}
        {rightIcon && !status && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-space-400 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-signal-red">{error}</p>
      )}
      {!error && hint && (
        <p className="mt-1 text-xs text-space-400">{hint}</p>
      )}
    </div>
  );
};
