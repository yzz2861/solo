import { cn } from '@/lib/utils';

interface LineChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  title?: string;
  yLabel?: string;
  height?: number;
  showPoints?: boolean;
  showValues?: boolean;
  showArea?: boolean;
  secondaryLine?: boolean;
  className?: string;
}

export function LineChart({
  data,
  title,
  yLabel,
  height = 200,
  showPoints = true,
  showValues = false,
  showArea = true,
  secondaryLine = false,
  className,
}: LineChartProps) {
  const allValues = data.flatMap(d => [d.value, d.secondaryValue || 0]);
  const maxValue = Math.max(...allValues) * 1.1;
  const minValue = Math.min(...allValues.filter(v => v > 0)) * 0.9;
  const range = maxValue - minValue;

  const chartHeight = height - 50;
  const chartWidth = 100;
  const paddingLeft = yLabel ? 10 : 5;
  const paddingRight = 5;
  const usableWidth = chartWidth - paddingLeft - paddingRight;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + usableWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * usableWidth;
  };

  const getY = (value: number) => {
    return 20 + chartHeight * (1 - (value - minValue) / range);
  };

  const pathD = data.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`
  ).join(' ');

  const areaD = `${pathD} L ${getX(data.length - 1)} ${chartHeight + 20} L ${getX(0)} ${chartHeight + 20} Z`;

  const secondaryPathD = secondaryLine && data[0]?.secondaryValue !== undefined
    ? data.map((d, i) => 
        `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.secondaryValue!)}`
      ).join(' ')
    : '';

  return (
    <div className={cn('w-full', className)}>
      {title && (
        <h4 className="text-sm font-medium text-dark-200 mb-3">{title}</h4>
      )}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={paddingLeft}
            y1={20 + chartHeight * ratio}
            x2={chartWidth - paddingRight}
            y2={20 + chartHeight * ratio}
            stroke="#334155"
            strokeWidth="0.3"
            strokeDasharray="1,2"
          />
        ))}

        {showArea && (
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
        )}

        {showArea && (
          <path d={areaD} fill="url(#lineGradient)" />
        )}

        <path
          d={pathD}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500"
        />

        {secondaryLine && (
          <path
            d={secondaryPathD}
            fill="none"
            stroke="#f97316"
            strokeWidth="0.8"
            strokeDasharray="3,2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500"
          />
        )}

        {showPoints && data.map((d, i) => (
          <g key={i}>
            <circle
              cx={getX(i)}
              cy={getY(d.value)}
              r="1.5"
              fill="#0f172a"
              stroke="#22c55e"
              strokeWidth="0.8"
            />
            {showValues && (
              <text
                x={getX(i)}
                y={getY(d.value) - 4}
                textAnchor="middle"
                fontSize="3"
                fill="#94a3b8"
              >
                {d.value.toFixed(2)}
              </text>
            )}
            <text
              x={getX(i)}
              y={chartHeight + 35}
              textAnchor="middle"
              fontSize="2.8"
              fill="#64748b"
            >
              {d.label}
            </text>
          </g>
        ))}

        {yLabel && (
          <text
            x="2"
            y={chartHeight / 2 + 20}
            textAnchor="middle"
            fontSize="3"
            fill="#64748b"
            transform={`rotate(-90, 2, ${chartHeight / 2 + 20})`}
          >
            {yLabel}
          </text>
        )}
      </svg>
    </div>
  );
}
