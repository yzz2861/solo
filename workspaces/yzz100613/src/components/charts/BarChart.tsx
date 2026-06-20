import { cn } from '@/lib/utils';

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  yLabel?: string;
  height?: number;
  showValues?: boolean;
  className?: string;
}

export function BarChart({
  data,
  title,
  yLabel,
  height = 180,
  showValues = true,
  className,
}: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value)) * 1.15;
  const minValue = Math.min(0, ...data.map(d => d.value)) * 1.15;
  const range = maxValue - minValue;

  const chartHeight = height - 40;
  const barWidth = 100 / (data.length * 1.5);
  const barGap = barWidth * 0.5;

  const getY = (value: number) => {
    return chartHeight * (1 - (value - minValue) / range);
  };

  const zeroY = getY(0);

  return (
    <div className={cn('w-full', className)}>
      {title && (
        <h4 className="text-sm font-medium text-dark-200 mb-3">{title}</h4>
      )}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <line
          x1="0"
          y1={zeroY + 20}
          x2="100"
          y2={zeroY + 20}
          stroke="#334155"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
        
        {data.map((item, index) => {
          const x = index * (barWidth + barGap) + barGap / 2;
          const y = item.value >= 0 ? getY(item.value) + 20 : zeroY + 20;
          const h = Math.abs(getY(item.value) - zeroY);
          const color = item.color || (item.value >= 0 ? '#22c55e' : '#f97316');

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx="2"
                fill={color}
                opacity="0.85"
                className="transition-all duration-300"
              />
              {showValues && (
                <text
                  x={x + barWidth / 2}
                  y={item.value >= 0 ? y - 4 : y + h + 12}
                  textAnchor="middle"
                  fontSize="3.5"
                  fill="#94a3b8"
                  fontWeight="500"
                >
                  {item.value.toFixed(2)}s
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 35}
                textAnchor="middle"
                fontSize="3"
                fill="#64748b"
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {yLabel && (
          <text
            x="-8"
            y={chartHeight / 2 + 20}
            textAnchor="middle"
            fontSize="3"
            fill="#64748b"
            transform={`rotate(-90, -8, ${chartHeight / 2 + 20})`}
          >
            {yLabel}
          </text>
        )}
      </svg>
    </div>
  );
}
