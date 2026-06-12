import React from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: 'primary' | 'warning' | 'success';
  className?: string;
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  showLabel = false,
  variant = 'primary',
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const variantClasses = {
    primary: 'bg-primary-600',
    warning: 'bg-warning-600',
    success: 'bg-success-600',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${variantClasses[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-neutral-500 mt-1 text-right">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
};

export default Progress;
