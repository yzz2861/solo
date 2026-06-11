import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  decorativeBorder?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hoverable = false, decorativeBorder = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative bg-ink-800 border border-ink-700 rounded-lg overflow-hidden',
          'bg-gradient-to-br from-ink-800 to-ink-800/50',
          hoverable && 'transition-all duration-300 hover:border-ink-500 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer',
          decorativeBorder && 'decorative-border',
          className
        )}
        {...props}
      >
        {decorativeBorder && (
          <>
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-gold-700" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-gold-700" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-gold-700" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-gold-700" />
          </>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-6 py-4 border-b border-ink-700', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-semibold text-ivory-100 font-display', className)}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('px-6 py-4', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-6 py-4 border-t border-ink-700', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
