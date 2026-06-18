import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative card-shadow animate-stagger-in w-full rounded-2xl bg-white',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-md',
          size === 'lg' && 'max-w-2xl',
        )}
      >
        <div className="border-b border-ink-100 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink-800">{title}</h3>
              {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-50 hover:text-ink-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin p-6">{children}</div>
        {footer && (
          <div className="border-t border-ink-100 bg-ink-50/50 px-6 py-4 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warn';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantCls: Record<string, string> = {
    primary:
      'bg-ink-700 text-white hover:bg-ink-800 active:bg-ink-900 disabled:bg-ink-300 shadow-sm',
    secondary:
      'bg-ink-100 text-ink-800 hover:bg-ink-200 active:bg-ink-300 disabled:text-ink-400',
    outline:
      'border border-ink-300 bg-white text-ink-700 hover:bg-ink-50 hover:border-ink-400 disabled:text-ink-400',
    ghost:
      'text-ink-600 hover:bg-ink-50 disabled:text-ink-400',
    danger:
      'bg-clay-500 text-white hover:bg-clay-600 active:bg-clay-700 disabled:bg-clay-200 shadow-sm',
    warn:
      'bg-amber-400 text-ink-900 hover:bg-amber-500 active:bg-amber-600 disabled:bg-amber-200 shadow-sm',
  };
  const sizeCls: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        'font-medium transition-all disabled:cursor-not-allowed disabled:shadow-none',
        'inline-flex items-center justify-center gap-1.5',
        variantCls[variant],
        sizeCls[size],
        block && 'w-full',
        className,
      )}
    >
      {children}
    </button>
  );
}

interface LabelValueProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

export function LabelValue({ label, value, hint }: LabelValueProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-ink-100 last:border-b-0">
      <div className="shrink-0 text-sm text-ink-500">{label}</div>
      <div className="text-right">
        <div className="font-medium text-ink-800">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}
      </div>
    </div>
  );
}

interface TagProps {
  children: ReactNode;
  tone?: 'ink' | 'moss' | 'amber' | 'clay';
}

export function Tag({ children, tone = 'ink' }: TagProps) {
  const cls: Record<string, string> = {
    ink: 'bg-ink-100 text-ink-700',
    moss: 'bg-moss-100 text-moss-700',
    amber: 'bg-amber-100 text-amber-700',
    clay: 'bg-clay-100 text-clay-700',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        cls[tone],
      )}
    >
      {children}
    </span>
  );
}
