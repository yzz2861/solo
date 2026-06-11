import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const baseStyles = 'w-full px-3 py-2 bg-[#23272f] border-2 border-[#3a4150] text-[#f8fafc] text-sm font-mono placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all duration-200';
    
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
        <input
          ref={ref}
          id={id}
          className={twMerge(clsx(baseStyles, errorStyles, className))}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
