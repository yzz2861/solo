import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'sm', children, ...props }: BadgeProps) {
  const variants = {
    success: 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30',
    warning: 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30',
    danger: 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
    info: 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30',
    default: 'bg-[#3a4150]/50 text-[#94a3b8] border-[#3a4150]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center font-medium border rounded-sm',
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
