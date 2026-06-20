import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = ({ label, error, helperText, className = '', id, ...props }: InputProps) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-archive-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
          error
            ? 'border-error focus:ring-error/30 focus:border-error'
            : 'border-archive-200 focus:ring-archive-500/30 focus:border-archive-500'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-archive-500">{helperText}</p>}
    </div>
  );
};

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = ({ label, error, helperText, className = '', id, ...props }: TextAreaProps) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-archive-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 resize-y ${
          error
            ? 'border-error focus:ring-error/30 focus:border-error'
            : 'border-archive-200 focus:ring-archive-500/30 focus:border-archive-500'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-archive-500">{helperText}</p>}
    </div>
  );
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = ({ label, error, options, className = '', id, ...props }: SelectProps) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-archive-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 bg-white ${
          error
            ? 'border-error focus:ring-error/30 focus:border-error'
            : 'border-archive-200 focus:ring-archive-500/30 focus:border-archive-500'
        } ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
};

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = ({ label, className = '', id, ...props }: CheckboxProps) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        id={inputId}
        className={`w-4 h-4 text-archive-950 border-archive-300 rounded focus:ring-archive-500 ${className}`}
        {...props}
      />
      {label && <span className="text-sm text-archive-700">{label}</span>}
    </label>
  );
};
