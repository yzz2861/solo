import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[#1e3a5f] text-white hover:bg-[#172d4a] active:bg-[#12243d] shadow-sm disabled:bg-slate-300',
  secondary:
    'bg-white text-[#1e3a5f] border border-slate-200 hover:bg-slate-50 active:bg-slate-100',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  danger:
    'bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 shadow-sm',
  success:
    'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-sm',
  warning:
    'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 shadow-sm',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-5 text-base rounded-lg gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed select-none',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {icon && <span className="inline-flex">{icon}</span>}
      {children && <span>{children}</span>}
      {iconRight && <span className="inline-flex">{iconRight}</span>}
    </button>
  );
}
