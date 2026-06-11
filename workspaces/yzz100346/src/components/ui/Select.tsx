import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, children, ...props }, ref) => {
    const baseStyles = 'w-full px-3 py-2 bg-[#23272f] border-2 border-[#3a4150] text-[#f8fafc] text-sm font-mono focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all duration-200 cursor-pointer';
    
    const errorStyles = error
      ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
      : '';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-medium text-[#94a3b8] mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={twMerge(clsx(baseStyles, errorStyles, className))}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
