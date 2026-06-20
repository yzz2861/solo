import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../common/Card';
import { NumberInput } from '../common/NumberInput';
import { RangeSlider } from '../common/RangeSlider';
import { useAppStore } from '../../store/useAppStore';
import { LoadPhase, PhaseNameType, PowerUnit, TimeUnit } from '../../types';
import {
  PHASE_COLORS,
  PHASE_ICONS,
  PHASE_LABELS,
} from '../../constants/defaults';
import { convertDurationToS, convertPowerToW } from '../../lib/units';
import { formatDurationSeconds, formatPercent, formatPowerWatts } from '../../lib/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const POWER_UNITS: readonly PowerUnit[] = ['uW', 'mW', 'W'] as const;
const TIME_UNITS: readonly TimeUnit[] = ['ms', 's', 'min', 'h'] as const;
const QUICK_ADD: { name: PhaseNameType; desc: string }[] = [
  { name: 'standby', desc: '待机' },
  { name: 'sampling', desc: '采样' },
  { name: 'wireless', desc: '无线' },
  { name: 'custom', desc: '自定义' },
];

export const PhaseList: React.FC = () => {
  const phases = useAppStore((s) => s.phases);
  const result = useAppStore((s) => s.result);
  const addPhase = useAppStore((s) => s.addPhase);

  const pieData = React.useMemo(() => {
    if (!result) {
      return phases.map((p) => ({
        id: p.id,
        name: getDisplayName(p),
        value: Math.max(0.1, p.dutyCycle * convertPowerToW(p.power, p.powerUnit)),
        color: PHASE_COLORS[p.name],
      }));
    }
    return result.phaseBreakdown_typical.map((b) => ({
      id: b.phaseId,
      name: b.displayName,
      value: Math.max(0.1, b.avgPowerW * 1000),
      color: PHASE_COLORS[b.phaseName as PhaseNameType] || '#a78bfa',
    }));
  }, [phases, result]);

  const totalAvg = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <Card
      id="phases"
      title="负载阶段配置"
      icon="📊"
      accent="success"
      animationDelay={0.08}
      titleExtra={
        <div className="flex items-center gap-2">
          {phases.length > 0 && result && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-success/15 text-success border border-success/25">
              平均 {formatPowerWatts(result.avgPowerDrawW_typical)}
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr,180px] gap-4">
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {phases.map((phase, idx) => (
                <PhaseRow key={phase.id} phase={phase} index={idx} />
              ))}
            </AnimatePresence>

            {phases.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 rounded-lg border-2 border-dashed border-custom/60 text-text-muted"
              >
                <div className="text-2xl mb-2">📭</div>
                <div className="text-sm">暂无负载阶段，点击下方按钮添加</div>
              </motion.div>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-muted mr-1">快速添加：</span>
              {QUICK_ADD.map((q) => (
                <button
                  key={q.name}
                  onClick={() => addPhase({ name: q.name })}
                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-custom hover:border-accent-primary/50 hover:bg-accent-primary/10 transition-all text-text-secondary hover:text-accent-primary"
                >
                  <span className="text-sm">{PHASE_ICONS[q.name]}</span>
                  <span>{q.desc}</span>
                  <span className="opacity-0 group-hover:opacity-100 text-accent-primary transition-opacity">+</span>
                </button>
              ))}
            </div>
          </div>

          {phases.length > 0 && totalAvg > 0 && (
            <div className="rounded-lg border border-custom bg-black/20 p-3 flex flex-col items-center justify-center min-h-[180px]">
              <div className="text-[11px] text-text-muted mb-1 font-medium tracking-wide">能耗占比</div>
              <div className="w-full h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={55}
                      paddingAngle={1.5}
                      dataKey="value"
                      stroke="rgba(10,22,40,0.8)"
                      strokeWidth={1.5}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name: string, props: any) => [
                        `${formatPercent((value / totalAvg) * 100, 1)} (${formatPowerWatts(value / 1000)})`,
                        props.payload.name,
                      ]}
                      contentStyle={{
                        background: 'rgba(10,22,40,0.95)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 mt-1">
                {pieData.map((d) => (
                  <div key={d.id} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[10px] text-text-muted">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

function getDisplayName(p: LoadPhase): string {
  return p.name === 'custom' && p.customName?.trim() ? p.customName.trim() : PHASE_LABELS[p.name];
}

const PhaseRow: React.FC<{ phase: LoadPhase; index: number }> = ({ phase, index }) => {
  const updatePhase = useAppStore((s) => s.updatePhase);
  const removePhase = useAppStore((s) => s.removePhase);
  const [expanded, setExpanded] = React.useState(true);

  const color = PHASE_COLORS[phase.name];
  const displayName = getDisplayName(phase);
  const avgPowerW =
    convertPowerToW(phase.power, phase.powerUnit) *
    convertDurationToS(phase.duration, phase.durationUnit) *
    (phase.dutyCycle / 100);

  return (
    <motion.div
      id={`phase-${phase.id}`}
      layout
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.03,
      }}
      className="rounded-lg border border-custom bg-black/15 hover:border-border-strong transition-colors overflow-hidden"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-base"
          style={{ background: `${color}22`, border: `1px solid ${color}44` }}
        >
          {PHASE_ICONS[phase.name]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {phase.name === 'custom' ? (
              <input
                value={phase.customName || ''}
                placeholder="自定义阶段名"
                onChange={(e) => {
                  e.stopPropagation();
                  updatePhase(phase.id, { customName: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent outline-none border-b border-dashed border-text-muted/50 focus:border-accent-primary text-sm font-semibold text-text-primary min-w-[80px] w-auto"
              />
            ) : (
              <span className="text-sm font-semibold text-text-primary">{displayName}</span>
            )}
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: `${color}22`, color }}
            >
              {formatPercent(phase.dutyCycle, 0)} 占比
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              ≈ {formatPowerWatts(avgPowerW)}
            </span>
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">
            {formatPowerWatts(convertPowerToW(phase.power, phase.powerUnit))} × {formatDurationSeconds(convertDurationToS(phase.duration, phase.durationUnit))}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`删除阶段「${displayName}」？`)) removePhase(phase.id);
            }}
            className="w-7 h-7 rounded-md text-text-muted hover:text-danger hover:bg-danger/15 flex items-center justify-center transition-colors"
            title="删除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <motion.span
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-6 rounded-md text-text-muted flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-3 pb-3 pt-0 space-y-3 border-t border-custom/60">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
                <NumberInput
                  label="功耗"
                  value={phase.power}
                  onChange={(v) => updatePhase(phase.id, { power: v })}
                  min={0}
                  step={phase.powerUnit === 'W' ? 0.01 : phase.powerUnit === 'mW' ? 1 : 10}
                  decimals={phase.powerUnit === 'W' ? 3 : 0}
                  unitOptions={POWER_UNITS}
                  selectedUnit={phase.powerUnit}
                  onUnitChange={(u) => updatePhase(phase.id, { powerUnit: u as PowerUnit })}
                />
                <NumberInput
                  label="持续时间"
                  value={phase.duration}
                  onChange={(v) => updatePhase(phase.id, { duration: v })}
                  min={0}
                  step={phase.durationUnit === 'ms' ? 10 : phase.durationUnit === 's' ? 0.1 : 1}
                  decimals={phase.durationUnit === 's' ? 1 : 0}
                  unitOptions={TIME_UNITS}
                  selectedUnit={phase.durationUnit}
                  onUnitChange={(u) => updatePhase(phase.id, { durationUnit: u as TimeUnit })}
                />
                <NumberInput
                  label="最差功耗倍率"
                  suffix="×"
                  value={phase.worstCaseMultiplier}
                  onChange={(v) => updatePhase(phase.id, { worstCaseMultiplier: v })}
                  min={1}
                  max={5}
                  step={0.1}
                  decimals={2}
                  hint="最差场景下的额外功耗放大"
                />
                <NumberInput
                  label="最差点时长倍率"
                  suffix="×"
                  value={phase.worstCaseDurationMultiplier}
                  onChange={(v) => updatePhase(phase.id, { worstCaseDurationMultiplier: v })}
                  min={1}
                  max={5}
                  step={0.1}
                  decimals={2}
                  hint="最差场景下时长拉长倍率"
                />
              </div>

              <RangeSlider
                label={`占空比 / 循环占比`}
                value={phase.dutyCycle}
                onChange={(v) => updatePhase(phase.id, { dutyCycle: v })}
                min={0}
                max={100}
                step={0.5}
                valueFormatter={(v) => `${v.toFixed(1)}%`}
                accentColor={color}
                showMarkers
                markerCount={5}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
