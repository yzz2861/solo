import React from 'react';
import type { SimulationResult } from '@/utils/heatLoadCalc';
import { formatDurationString } from '@/utils/unitConverter';

interface ComparisonChartProps {
  simulation: SimulationResult;
  originalCount: number;
  originalDuration: number;
}

export default function ComparisonChart({
  simulation,
  originalCount,
  originalDuration,
}: ComparisonChartProps) {
  const metrics = [
    {
      label: '总热负荷',
      unit: 'kW',
      original: simulation.originalTotalHeat,
      improved: simulation.simulatedTotalHeat,
      format: (v: number) => v.toFixed(2),
    },
    {
      label: '温升',
      unit: '°C',
      original: simulation.originalTempRise,
      improved: simulation.simulatedTempRise,
      format: (v: number) => v.toFixed(1),
    },
    {
      label: '日耗电',
      unit: 'kWh',
      original: simulation.originalDailyEnergy,
      improved: simulation.simulatedDailyEnergy,
      format: (v: number) => v.toFixed(1),
    },
    {
      label: '负荷率',
      unit: '%',
      original: simulation.originalLoadRate,
      improved: simulation.simulatedLoadRate,
      format: (v: number) => v.toFixed(0),
    },
  ];

  const maxVal = Math.max(...metrics.map((m) => m.original));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="text-xs text-emerald-400 mb-1">改善方案</div>
        <div className="text-sm text-slate-300">
          开门次数：{originalCount} → <span className="text-emerald-400 font-bold">{simulation.reducedCount}</span> 次/天
        </div>
        <div className="text-sm text-slate-300">
          平均时长：{formatDurationString(originalDuration)} →{' '}
          <span className="text-emerald-400 font-bold">{formatDurationString(simulation.reducedDuration)}</span>
        </div>
      </div>

      {metrics.map((metric) => {
        const originalPercent = maxVal > 0 ? (metric.original / maxVal) * 100 : 0;
        const improvedPercent = maxVal > 0 ? (metric.improved / maxVal) * 100 : 0;
        const reduction = metric.original - metric.improved;

        return (
          <div key={metric.label} className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{metric.label}</span>
              <span className="text-emerald-400 font-mono">
                ↓ {metric.format(reduction)} {metric.unit}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-6">原</span>
                <div className="flex-1 h-3 rounded bg-slate-700/50 overflow-hidden">
                  <div
                    className="h-full rounded bg-red-500/60 transition-all duration-500"
                    style={{ width: `${originalPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-400 w-16 text-right">
                  {metric.format(metric.original)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-6">新</span>
                <div className="flex-1 h-3 rounded bg-slate-700/50 overflow-hidden">
                  <div
                    className="h-full rounded bg-emerald-500/60 transition-all duration-500"
                    style={{ width: `${improvedPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-emerald-400 w-16 text-right">
                  {metric.format(metric.improved)}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-2">
        <h4 className="text-sm font-semibold text-amber-400">年度收益估算</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-700/30 p-3">
            <div className="text-[10px] text-slate-500">年节电量</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {simulation.annualEnergySaving.toFixed(0)}
            </div>
            <div className="text-[10px] text-slate-500">kWh</div>
          </div>
          <div className="rounded-lg bg-slate-700/30 p-3">
            <div className="text-[10px] text-slate-500">年省电费</div>
            <div className="text-lg font-bold font-mono text-amber-400">
              ¥{simulation.annualCostSaving.toFixed(0)}
            </div>
            <div className="text-[10px] text-slate-500">元</div>
          </div>
        </div>
        <div className="text-xs text-slate-500 leading-relaxed">
          按 COP=3.0、电价 0.85 元/kWh 估算，实际收益因设备效率和电价不同而异
        </div>
      </div>
    </div>
  );
}
