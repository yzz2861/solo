import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center p-8',
          'animate-fade-in',
          className
        )}
        {...props}
      >
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-vermilion-700/10 rounded-full blur-xl" />
          <div className={cn(
            'relative p-4 rounded-full bg-ink-800 border border-ink-700',
            'text-ink-400'
          )}>
            {icon || <Inbox className="w-10 h-10" />}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-ivory-100 mb-2 font-display">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-ink-400 max-w-sm mb-6">
            {description}
          </p>
        )}

        {action && (
          <div className="flex items-center gap-3">
            {action}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';
