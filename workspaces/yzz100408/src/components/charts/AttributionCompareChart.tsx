import { useMemo } from 'react';
import { HourlyMetric, GunFault, ElectricityPrice } from '@/types';
import { formatHourLabel, formatMinutes, getHourOfDay, getDateMinutes } from '@/utils/date';
import { getPriceTypeLabel } from '@/utils/format';

interface Props {
  aggregatedMetrics: HourlyMetric[];
  faults: GunFault[];
  prices: ElectricityPrice[];
}

export default function AttributionCompareChart({ aggregatedMetrics, faults, prices }: Props) {
  const { width, height, padding } = { width: 900, height: 300, padding: { top: 30, right: 20, bottom: 50, left: 50 } };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxWait = useMemo(() => {
    const max = Math.max(...aggregatedMetrics.map(m => m.avgWaitMinutes), 1);
    return Math.ceil(max / 10) * 10;
  }, [aggregatedMetrics]);

  const xAt = (hour: number) => padding.left + (hour / 24) * innerW + (innerW / 24) / 2;
  const yAt = (v: number) => padding.top + innerH - (v / maxWait) * innerH;

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((i / 4) * maxWait));
  const xHours = [0, 3, 6, 9, 12, 15, 18, 21];

  const priceBgColors: Record<string, string> = {
    peak: 'rgba(255, 107, 53, 0.10)',
    flat: 'rgba(244, 196, 48, 0.06)',
    valley: 'rgba(0, 212, 170, 0.06)',
    promotion: 'rgba(168, 85, 247, 0.10)',
  };

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {prices.map((p, i) => {
        const startX = padding.left + (p.startHour / 24) * innerW;
        const endX = padding.left + (p.endHour / 24) * innerW;
        return (
          <g key={i}>
            <rect x={startX} y={padding.top} width={endX - startX} height={innerH} fill={priceBgColors[p.priceType]} />
            <text
              x={(startX + endX) / 2}
              y={height - 22}
              textAnchor="middle"
              className="fill-neutral-slate-dark text-[9px] font-mono"
            >
              {getPriceTypeLabel(p.priceType)} {p.pricePerKwh.toFixed(2)}元
            </text>
          </g>
        );
      })}

      {faults.map((f, i) => {
        const startH = getHourOfDay(f.faultStartTime) + getDateMinutes(f.faultStartTime) / 60;
        const endH = getHourOfDay(f.faultEndTime) + getDateMinutes(f.faultEndTime) / 60;
        const x1 = padding.left + (startH / 24) * innerW;
        const x2 = padding.left + (endH / 24) * innerW;
        return (
          <g key={i}>
            <rect
              x={x1}
              y={padding.top}
              width={Math.max(4, x2 - x1)}
              height={innerH}
              fill="#FF6B35"
              opacity={0.22}
            />
            <line x1={x1} y1={padding.top} x2={x1} y2={padding.top + innerH} stroke="#FF6B35" strokeWidth={1.5} strokeDasharray="3 2" />
            <line x1={x2} y1={padding.top} x2={x2} y2={padding.top + innerH} stroke="#FF6B35" strokeWidth={1.5} strokeDasharray="3 2" />
            <rect
              x={x1}
              y={padding.top - 16}
              width={Math.max(80, x2 - x1)}
              height={14}
              fill="#FF6B35"
              rx={1}
              opacity={0.9}
            />
            <text
              x={x1 + 6}
              y={padding.top - 6}
              className="fill-electric-blue text-[9px] font-mono font-semibold"
            >
              ⚠ {f.gunId} {f.faultType}
            </text>
          </g>
        );
      })}

      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padding.left} y1={yAt(t)} x2={width - padding.right} y2={yAt(t)} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 3" />
          <text x={padding.left - 8} y={yAt(t) + 3} textAnchor="end" className="fill-neutral-slate-dark text-[10px] font-mono">
            {formatMinutes(t)}
          </text>
        </g>
      ))}

      {xHours.map(h => (
        <text
          key={h}
          x={xAt(h)}
          y={padding.top + innerH + 18}
          textAnchor="middle"
          className="fill-neutral-slate-dark text-[10px] font-mono"
        >
          {formatHourLabel(h)}
        </text>
      ))}

      {aggregatedMetrics.map(m => {
        const barW = (innerW / 24) * 0.65;
        const barH = (m.avgWaitMinutes / maxWait) * innerH;
        return (
          <rect
            key={m.hour}
            x={xAt(m.hour) - barW / 2}
            y={padding.top + innerH - barH}
            width={barW}
            height={barH}
            fill="url(#barGrad)"
            rx={1}
          />
        );
      })}

      <g transform={`translate(${padding.left}, ${padding.top - 24})`}>
        <rect x={0} y={-6} width={10} height={10} fill="#FF6B35" opacity={0.6} rx={1} />
        <text x={14} y={3} className="fill-neutral-slate-dark text-[10px] font-mono">设备故障</text>
        <rect x={100} y={-6} width={10} height={10} fill="rgba(255,107,53,0.3)" rx={1} />
        <text x={114} y={3} className="fill-neutral-slate-dark text-[10px] font-mono">峰段电价</text>
        <rect x={210} y={-6} width={10} height={10} fill="url(#barGrad)" rx={1} />
        <text x={224} y={3} className="fill-neutral-slate-dark text-[10px] font-mono">平均等待时长</text>
      </g>

      <text x={padding.left} y={padding.top - 6} className="fill-neutral-slate-dark text-[10px] font-mono">等待时长 (分钟)</text>
    </svg>
  );
}
