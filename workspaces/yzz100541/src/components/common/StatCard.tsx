import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPercent } from '../../utils/formatters';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'green' | 'red' | 'yellow' | 'blue';
  trendIsGood?: boolean;
}

const colorClasses = {
  primary: 'bg-primary-50 text-primary-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  blue: 'bg-blue-50 text-blue-600',
};

const iconBgClasses = {
  primary: 'bg-primary-100 text-primary-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  blue: 'bg-blue-100 text-blue-600',
};

export default function StatCard({
  title,
  value,
  unit,
  change,
  changeLabel = '较昨日',
  icon,
  color = 'primary',
  trendIsGood,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  const isGoodTrend = trendIsGood !== undefined ? trendIsGood : isPositive;

  return (
    <div className="bg-white rounded-xl shadow-card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-800">{value}</span>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive && (
                <TrendingUp
                  className={`w-4 h-4 ${isGoodTrend ? 'text-green-500' : 'text-red-500'}`}
                />
              )}
              {isNegative && (
                <TrendingDown
                  className={`w-4 h-4 ${isGoodTrend ? 'text-red-500' : 'text-green-500'}`}
                />
              )}
              {isNeutral && <Minus className="w-4 h-4 text-gray-400" />}
              <span
                className={`text-sm font-medium ${
                  isNeutral
                    ? 'text-gray-400'
                    : isGoodTrend
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {isPositive ? '+' : ''}
                {typeof change === 'number' && change < 1 && change > -1
                  ? formatPercent(Math.abs(change))
                  : Math.abs(change).toFixed(1)}
              </span>
              <span className="text-xs text-gray-400">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
