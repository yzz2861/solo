import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface TagProps {
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function Tag({ className, children, icon }: TagProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        className
      )}
    >
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
}
