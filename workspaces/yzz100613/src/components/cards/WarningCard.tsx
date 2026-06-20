import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WarningCardProps {
  type?: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message?: string;
  className?: string;
}

export function WarningCard({ type = 'warning', title, message, className }: WarningCardProps) {
  const icons = {
    warning: <AlertTriangle className="w-5 h-5 text-accent-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
    success: <CheckCircle className="w-5 h-5 text-primary-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
  };

  const bgColors = {
    warning: 'bg-accent-500/10 border-accent-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
    success: 'bg-primary-500/10 border-primary-500/30',
    error: 'bg-red-500/10 border-red-500/30',
  };

  const textColors = {
    warning: 'text-accent-300',
    info: 'text-blue-300',
    success: 'text-primary-300',
    error: 'text-red-300',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border',
        bgColors[type],
        className
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className={cn('text-sm font-medium', textColors[type])}>{title}</h4>
        {message && (
          <p className={cn('text-sm mt-1', textColors[type], 'opacity-80')}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
