import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
  className?: string;
  children: ReactNode;
  title?: ReactNode;
  extra?: ReactNode;
  hoverable?: boolean;
  bordered?: boolean;
}

export function Card({
  className,
  children,
  title,
  extra,
  hoverable = false,
  bordered = true,
}: CardProps) {
  return (
    <section
      className={clsx(
        'bg-white rounded-xl',
        bordered ? 'border border-slate-200 shadow-sm' : '',
        hoverable ? 'hover:shadow-md transition-shadow duration-200' : '',
        className
      )}
    >
      {(title || extra) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          {typeof title === 'string' ? (
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          ) : (
            title
          )}
          {extra}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
