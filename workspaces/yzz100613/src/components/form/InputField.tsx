import React from 'react';
import { cn } from '@/lib/utils';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightAddon?: string;
}

export function InputField({
  label,
  hint,
  error,
  leftIcon,
  rightAddon,
  className,
  id,
  ...props
}: InputFieldProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="input-label">
        {label}
      </label>
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'input-field',
            leftIcon && 'pl-10',
            rightAddon && 'pr-12',
            error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">
            {rightAddon}
          </div>
        )}
      </div>
      {hint && !error && (
        <p className="text-xs text-dark-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string }>;
  hint?: string;
  error?: string;
}

export function SelectField({
  label,
  options,
  hint,
  error,
  className,
  id,
  ...props
}: SelectFieldProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="input-label">
        {label}
      </label>
      <select
        id={inputId}
        className={cn(
          'input-field appearance-none cursor-pointer pr-10',
          'bg-dark-900/80',
          error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-dark-800">
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <p className="text-xs text-dark-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
