import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-wood border border-wood-200/50 overflow-hidden',
        hover && 'transition-all duration-300 hover:shadow-wood-lg hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}
