import React from 'react';

interface GaugeChartProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  colorFn?: (ratio: number) => string;
}

export default function GaugeChart({ value, max, label, unit, colorFn }: GaugeChartProps) {
  const ratio = Math.min(value / Math.max(max, 0.01), 1.5);
  const clampedRatio = Math.min(ratio, 1);
  const angle = -90 + clampedRatio * 180;

  const defaultColorFn = (r: number) => {
    if (r < 0.6) return '#22c55e';
    if (r < 0.85) return '#f59e0b';
    return '#ef4444';
  };

  const color = (colorFn || defaultColorFn)(ratio);

  const centerX = 60;
  const centerY = 55;
  const radius = 40;

  const startX = centerX + radius * Math.cos((-90 * Math.PI) / 180);
  const startY = centerY + radius * Math.sin((-90 * Math.PI) / 180);
  const endX = centerX + radius * Math.cos((90 * Math.PI) / 180);
  const endY = centerY + radius * Math.sin((90 * Math.PI) / 180);
  const valueX = centerX + radius * Math.cos((angle * Math.PI) / 180);
  const valueY = centerY + radius * Math.sin((angle * Math.PI) / 180);

  const largeArc = clampedRatio > 0.5 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
          fill="none"
          stroke="#334155"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${valueX} ${valueY}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx={valueX} cy={valueY} r="4" fill={color} />
      </svg>
      <div className="text-center -mt-1">
        <div className="text-lg font-bold font-mono" style={{ color }}>
          {value.toFixed(1)}
        </div>
        <div className="text-[10px] text-slate-500">{unit}</div>
      </div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
