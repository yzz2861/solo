import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
    label: string;
  };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  delay?: number;
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-emerald-500 to-emerald-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
  purple: 'from-violet-500 to-violet-600',
};

const iconBgClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-violet-100 text-violet-600',
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  delay = 0,
}: StatCardProps) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm p-5 card-hover animate-slide-up opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-navy-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-navy-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${iconBgClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-sm">
          {trend.isUp ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span
            className={`font-medium ${
              trend.isUp ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {trend.isUp ? '+' : ''}
            {trend.value}%
          </span>
          <span className="text-navy-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
