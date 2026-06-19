interface MoistureGaugeProps {
  value: number;
}

function getMoistureLabel(value: number): string {
  if (value >= 80) return '积水';
  if (value >= 60) return '偏湿';
  if (value >= 35) return '适宜';
  if (value >= 20) return '偏干';
  return '干涸';
}

function getGaugeColor(value: number): string {
  if (value >= 80) return '#1E40AF';
  if (value >= 60) return '#3B82F6';
  if (value >= 35) return '#22C55E';
  if (value >= 20) return '#F97316';
  return '#EF4444';
}

export default function MoistureGauge({ value }: MoistureGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = getGaugeColor(clamped);
  const label = getMoistureLabel(clamped);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            stroke="#E7E5E4"
            strokeWidth={10}
          />
          <circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-stone-800">{Math.round(clamped)}</span>
          <span className="text-xs text-stone-400">%</span>
        </div>
      </div>
      <span className="mt-1 text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}
