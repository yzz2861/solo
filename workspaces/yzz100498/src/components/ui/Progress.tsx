import React from 'react';
import { cn } from '../../lib/utils';

type ProgressVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const variantStyles: Record<ProgressVariant, string> = {
  default: 'bg-gray-500',
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  showLabel = false,
  label,
  className
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{label || `${Math.round(percentage)}%`}</span>
          <span className="text-gray-500">{value}/{max}</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
