import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  leftIcon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, leftIcon, className, id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-ivory-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none z-10">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full px-3 py-2 bg-ink-900 border rounded appearance-none cursor-pointer',
              'text-ivory-100',
              'focus:outline-none focus:ring-1 transition-all duration-200',
              leftIcon ? 'pl-10' : 'pl-3',
              'pr-10',
              error
                ? 'border-vermilion-600 focus:border-vermilion-500 focus:ring-vermilion-500'
                : 'border-ink-600 focus:border-vermilion-600 focus:ring-vermilion-600',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="bg-ink-900 text-ivory-100"
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && (
          <p className="text-sm text-vermilion-400 flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
