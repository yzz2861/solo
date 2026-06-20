import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatNumber, formatPercent, formatDurationSeconds, formatPowerWatts } from '../../lib/formatters';
import { PHASE_COLORS } from '../../constants/defaults';
import { PhaseNameType } from '../../types';

function heatColor(percent: number): { bg: string; text: string } {
  const abs = Math.abs(percent);
  if (abs < 5) return { bg: 'rgba(16,185,129,0.18)', text: 'var(--success)' };
  if (abs < 15) return { bg: 'rgba(16,185,129,0.10)', text: '#34d399' };
  if (abs < 25) return { bg: 'rgba(255,159,67,0.15)', text: 'var(--warning)' };
  if (abs < 40) return { bg: 'rgba(239,68,68,0.18)', text: 'var(--danger)' };
  return { bg: 'rgba(239,68,68,0.30)', text: 'var(--danger)' };
}

function optimismBadge(optimistic: boolean, deviation: number) {
  if (optimistic) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded bg-danger/20 text-danger border border-danger/35 font-semibold">
        <span>⚠️</span>偏乐观
      </span>
    );
  }
  if (deviation > 5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded bg-success/20 text-success border border-success/35 font-semibold">
        <span>✓</span>保守
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded bg-info/15 text-info border border-info/30">
      吻合
    </span>
  );
}

export const DeviationHeatmap: React.FC = () => {
  const comparison = useAppStore((s) => s.comparison);
  if (!comparison) return null;

  const sorted = [...comparison.phaseDeviations].sort(
    (a, b) => (b.powerDeviation < 0 ? Math.abs(b.powerDeviation) : 0) - (a.powerDeviation < 0 ? Math.abs(a.powerDeviation) : 0)
  );

  return (
    <div className="rounded-lg border border-custom bg-black/20 p-3.5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔥</span>
          <span className="text-xs font-semibold text-text-primary">阶段偏差热力图</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: 'rgba(16,185,129,0.35)' }} />
            <span>保守</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: 'rgba(255,159,67,0.35)' }} />
            <span>偏差</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.45)' }} />
            <span>偏乐观</span>
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {sorted.map((d) => {
          const color = PHASE_COLORS[d.phaseName as PhaseNameType] || '#a78bfa';
          const pColor = heatColor(d.powerDeviation);
          const dColor = heatColor(d.durationDeviation);

          return (
            <div
              key={d.phaseId}
              className={`rounded-md border p-2.5 transition-all ${
                d.optimistic ? 'border-danger/40 bg-danger/[0.04]' : 'border-custom bg-black/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-1.5 h-6 rounded-full"
                  style={{ background: color, boxShadow: `0 0 6px ${color}66` }}
                />
                <span className="text-[12px] font-semibold text-text-primary">{d.displayName}</span>
                {optimismBadge(d.optimistic, d.powerDeviation)}
                <span className="ml-auto text-[10px] font-mono text-text-muted">
                  影响分 {formatNumber(d.impactScore, 1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="text-[9.5px] text-text-muted mb-1 flex items-center justify-between">
                    <span>功耗偏差</span>
                    <span className="font-mono" style={{ color: pColor.text }}>
                      {formatPercent(d.powerDeviation, 1)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="relative h-5 rounded bg-black/40 border border-custom/50 overflow-hidden">
                      <div
                        className={`absolute top-0 bottom-0 ${
                          d.powerDeviation < 0 ? 'right-1/2' : 'left-1/2'
                        } transition-all duration-500`}
                        style={{
                          width: `${Math.min(48, Math.abs(d.powerDeviation) / 2)}%`,
                          background: pColor.bg,
                        }}
                      />
                      <div className="absolute inset-y-0 left-1/2 w-px bg-text-muted/40" />
                    </div>
                    <div className="flex justify-between text-[9.5px] font-mono">
                      <span className="text-text-secondary">
                        估算 {formatPowerWatts(d.estimatedPowerW)}
                      </span>
                      <span className="text-text-primary">
                        → 实测 {formatPowerWatts(d.measuredPowerW)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[9.5px] text-text-muted mb-1 flex items-center justify-between">
                    <span>时长偏差</span>
                    <span className="font-mono" style={{ color: dColor.text }}>
                      {formatPercent(d.durationDeviation, 1)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="relative h-5 rounded bg-black/40 border border-custom/50 overflow-hidden">
                      <div
                        className={`absolute top-0 bottom-0 ${
                          d.durationDeviation < 0 ? 'right-1/2' : 'left-1/2'
                        } transition-all duration-500`}
                        style={{
                          width: `${Math.min(48, Math.abs(d.durationDeviation) / 2)}%`,
                          background: dColor.bg,
                        }}
                      />
                      <div className="absolute inset-y-0 left-1/2 w-px bg-text-muted/40" />
                    </div>
                    <div className="flex justify-between text-[9.5px] font-mono">
                      <span className="text-text-secondary">
                        估算 {formatDurationSeconds(d.estimatedDurationS)}
                      </span>
                      <span className="text-text-primary">
                        → 实测 {formatDurationSeconds(d.measuredDurationS)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {comparison.phaseDeviations.length === 0 && (
          <div className="text-center py-6 text-[11px] text-text-muted">
            当前测试未填写各阶段实测数据，仅做总续航对比
          </div>
        )}
      </div>
    </div>
  );
};
