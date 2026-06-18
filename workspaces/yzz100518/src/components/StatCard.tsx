import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  accent?: 'moss' | 'ink' | 'amber' | 'clay';
  children?: ReactNode;
  onClick?: () => void;
}

const ACCENT: Record<string, { bg: string; text: string; border: string; chip: string }> = {
  moss: {
    bg: 'from-moss-50 to-white',
    text: 'text-moss-600',
    border: 'border-moss-100',
    chip: 'bg-moss-100 text-moss-700',
  },
  ink: {
    bg: 'from-ink-50 to-white',
    text: 'text-ink-700',
    border: 'border-ink-100',
    chip: 'bg-ink-100 text-ink-700',
  },
  amber: {
    bg: 'from-amber-50 to-white',
    text: 'text-amber-600',
    border: 'border-amber-100',
    chip: 'bg-amber-100 text-amber-700',
  },
  clay: {
    bg: 'from-clay-50 to-white',
    text: 'text-clay-500',
    border: 'border-clay-100',
    chip: 'bg-clay-100 text-clay-700',
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  accent = 'ink',
  children,
  onClick,
}: StatCardProps) {
  const a = ACCENT[accent];
  return (
    <div
      onClick={onClick}
      className={cn(
        'card-shadow rounded-2xl border bg-gradient-to-br p-5 transition-all',
        a.border,
        a.bg,
        onClick && 'cursor-pointer hover:card-shadow-hover hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-ink-500">{label}</div>
          <div className={cn('mt-2 font-display text-4xl font-semibold tracking-tight', a.text)}>
            {value}
          </div>
        </div>
        {icon && (
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', a.chip)}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
              trend.value > 0 ? 'bg-moss-100 text-moss-700' : 'bg-clay-100 text-clay-600',
            )}
          >
            {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
        {hint && <span className="text-xs text-ink-500">{hint}</span>}
        {!trend && !hint && <span />}
        {children}
      </div>
    </div>
  );
}
