import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: {
    value: number;
    isUp: boolean;
    label: string;
  };
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, color, trend, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {subtitle && <span className="text-sm text-gray-400">{subtitle}</span>}
          </div>
          {trend && (
            <div className="mt-3 flex items-center space-x-1">
              <span
                className={`text-sm font-medium ${
                  trend.isUp ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
}
