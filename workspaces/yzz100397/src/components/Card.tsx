import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  delay?: number;
  action?: ReactNode;
}

export default function Card({ children, className, title, subtitle, icon, delay = 0, action }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-900 rounded-2xl border border-surface-800 shadow-card shadow-inner-glow overflow-hidden opacity-0 animate-fade-up',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || action) && (
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-800/60">
          <div className="flex items-center gap-3">
            {icon && <div className="text-brand-400">{icon}</div>}
            <div>
              {title && <h3 className="font-display text-white text-base font-semibold">{title}</h3>}
              {subtitle && <p className="text-xs text-surface-700 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
