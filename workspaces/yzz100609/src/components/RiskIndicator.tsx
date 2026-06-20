import React from 'react';

interface RiskIndicatorProps {
  level: 'safe' | 'caution' | 'danger';
  tempRise: number;
}

const config = {
  safe: {
    label: '安全',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    barColor: 'bg-emerald-500',
  },
  caution: {
    label: '需注意',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    barColor: 'bg-amber-500',
  },
  danger: {
    label: '危险',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    barColor: 'bg-red-500',
  },
};

export default function RiskIndicator({ level, tempRise }: RiskIndicatorProps) {
  const c = config[level];
  const barPercent = Math.min((tempRise / 8) * 100, 100);

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">温升风险等级</span>
        <span className={`text-sm font-bold ${c.color}`}>{c.label}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">预估温升</span>
          <span className={`font-mono font-bold ${c.color}`}>{tempRise.toFixed(1)}°C</span>
        </div>
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full ${c.barColor} transition-all duration-700`}
            style={{ width: `${barPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>0°C</span>
          <span>2°C</span>
          <span>5°C</span>
          <span>8°C+</span>
        </div>
      </div>
      {level === 'danger' && (
        <p className="text-xs text-red-400/80 leading-relaxed">
          库温将明显上升，货物品质和食品安全面临风险，必须立即减少开门次数和时长！
        </p>
      )}
      {level === 'caution' && (
        <p className="text-xs text-amber-400/80 leading-relaxed">
          当前开门习惯会导致库温波动，建议优化开门操作，缩短时长、减少频次。
        </p>
      )}
    </div>
  );
}
