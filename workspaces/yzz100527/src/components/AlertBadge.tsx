import { AlertTriangle, Copy, FileSignature, HeartPulse } from 'lucide-react';
import type { AlertType } from '@/types';

interface AlertBadgeProps {
  type: AlertType;
  message?: string;
  showIcon?: boolean;
}

const alertConfig: Record<AlertType, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  expired: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  duplicate: { icon: Copy, color: 'text-purple-600', bg: 'bg-purple-50' },
  'no-signature': { icon: FileSignature, color: 'text-red-600', bg: 'bg-red-50' },
  'health-risk': { icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' },
};

export function AlertBadge({ type, message, showIcon = true }: AlertBadgeProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
      {showIcon && <Icon size={12} />}
      {message && <span>{message}</span>}
    </div>
  );
}
