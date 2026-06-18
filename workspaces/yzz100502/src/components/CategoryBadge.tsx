import { Activity, Pill, AlertTriangle, Calendar, Eye } from 'lucide-react';
import type { CategoryType } from '../types';
import { CATEGORY_CONFIGS } from '../types';

interface CategoryBadgeProps {
  category: CategoryType;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const iconMap = {
  Activity,
  Pill,
  AlertTriangle,
  Calendar,
  Eye,
};

export const CategoryBadge = ({ category, showIcon = true, size = 'md' }: CategoryBadgeProps) => {
  const config = CATEGORY_CONFIGS.find((c) => c.key === category);
  if (!config) return null;

  const IconComponent = iconMap[config.icon as keyof typeof iconMap];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      {showIcon && IconComponent && <IconComponent size={size === 'sm' ? 12 : 14} />}
      {config.label}
    </span>
  );
};
