import { clsx } from 'clsx';
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  return (
    <label className={clsx('block space-y-1.5', className)}>
      {label && (
        <span className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </label>
  );
}

const BASE_INPUT =
  'w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition text-sm';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(BASE_INPUT, props.className)} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(BASE_INPUT, 'resize-y min-h-[120px] leading-relaxed', props.className)}
      {...props}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(BASE_INPUT, 'appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2364748b%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")] bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-9', props.className)}
      {...props}
    />
  );
}
