import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  showCount?: boolean;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, showCount, maxLength, className, id, value, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-ivory-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            maxLength={maxLength}
            value={value}
            className={cn(
              'w-full px-3 py-2 bg-ink-900 border rounded resize-none',
              'text-ivory-100 placeholder-ink-400',
              'focus:outline-none focus:ring-1 transition-all duration-200',
              showCount || maxLength ? 'pb-8' : 'pb-2',
              error
                ? 'border-vermilion-600 focus:border-vermilion-500 focus:ring-vermilion-500'
                : 'border-ink-600 focus:border-vermilion-600 focus:ring-vermilion-600',
              className
            )}
            {...props}
          />
          {(showCount || maxLength) && (
            <div className="absolute right-3 bottom-2 text-xs text-ink-400">
              {currentLength}
              {maxLength && `/${maxLength}`}
            </div>
          )}
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

Textarea.displayName = 'Textarea';
