import { RiskLevel, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS } from '../../types';
import { AlertTriangle, CheckCircle2, OctagonAlert } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export default function RiskBadge({ level, showIcon = true, size = 'md' }: RiskBadgeProps) {
  const iconMap = {
    normal: CheckCircle2,
    warning: AlertTriangle,
    danger: OctagonAlert,
  };

  const Icon = iconMap[level];
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <span className={`${RISK_LEVEL_COLORS[level]} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {showIcon && <Icon className={`${sizeClass} inline mr-1 -mt-0.5`} />}
      {RISK_LEVEL_LABELS[level]}
    </span>
  );
}
