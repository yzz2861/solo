import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isActive, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1d23] disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-[#3b82f6] border-[#3b82f6] text-white hover:bg-[#2563eb] hover:border-[#2563eb] focus:ring-[#3b82f6]',
      secondary: 'bg-transparent border-[#3a4150] text-[#f8fafc] hover:border-[#3b82f6] hover:text-[#3b82f6] focus:ring-[#3b82f6]',
      danger: 'bg-[#ef4444] border-[#ef4444] text-white hover:bg-[#dc2626] hover:border-[#dc2626] focus:ring-[#ef4444]',
      ghost: 'bg-transparent border-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#2d323b] focus:ring-[#3a4150]',
    };

    const sizes = {
      sm: 'px-2 py-1 text-xs gap-1',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    const activeStyles = isActive
      ? 'border-[#3b82f6] text-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.3)]'
      : '';

    return (
      <button
        ref={ref}
        className={twMerge(
          clsx(
            baseStyles,
            variants[variant],
            sizes[size],
            activeStyles,
            className
          )
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
