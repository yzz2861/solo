import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type LoadingMode = 'fullscreen' | 'inline';

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  mode?: LoadingMode;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const Loading = forwardRef<HTMLDivElement, LoadingProps>(
  ({ mode = 'inline', text, size = 'md', className, ...props }, ref) => {
    if (mode === 'fullscreen') {
      return (
        <div
          ref={ref}
          className={cn(
            'fixed inset-0 z-50 flex flex-col items-center justify-center gap-4',
            'bg-ink-950/90 backdrop-blur-sm',
            'animate-fade-in',
            className
          )}
          {...props}
        >
          <div className="relative">
            <Loader2 className={cn('animate-spin text-vermilion-600', sizeClasses.lg)} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-ink-950 rounded-full" />
            </div>
          </div>
          {text && (
            <p className="text-ivory-300 font-medium animate-pulse">{text}</p>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-2',
          className
        )}
        {...props}
      >
        <Loader2 className={cn('animate-spin text-vermilion-500', sizeClasses[size])} />
        {text && (
          <span className="text-ivory-300 text-sm">{text}</span>
        )}
      </div>
    );
  }
);

Loading.displayName = 'Loading';
