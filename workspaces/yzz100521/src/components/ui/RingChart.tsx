import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface RingChartProps {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  unit?: string;
  showValue?: boolean;
}

const RingChart: React.FC<RingChartProps> = ({
  value,
  maxValue,
  size = 160,
  strokeWidth = 12,
  color = '#FFB6C1',
  label,
  unit = '',
  showValue = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  
  const data = [
    { name: 'value', value: percentage },
    { name: 'remaining', value: 100 - percentage },
  ];

  const colors = [color, '#FFEAD5'];

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={(size - strokeWidth) / 2 - 10}
              outerRadius={(size - strokeWidth) / 2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <span className="text-2xl font-bold text-chocolate-700 font-display">
              {value.toFixed(1)}{unit}
            </span>
          )}
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-chocolate-500 text-center">
        {label}
      </span>
    </div>
  );
};

export default RingChart;
