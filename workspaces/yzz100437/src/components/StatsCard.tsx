import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'burgundy' | 'gold' | 'green' | 'blue';
  delay?: number;
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'burgundy',
  delay = 0 
}: StatsCardProps) => {
  const colorClasses = {
    burgundy: 'bg-burgundy-50 text-burgundy-700',
    gold: 'bg-gold-50 text-gold-600',
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  const iconBgClasses = {
    burgundy: 'bg-burgundy-100 text-burgundy-700',
    gold: 'bg-gold-100 text-gold-600',
    green: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  const animationClass = delay > 0 ? `animate-stagger-${delay}` : 'animate-fade-in';

  return (
    <div 
      className={`card p-6 ${animationClass}`}
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-charcoal/60 mb-1">{title}</p>
          <p className={`text-3xl font-bold font-serif ${colorClasses[color]}`}>
            {value}
          </p>
          {trend && (
            <p className={`text-xs mt-2 ${
              trend.isPositive ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% 较上周
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
