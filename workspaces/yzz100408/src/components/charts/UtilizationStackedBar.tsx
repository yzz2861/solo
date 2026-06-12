import { useMemo } from 'react';
import { HourlyMetric } from '@/types';
import { formatHourLabel } from '@/utils/date';
import { formatPercent } from '@/utils/format';

interface Props {
  metrics: HourlyMetric[];
  gunIds: string[];
}

export default function UtilizationStackedBar({ metrics, gunIds }: Props) {
  const aggregated = useMemo(() => {
    const byHour: Record<number, { charging: number; fault: number; idle: number }> = {};
    for (let h = 0; h < 24; h++) byHour[h] = { charging: 0, fault: 0, idle: 0 };

    for (const m of metrics) {
      byHour[m.hour].charging += m.chargingMinutes;
      byHour[m.hour].fault += m.faultMinutes;
      byHour[m.hour].idle += m.idleMinutes;
    }
    const n = gunIds.length || 1;
    return Object.entries(byHour).map(([h, v]) => ({
      hour: Number(h),
      charging: v.charging / n,
      fault: v.fault / n,
      idle: v.idle / n,
    }));
  }, [metrics, gunIds]);

  const { width, height, padding } = { width: 900, height: 200, padding: { top: 20, right: 20, bottom: 32, left: 44 } };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const barW = (innerW / 24) * 0.7;
  const gap = (innerW / 24) * 0.3;

  const yTicks = [0, 15, 30, 45, 60];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={padding.top + innerH - (t / 60) * innerH}
            x2={width - padding.right}
            y2={padding.top + innerH - (t / 60) * innerH}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2 3"
          />
          <text
            x={padding.left - 8}
            y={padding.top + innerH - (t / 60) * innerH + 3}
            textAnchor="end"
            className="fill-neutral-slate-dark text-[10px] font-mono"
          >
            {t === 60 ? '100%' : formatPercent(t / 60, 0)}
          </text>
        </g>
      ))}

      {aggregated.map(d => {
        const x = padding.left + d.hour * (barW + gap) + gap / 2;
        const totalMin = d.charging + d.fault + d.idle || 1;
        const hCharge = (d.charging / totalMin) * innerH;
        const hFault = (d.fault / totalMin) * innerH;
        const hIdle = (d.idle / totalMin) * innerH;
        const yBase = padding.top + innerH;

        return (
          <g key={d.hour}>
            <rect x={x} y={yBase - hCharge - hFault - hIdle} width={barW} height={hIdle} fill="rgba(255,255,255,0.06)" rx={1} />
            <rect x={x} y={yBase - hCharge - hFault} width={barW} height={hFault} fill="#FF6B35" rx={1} opacity={0.85} />
            <rect x={x} y={yBase - hCharge} width={barW} height={hCharge} fill="#00D4AA" rx={1} opacity={0.9} />
            {d.hour % 3 === 0 && (
              <text
                x={x + barW / 2}
                y={padding.top + innerH + 16}
                textAnchor="middle"
                className="fill-neutral-slate-dark text-[10px] font-mono"
              >
                {formatHourLabel(d.hour)}
              </text>
            )}
          </g>
        );
      })}

      <g transform={`translate(${width - padding.right - 200}, ${padding.top - 16})`}>
        <g transform="translate(0, 0)">
          <rect x={0} y={0} width={10} height={10} fill="#00D4AA" rx={1} />
          <text x={16} y={9} className="fill-neutral-slate-dark text-[10px] font-mono">充电中</text>
        </g>
        <g transform="translate(70, 0)">
          <rect x={0} y={0} width={10} height={10} fill="#FF6B35" rx={1} />
          <text x={16} y={9} className="fill-neutral-slate-dark text-[10px] font-mono">故障</text>
        </g>
        <g transform="translate(120, 0)">
          <rect x={0} y={0} width={10} height={10} fill="rgba(255,255,255,0.15)" rx={1} />
          <text x={16} y={9} className="fill-neutral-slate-dark text-[10px] font-mono">空闲</text>
        </g>
      </g>
    </svg>
  );
}
