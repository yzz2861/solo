import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: number;
  trendType?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  className?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  trend,
  trendType = 'neutral',
  description,
  icon,
  accentColor = '#1976D2',
  className,
  onClick
}) => {
  const TrendIcon = trendType === 'up' ? TrendingUp : trendType === 'down' ? TrendingDown : Minus;
  const trendColor = trendType === 'up' ? 'text-green-600' : trendType === 'down' ? 'text-red-600' : 'text-gray-500';
  const trendBg = trendType === 'up' ? 'bg-green-50' : trendType === 'down' ? 'bg-red-50' : 'bg-gray-50';
  
  return (
    <Card className={cn('hover:shadow-md transition-all cursor-pointer', className)} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">{title}</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-800" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        {trend !== undefined && (
          <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', trendBg, trendColor)}>
            <TrendIcon className="w-3 h-3" />
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
      
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl"
        style={{ backgroundColor: accentColor, opacity: 0.3 }}
      ></div>
    </Card>
  );
};
