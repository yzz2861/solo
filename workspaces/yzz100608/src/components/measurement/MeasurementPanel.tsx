import React from 'react';
import { Card } from '../common/Card';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { DeviationHeatmap } from './DeviationHeatmap';
import { ComparisonReport } from './ComparisonReport';
import { useAppStore } from '../../store/useAppStore';
import { convertDurationToS, convertPowerToW } from '../../lib/units';
import { formatDurationHoursDetailed, formatNumber, formatTemperature } from '../../lib/formatters';
import { PHASE_COLORS, PHASE_ICONS, PHASE_LABELS } from '../../constants/defaults';
import { PhaseMeasurement, MeasurementRecord } from '../../types';

export const MeasurementPanel: React.FC = () => {
  const phases = useAppStore((s) => s.phases);
  const result = useAppStore((s) => s.result);
  const measurements = useAppStore((s) => s.measurements);
  const selectedId = useAppStore((s) => s.selectedMeasurementId);
  const comparison = useAppStore((s) => s.comparison);
  const addMeasurement = useAppStore((s) => s.addMeasurement);
  const removeMeasurement = useAppStore((s) => s.removeMeasurement);
  const selectMeasurement = useAppStore((s) => s.selectMeasurement);
  const corrections = useAppStore((s) => s.corrections);

  const [measuredHours, setMeasuredHours] = React.useState<number>(0);
  const [notes, setNotes] = React.useState<string>('');
  const [recordTemp, setRecordTemp] = React.useState<number>(corrections.ambientTemperature);
  const [phaseVals, setPhaseVals] = React.useState<Record<string, { power: number; duration: number }>>({});

  React.useEffect(() => {
    setRecordTemp(corrections.ambientTemperature);
  }, [corrections.ambientTemperature]);

  React.useEffect(() => {
    const init: Record<string, { power: number; duration: number }> = {};
    phases.forEach((p) => {
      init[p.id] = {
        power: convertPowerToW(p.power, p.powerUnit) * 1000,
        duration: convertDurationToS(p.duration, p.durationUnit),
      };
    });
    setPhaseVals((prev) => {
      const merged = { ...init };
      Object.keys(prev).forEach((k) => {
        if (merged[k]) merged[k] = { ...merged[k], ...prev[k] };
      });
      return merged;
    });
  }, [phases]);

  const handleSubmit = () => {
    if (!measuredHours || measuredHours <= 0) {
      alert('请填写实测续航时长');
      return;
    }
    const phaseMeasurements: PhaseMeasurement[] = phases.map((p) => {
      const v = phaseVals[p.id] || { power: 0, duration: 0 };
      return {
        phaseId: p.id,
        measuredPower: v.power / 1000,
        measuredDuration: v.duration,
      };
    });
    const record: Omit<MeasurementRecord, 'id' | 'date'> = {
      measuredEnduranceHours: measuredHours,
      temperature: recordTemp,
      notes: notes.trim(),
      phaseMeasurements,
    };
    addMeasurement(record);
    setMeasuredHours(0);
    setNotes('');
  };

  const canSubmit = !!result && measuredHours > 0 && phases.length > 0;

  return (
    <Card
      id="measurements"
      title="实测对比中心"
      icon="🧪"
      accent="warning"
      animationDelay={0.2}
      titleExtra={
        measurements.length > 0 && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-info/15 text-info border border-info/25">
            {measurements.length} 条记录
          </span>
        )
      }
    >
      <div className="space-y-4">
        {result ? (
          <>
            <div className="rounded-lg border border-custom bg-black/20 p-3.5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">✏️</span>
                <span className="text-xs font-semibold text-text-primary">录入新测试数据</span>
                <span className="ml-auto text-[10.5px] text-text-muted">测试工程师专用</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                <div>
                  <label className="text-xs font-medium text-text-secondary tracking-wide block mb-1.5">
                    实测续航时长
                    {result && (
                      <span className="ml-2 text-[10px] text-text-muted font-mono">
                        估算典型 {formatNumber(result.typicalHours, 2)} h
                      </span>
                    )}
                  </label>
                  <div className="flex items-stretch rounded-md overflow-hidden border border-custom focus-within:border-accent-primary focus-within:shadow-[0_0_0_3px_rgba(0,212,170,0.15)] bg-[rgba(10,22,40,0.65)]">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={measuredHours || ''}
                      onChange={(e) => setMeasuredHours(parseFloat(e.target.value) || 0)}
                      placeholder="输入实测值…"
                      className="flex-1 min-w-0 bg-transparent outline-none text-text-primary py-2 px-3 text-sm font-mono"
                    />
                    <div className="flex items-center px-3 text-text-muted border-l border-custom text-xs font-medium">小时</div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary tracking-wide block mb-1.5">
                    测试温度
                    <span className="ml-2 text-[10px] text-text-muted font-mono">
                      假设 {formatTemperature(corrections.ambientTemperature)}
                    </span>
                  </label>
                  <div className="flex items-stretch rounded-md overflow-hidden border border-custom focus-within:border-accent-primary focus-within:shadow-[0_0_0_3px_rgba(0,212,170,0.15)] bg-[rgba(10,22,40,0.65)]">
                    <input
                      type="number"
                      step="1"
                      value={recordTemp}
                      onChange={(e) => setRecordTemp(parseFloat(e.target.value) || 0)}
                      className="flex-1 min-w-0 bg-transparent outline-none text-text-primary py-2 px-3 text-sm font-mono"
                    />
                    <div className="flex items-center px-3 text-text-muted border-l border-custom text-xs font-medium">℃</div>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="text-xs font-medium text-text-secondary tracking-wide block mb-1.5">
                  测试备注
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="如：低温柜测试 / 固件版本 / 采样频率 / 信号强度等"
                  className="input-base min-h-[52px] resize-y"
                  rows={2}
                />
              </div>

              <div className="space-y-2 mb-3">
                <div className="text-[11px] text-text-muted flex items-center justify-between">
                  <span className="font-medium">各阶段实测数据（功耗 mW / 时长 s）</span>
                  <span className="text-text-muted/70">估算值已自动填充，可修改</span>
                </div>
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {phases.map((phase) => {
                    const color = PHASE_COLORS[phase.name as keyof typeof PHASE_COLORS] || '#a78bfa';
                    const estPowerMw = convertPowerToW(phase.power, phase.powerUnit) * 1000;
                    const estDurationS = convertDurationToS(phase.duration, phase.durationUnit);
                    const cur = phaseVals[phase.id];
                    return (
                      <div
                        key={phase.id}
                        className="grid grid-cols-[auto,1fr,1fr] items-start gap-2 px-2.5 py-2 rounded-md bg-black/30 border border-custom/60"
                      >
                        <div className="flex items-start gap-2 min-w-0 pt-1.5 col-span-1">
                          <span
                            className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs"
                            style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                          >
                            {PHASE_ICONS[phase.name as keyof typeof PHASE_ICONS] || '⚙️'}
                          </span>
                          <span className="text-[11px] font-medium text-text-primary truncate pt-0.5">
                            {phase.name === 'custom' && phase.customName?.trim()
                              ? phase.customName.trim()
                              : PHASE_LABELS[phase.name as keyof typeof PHASE_LABELS] || phase.name}
                          </span>
                        </div>
                        <div className="min-w-0 col-span-1">
                          <div className="text-[9.5px] text-text-muted mb-0.5 px-1">功耗 (mW)</div>
                          <input
                            type="number"
                            step="1"
                            value={cur?.power ?? estPowerMw}
                            onChange={(e) =>
                              setPhaseVals((prev) => ({
                                ...prev,
                                [phase.id]: {
                                  power: parseFloat(e.target.value) || 0,
                                  duration: prev[phase.id]?.duration ?? estDurationS,
                                },
                              }))
                            }
                            className="input-base !py-1 !text-xs w-full"
                          />
                          <div className="text-[9px] text-text-muted/80 mt-0.5 px-1">
                            估算 {formatNumber(estPowerMw, 0)} mW
                          </div>
                        </div>
                        <div className="min-w-0 col-span-1">
                          <div className="text-[9.5px] text-text-muted mb-0.5 px-1">时长 (s)</div>
                          <input
                            type="number"
                            step="0.01"
                            value={cur?.duration ?? estDurationS}
                            onChange={(e) =>
                              setPhaseVals((prev) => ({
                                ...prev,
                                [phase.id]: {
                                  power: prev[phase.id]?.power ?? estPowerMw,
                                  duration: parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                            className="input-base !py-1 !text-xs w-full"
                          />
                          <div className="text-[9px] text-text-muted/80 mt-0.5 px-1">
                            估算 {formatNumber(estDurationS, 2)} s
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full btn-primary !py-2.5 !text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>📝 保存测试记录并对比分析</span>
              </button>
            </div>

            {measurements.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                    <span>📚 历史记录</span>
                  </span>
                  {comparison && selectedId && (
                    <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-black/30 border border-custom text-text-secondary">
                      偏差 {formatNumber(comparison.deviationPercent, 1)}%
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {measurements.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => selectMeasurement(m.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                        selectedId === m.id
                          ? 'border-accent-primary/50 bg-accent-primary/8 shadow-[0_0_0_3px_rgba(0,212,170,0.1)]'
                          : 'border-custom bg-black/20 hover:border-border-strong hover:bg-black/30'
                      }`}
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-info/15 border border-info/30 flex items-center justify-center text-sm">
                        🧪
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <AnimatedNumber
                            value={m.measuredEnduranceHours}
                            decimals={2}
                            formatFn={(v) => formatDurationHoursDetailed(v)}
                            className="text-[12px] font-mono font-semibold text-text-primary"
                          />
                          <span className="text-[10px] text-text-muted">{m.date}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-text-secondary border border-custom/60">
                            {formatTemperature(m.temperature)}
                          </span>
                        </div>
                        {m.notes && (
                          <div className="text-[10.5px] text-text-muted truncate mt-0.5">💬 {m.notes}</div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('删除这条测试记录？')) removeMeasurement(m.id);
                        }}
                        className="w-6 h-6 rounded text-text-muted hover:text-danger hover:bg-danger/15 flex items-center justify-center transition-colors"
                        title="删除"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {comparison && selectedId && (
              <>
                <DeviationHeatmap />
                <ComparisonReport />
              </>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-text-muted">
            <div className="text-3xl mb-2">🧪</div>
            <p className="text-sm">完成续航估算后，即可录入实测数据进行对比</p>
            {phases.length === 0 && (
              <p className="text-[11px] text-text-muted/80 mt-1">请先至少配置一个负载阶段</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
