import { useMemo } from 'react';
import { QueueRecord, ElectricityPrice } from '@/types';
import { formatDate, formatHourLabel, getDateTimestamp } from '@/utils/date';
import { getPriceTypeLabel } from '@/utils/format';

interface Props {
  queueRecords: QueueRecord[];
  prices: ElectricityPrice[];
  targetDate: string;
}

export default function QueueLineChart({ queueRecords, prices, targetDate }: Props) {
  const chartData = useMemo(() => {
    const dayRecords = queueRecords.filter(q => formatDate(q.timestamp) === targetDate);
    const sorted = [...dayRecords].sort((a, b) => getDateTimestamp(a.timestamp) - getDateTimestamp(b.timestamp));
    return sorted;
  }, [queueRecords, targetDate]);

  const { width, height, padding } = { width: 900, height: 260, padding: { top: 20, right: 20, bottom: 36, left: 44 } };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxQueue = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.queueLength), 1);
    return Math.ceil(max / 5) * 5;
  }, [chartData]);

  const xAt = (idx: number, total: number) => padding.left + (idx / Math.max(1, total - 1)) * innerW;
  const yAt = (v: number) => padding.top + innerH - (v / maxQueue) * innerH;

  const linePath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${xAt(i, chartData.length)} ${yAt(d.queueLength)}`
    ).join(' ');
  }, [chartData, maxQueue]);

  const areaPath = useMemo(() => {
    if (chartData.length === 0) return '';
    const line = chartData.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${xAt(i, chartData.length)} ${yAt(d.queueLength)}`
    ).join(' ');
    return `${line} L ${xAt(chartData.length - 1, chartData.length)} ${padding.top + innerH} L ${padding.left} ${padding.top + innerH} Z`;
  }, [chartData, maxQueue]);

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((i / 4) * maxQueue));
  const xHours = [0, 3, 6, 9, 12, 15, 18, 21];

  const priceColors: Record<string, string> = {
    peak: 'rgba(255, 107, 53, 0.12)',
    flat: 'rgba(244, 196, 48, 0.08)',
    valley: 'rgba(0, 212, 170, 0.08)',
    promotion: 'rgba(168, 85, 247, 0.12)',
  };

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id="queueFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00D4AA" stopOpacity="0" />
        </linearGradient>
      </defs>

      {prices.map((p, i) => {
        const totalMins = 24 * 60;
        const startX = padding.left + (p.startHour * 60 / totalMins) * innerW;
        const endX = padding.left + (p.endHour * 60 / totalMins) * innerW;
        return (
          <g key={i}>
            <rect
              x={startX}
              y={padding.top}
              width={endX - startX}
              height={innerH}
              fill={priceColors[p.priceType]}
            />
            <text
              x={(startX + endX) / 2}
              y={height - 6}
              textAnchor="middle"
              className="fill-neutral-slate-dark text-[9px] font-mono"
            >
              {getPriceTypeLabel(p.priceType)}
            </text>
          </g>
        );
      })}

      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={yAt(t)}
            x2={width - padding.right}
            y2={yAt(t)}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2 3"
          />
          <text
            x={padding.left - 8}
            y={yAt(t) + 3}
            textAnchor="end"
            className="fill-neutral-slate-dark text-[10px] font-mono"
          >
            {t}
          </text>
        </g>
      ))}

      {xHours.map(h => {
        const x = padding.left + (h / 24) * innerW;
        return (
          <text
            key={h}
            x={x}
            y={padding.top + innerH + 18}
            textAnchor="middle"
            className="fill-neutral-slate-dark text-[10px] font-mono"
          >
            {formatHourLabel(h)}
          </text>
        );
      })}

      <path d={areaPath} fill="url(#queueFill)" />
      <path d={linePath} fill="none" stroke="#00D4AA" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />

      {chartData.filter((_, i) => i % 12 === 0).map((d, i) => (
        <circle
          key={i}
          cx={xAt(i * 12, chartData.length)}
          cy={yAt(d.queueLength)}
          r={2.5}
          fill="#00D4AA"
          stroke="#061A2D"
          strokeWidth={1.5}
        />
      ))}

      <text
        x={padding.left}
        y={padding.top - 6}
        className="fill-neutral-slate-dark text-[10px] font-mono"
      >
        排队车辆数
      </text>
    </svg>
  );
}
