import { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface FormFieldProps {
  label: string;
  error?: string;
  warning?: string;
  success?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export default function FormField({
  label,
  error,
  warning,
  success,
  required,
  children,
  className = '',
}: FormFieldProps) {
  const getStatusClass = () => {
    if (error) return 'text-danger-600';
    if (warning) return 'text-warning-600';
    return '';
  };

  return (
    <div className={`${className}`}>
      <label className={`label ${getStatusClass()}`}>
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      {children}
      {(error || warning || success) && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs">
          {error && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-danger-500 flex-shrink-0 mt-0.5" />
              <span className="text-danger-600">{error}</span>
            </>
          )}
          {warning && !error && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-warning-500 flex-shrink-0 mt-0.5" />
              <span className="text-warning-600">{warning}</span>
            </>
          )}
          {success && !error && !warning && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-success-500 flex-shrink-0 mt-0.5" />
              <span className="text-success-600">{success}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
