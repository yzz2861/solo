import { useMemo, useState } from 'react';
import { HourlyMetric } from '@/types';
import { formatHourLabel, formatMinutes } from '@/utils/date';

interface Props {
  metrics: HourlyMetric[];
  gunIds: string[];
}

export default function WaitHeatmap({ metrics, gunIds }: Props) {
  const [hovered, setHovered] = useState<{ hour: number; gun: string } | null>(null);

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of metrics) {
      if (m.gunId) map.set(`${m.hour}|${m.gunId}`, m.avgWaitMinutes);
    }
    return map;
  }, [metrics]);

  const maxWait = useMemo(() => {
    let max = 0;
    for (const m of metrics) if (m.avgWaitMinutes > max) max = m.avgWaitMinutes;
    return max || 60;
  }, [metrics]);

  const getColor = (wait: number): string => {
    if (wait === 0) return 'rgba(255,255,255,0.03)';
    const ratio = Math.min(1, wait / maxWait);
    if (ratio < 0.25) return `rgba(0, 212, 170, ${0.15 + ratio * 0.4})`;
    if (ratio < 0.5) return `rgba(244, 196, 48, ${0.2 + ratio * 0.4})`;
    if (ratio < 0.75) return `rgba(255, 107, 53, ${0.25 + ratio * 0.4})`;
    return `rgba(239, 68, 68, ${0.3 + ratio * 0.5})`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const cellW = 36;
  const cellH = 28;
  const labelW = 50;
  const labelH = 28;
  const width = labelW + hours.length * cellW + 16;
  const height = labelH + gunIds.length * cellH + 16;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <svg width={width} height={height} className="block">
        <g transform={`translate(${labelW}, 0)`}>
          {hours.map(h => (
            <text
              key={h}
              x={h * cellW + cellW / 2}
              y={labelH - 8}
              textAnchor="middle"
              className="fill-neutral-slate-dark text-[9px] font-mono"
            >
              {h % 3 === 0 ? formatHourLabel(h) : ''}
            </text>
          ))}
        </g>
        <g transform={`translate(0, ${labelH})`}>
          {gunIds.map((g, gi) => (
            <text
              key={g}
              x={labelW - 8}
              y={gi * cellH + cellH / 2 + 4}
              textAnchor="end"
              className="fill-neutral-slate-dark text-[10px] font-mono"
            >
              {g}
            </text>
          ))}
        </g>
        <g transform={`translate(${labelW}, ${labelH})`}>
          {gunIds.map((g, gi) =>
            hours.map(h => {
              const wait = data.get(`${h}|${g}`) || 0;
              const isHover = hovered?.hour === h && hovered?.gun === g;
              return (
                <rect
                  key={`${g}-${h}`}
                  x={h * cellW + 1}
                  y={gi * cellH + 1}
                  width={cellW - 2}
                  height={cellH - 2}
                  rx={1}
                  fill={getColor(wait)}
                  stroke={isHover ? 'rgba(0,212,170,0.8)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth={isHover ? 1.5 : 0.5}
                  style={{
                    transition: 'all 0.15s ease',
                    transform: isHover ? `translate(${cellW / 2}, ${cellH / 2}) scale(1.1) translate(${-cellW / 2}, ${-cellH / 2})` : 'none',
                    cursor: 'pointer',
                    transformOrigin: `${h * cellW + cellW / 2}px ${gi * cellH + cellH / 2}px`,
                  }}
                  onMouseEnter={() => setHovered({ hour: h, gun: g })}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })
          )}
        </g>
      </svg>
      {hovered && (
        <div className="fixed pointer-events-none z-50 bg-electric-blue border border-electric-green/30 rounded-sm px-3 py-2 text-xs shadow-xl">
          <div className="font-mono text-electric-green">{hovered.gun} · {formatHourLabel(hovered.hour)}</div>
          <div className="text-neutral-slate mt-0.5">
            平均等待 <span className="text-warning-orange font-semibold">
              {formatMinutes(data.get(`${hovered.hour}|${hovered.gun}`) || 0)}
            </span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4 mt-4 px-1">
        <span className="text-[10px] font-mono text-neutral-slate-dark">等待时长</span>
        <div className="flex items-center gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
            <div key={i} className="w-8 h-2 rounded-sm" style={{ background: getColor(r * maxWait) }} />
          ))}
        </div>
        <span className="text-[10px] font-mono text-neutral-slate-dark">0 → {maxWait.toFixed(0)}分钟</span>
      </div>
    </div>
  );
}
