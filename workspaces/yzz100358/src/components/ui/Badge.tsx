import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-vermilion-700/20 text-vermilion-300 border-vermilion-600/50',
  secondary: 'bg-ink-700 text-ivory-200 border-ink-600',
  success: 'bg-military-700/20 text-military-300 border-military-600/50',
  danger: 'bg-vermilion-900/30 text-vermilion-400 border-vermilion-700/50',
  warning: 'bg-gold-700/20 text-gold-400 border-gold-600/50',
  info: 'bg-ink-600/30 text-ivory-300 border-ink-500/50',
  outline: 'bg-transparent text-ivory-200 border-ink-500',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded border',
          'transition-colors duration-200',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
