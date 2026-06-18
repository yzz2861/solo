import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RiskLevel } from '../../types';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  title?: string;
  onClose?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: <Info className="w-5 h-5 text-blue-500" />
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: <CheckCircle className="w-5 h-5 text-green-500" />
  },
  warning: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    icon: <AlertTriangle className="w-5 h-5 text-orange-500" />
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: <AlertCircle className="w-5 h-5 text-red-500" />
  }
};

const riskLevelToVariant: Record<RiskLevel, AlertVariant> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger'
};

export const Alert: React.FC<AlertProps> = ({ children, variant = 'info', title, onClose, className }) => {
  const styles = variantStyles[variant];
  
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border',
      styles.bg,
      styles.border,
      styles.text,
      className
    )}>
      {styles.icon}
      <div className="flex-1">
        {title && <h4 className="font-medium mb-1">{title}</h4>}
        <p className="text-sm">{children}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={cn('p-1 rounded hover:bg-black/5 transition-colors', styles.text)}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export { riskLevelToVariant };
