import { useMemo } from 'react';

interface Props {
  distribution: number[];
}

const BUCKETS = ['0-5', '5-10', '10-15', '15-20', '20-30', '30-45', '45-60', '60-90', '90+'];

export default function WaitDistributionChart({ distribution }: Props) {
  const { width, height, padding } = { width: 600, height: 200, padding: { top: 20, right: 16, bottom: 32, left: 40 } };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = useMemo(() => Math.max(...distribution, 1), [distribution]);
  const total = distribution.reduce((a, b) => a + b, 0) || 1;

  const barW = (innerW / BUCKETS.length) * 0.7;
  const gap = (innerW / BUCKETS.length) * 0.3;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={padding.top + innerH * (1 - r)}
            x2={width - padding.right}
            y2={padding.top + innerH * (1 - r)}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2 3"
          />
          <text
            x={padding.left - 6}
            y={padding.top + innerH * (1 - r) + 3}
            textAnchor="end"
            className="fill-neutral-slate-dark text-[9px] font-mono"
          >
            {Math.round(max * r)}
          </text>
        </g>
      ))}

      {distribution.map((count, i) => {
        const h = (count / max) * innerH;
        const pct = (count / total * 100).toFixed(1);
        return (
          <g key={i}>
            <rect
              x={padding.left + i * (barW + gap) + gap / 2}
              y={padding.top + innerH - h}
              width={barW}
              height={h}
              fill="url(#histGrad)"
              rx={1}
            />
            {count > 0 && (
              <text
                x={padding.left + i * (barW + gap) + gap / 2 + barW / 2}
                y={padding.top + innerH - h - 4}
                textAnchor="middle"
                className="fill-electric-green text-[9px] font-mono"
              >
                {pct}%
              </text>
            )}
            <text
              x={padding.left + i * (barW + gap) + gap / 2 + barW / 2}
              y={padding.top + innerH + 16}
              textAnchor="middle"
              className="fill-neutral-slate-dark text-[9px] font-mono"
            >
              {BUCKETS[i]}
            </text>
          </g>
        );
      })}

      <text x={padding.left} y={padding.top - 6} className="fill-neutral-slate-dark text-[10px] font-mono">
        订单数 (共 {total} 笔)
      </text>
      <text x={width - padding.right} y={height - 6} textAnchor="end" className="fill-neutral-slate-dark text-[10px] font-mono">
        等待时长 (分钟)
      </text>
    </svg>
  );
}
