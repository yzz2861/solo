import { formatWeight } from '@/utils/units';
import type { WeightUnit } from '@/types';

interface AxleGaugeProps {
  value: number;
  limit: number;
  label: string;
  unit?: WeightUnit;
  size?: 'sm' | 'md' | 'lg';
}

export default function AxleGauge({
  value,
  limit,
  label,
  unit = 'kg',
  size = 'md',
}: AxleGaugeProps) {
  const ratio = Math.min(value / limit, 1);
  const percent = Math.round(ratio * 100);
  const overloaded = value > limit;

  const sizeMap = {
    sm: { width: 120, height: 60, stroke: 6, fontSize: 'text-lg', labelSize: 'text-xs' },
    md: { width: 180, height: 90, stroke: 8, fontSize: 'text-2xl', labelSize: 'text-sm' },
    lg: { width: 280, height: 140, stroke: 12, fontSize: 'text-4xl', labelSize: 'text-base' },
  };

  const { width, height, stroke, fontSize, labelSize } = sizeMap[size];
  const radius = (width - stroke) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - ratio);

  const getColor = () => {
    if (overloaded) return '#ef4444';
    if (ratio > 0.9) return '#f97316';
    if (ratio > 0.7) return '#eab308';
    return '#10b981';
  };

  const color = getColor();
  const displayValue = unit === 'ton' ? value / 1000 : value;
  const displayLimit = unit === 'ton' ? limit / 1000 : limit;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height: height + 10 }}>
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            d={`M ${stroke / 2} ${height - stroke / 2} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${height - stroke / 2}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${stroke / 2} ${height - stroke / 2} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${height - stroke / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`font-bold ${fontSize}`} style={{ color, fontFamily: '"JetBrains Mono", monospace' }}>
            {displayValue.toFixed(1)}
          </span>
          <span className={`${labelSize} text-gray-500`}>
            / {displayLimit.toFixed(0)} {unit === 'ton' ? '吨' : 'kg'}
          </span>
        </div>
      </div>
      <div className={`mt-1 font-medium ${labelSize} text-gray-700`}>{label}</div>
      {overloaded && (
        <div className="mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded animate-pulse">
          超载 {(value - limit).toFixed(0)} kg
        </div>
      )}
      {!overloaded && (
        <div className="mt-1 text-xs text-gray-500">
          余量 {formatWeight(limit - value, unit, 1)} ({percent}%)
        </div>
      )}
    </div>
  );
}
