import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

export type AlertLevel = 'error' | 'warning' | 'info' | 'success';

export interface AlertBannerProps extends HTMLAttributes<HTMLDivElement> {
  level: AlertLevel;
  title?: string;
  message: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const levelConfig: Record<AlertLevel, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  icon: typeof AlertCircle;
}> = {
  error: {
    bg: 'bg-vermilion-900/20',
    border: 'border-vermilion-700/50',
    text: 'text-vermilion-300',
    iconBg: 'bg-vermilion-700/30',
    icon: AlertCircle,
  },
  warning: {
    bg: 'bg-gold-900/20',
    border: 'border-gold-700/50',
    text: 'text-gold-300',
    iconBg: 'bg-gold-700/30',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-ink-700/50',
    border: 'border-ink-600',
    text: 'text-ivory-300',
    iconBg: 'bg-ink-600/50',
    icon: Info,
  },
  success: {
    bg: 'bg-military-900/20',
    border: 'border-military-700/50',
    text: 'text-military-300',
    iconBg: 'bg-military-700/30',
    icon: CheckCircle2,
  },
};

export const AlertBanner = forwardRef<HTMLDivElement, AlertBannerProps>(
  ({ level, title, message, dismissible = false, onDismiss, className, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(true);
    const config = levelConfig[level];
    const Icon = config.icon;

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative flex items-start gap-3 px-4 py-3 rounded-lg border',
          'animate-slide-down transition-all duration-300',
          config.bg,
          config.border,
          className
        )}
        {...props}
      >
        <div className={cn(
          'flex-shrink-0 p-1.5 rounded',
          config.iconBg
        )}>
          <Icon className={cn('w-4 h-4', config.text)} />
        </div>

        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={cn('text-sm font-semibold mb-0.5', config.text)}>
              {title}
            </h4>
          )}
          <div className={cn('text-sm', config.text)}>
            {message}
          </div>
        </div>

        {dismissible && (
          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 p-1 rounded',
              'hover:bg-ink-700/50 transition-colors',
              config.text
            )}
            aria-label="关闭提醒"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

AlertBanner.displayName = 'AlertBanner';
