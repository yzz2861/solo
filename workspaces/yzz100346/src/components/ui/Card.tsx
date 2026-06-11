import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-[#23272f] border border-[#3a4150]',
    glass: 'bg-[rgba(35,39,47,0.95)] backdrop-blur-sm border border-[#3a4150]',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-sm shadow-lg',
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={twMerge(clsx('p-4 border-b border-[#3a4150]', className))}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={twMerge(clsx('text-lg font-semibold text-[#f8fafc]', className))}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div
      className={twMerge(clsx('p-4', className))}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={twMerge(clsx('p-4 border-t border-[#3a4150]', className))}
      {...props}
    >
      {children}
    </div>
  );
}
