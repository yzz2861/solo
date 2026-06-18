import type { SeverityLevel } from '../types';
import { SEVERITY_CONFIGS } from '../types';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  showPriority?: boolean;
  size?: 'sm' | 'md';
}

export const SeverityBadge = ({ severity, showPriority = false, size = 'md' }: SeverityBadgeProps) => {
  const config = SEVERITY_CONFIGS.find((c) => c.key === severity);
  if (!config) return null;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-bold ${sizeClasses[size]}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
      {showPriority && <span className="text-xs opacity-70">({config.priority})</span>}
    </span>
  );
};
