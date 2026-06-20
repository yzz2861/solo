import React from 'react';
import { Flame, Snowflake, Zap, Activity } from 'lucide-react';
import type { HeatLoadResult } from '@/utils/heatLoadCalc';
import GaugeChart from './GaugeChart';
import RiskIndicator from './RiskIndicator';

interface ResultCardProps {
  result: HeatLoadResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const heatBreakdown = [
    { label: '显热', value: result.sensibleHeat, color: '#f97316', icon: <Flame className="h-3.5 w-3.5" /> },
    { label: '潜热', value: result.latentHeat, color: '#3b82f6', icon: <Zap className="h-3.5 w-3.5" /> },
    { label: '进货', value: result.goodsHeat, color: '#8b5cf6', icon: <Snowflake className="h-3.5 w-3.5" /> },
  ];

  const total = result.totalHeat;
  const pieData = heatBreakdown.map((item) => ({
    ...item,
    percent: total > 0 ? (item.value / total) * 100 : 0,
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sky-400">
          <Flame className="h-4 w-4" />
          <h3 className="text-sm font-semibold">热负荷汇总</h3>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">总额外热负荷</div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono text-orange-400">
                {result.totalHeat.toFixed(2)}
              </span>
              <span className="text-sm text-slate-400">kW</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              日累计 {result.dailyEnergy.toFixed(1)} kWh
            </div>
          </div>

          <div className="flex items-center justify-center">
            <svg width="100" height="100" viewBox="0 0 100 100">
              {(() => {
                let currentAngle = -90;
                const cx = 50, cy = 50, r = 35;
                const paths = pieData.map((item, i) => {
                  const angle = (item.percent / 100) * 360;
                  const startRad = (currentAngle * Math.PI) / 180;
                  const endRad = ((currentAngle + angle) * Math.PI) / 180;
                  const x1 = cx + r * Math.cos(startRad);
                  const y1 = cy + r * Math.sin(startRad);
                  const x2 = cx + r * Math.cos(endRad);
                  const y2 = cy + r * Math.sin(endRad);
                  const largeArc = angle > 180 ? 1 : 0;
                  const d = angle >= 360
                    ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
                    : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  currentAngle += angle;
                  return <path key={i} d={d} fill={item.color} opacity={0.8} />;
                });
                return paths;
              })()}
              <circle cx="50" cy="50" r="20" fill="#1e293b" />
              <text x="50" y="48" textAnchor="middle" className="text-[8px] fill-slate-400">热负荷</text>
              <text x="50" y="58" textAnchor="middle" className="text-[7px] fill-slate-500">分解</text>
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          {pieData.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400">{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-300">{item.value.toFixed(2)} kW</span>
                <span className="text-slate-500 w-10 text-right">{item.percent.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sky-400">
          <Activity className="h-4 w-4" />
          <h3 className="text-sm font-semibold">压缩机评估</h3>
        </div>
        <div className="flex justify-around">
          <GaugeChart
            value={result.loadRate}
            max={150}
            label="负荷率"
            unit="%"
          />
          <GaugeChart
            value={result.compressorPressureHigh}
            max={2.5}
            label="高压侧压力"
            unit="MPa"
            colorFn={(r) => {
              if (r < 0.6) return '#22c55e';
              if (r < 0.8) return '#f59e0b';
              return '#ef4444';
            }}
          />
        </div>
        {result.loadRate > 100 && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            ⚠ 负荷率超过100%，压缩机可能无法维持目标温度！
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-700/30 px-3 py-2">
            <div className="text-slate-500">低压侧</div>
            <div className="font-mono text-slate-300">{result.compressorPressure.toFixed(3)} MPa</div>
          </div>
          <div className="rounded-lg bg-slate-700/30 px-3 py-2">
            <div className="text-slate-500">冷凝温度</div>
            <div className="font-mono text-slate-300">{result.condensingTemp.toFixed(1)}°C</div>
          </div>
        </div>
      </div>

      <RiskIndicator level={result.riskLevel} tempRise={result.tempRise} />

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-sky-400">改善建议</h3>
        <ul className="space-y-2 text-xs text-slate-400">
          <li className="flex gap-2">
            <span className="text-sky-500">•</span>
            <span>出入库做到"快进快出"，尽量控制在3分钟以内</span>
          </li>
          <li className="flex gap-2">
            <span className="text-sky-500">•</span>
            <span>减少不必要的开门次数，合并装卸作业</span>
          </li>
          <li className="flex gap-2">
            <span className="text-sky-500">•</span>
            <span>安装门帘或风幕机，减少冷气外泄</span>
          </li>
          {result.latentHeat > result.sensibleHeat && (
            <li className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>潜热负荷占比高，高温高湿天气尤其要缩短开门时间</span>
            </li>
          )}
          {result.goodsHeat > result.sensibleHeat && (
            <li className="flex gap-2">
              <span className="text-violet-500">•</span>
              <span>进货热负荷大，建议预冷后再入库</span>
            </li>
          )}
          <li className="flex gap-2">
            <span className="text-sky-500">•</span>
            <span>使用快速卷帘门替代手动推拉门</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
