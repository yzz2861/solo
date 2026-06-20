import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { useAppStore } from '../../store/useAppStore';
import {
  formatDurationHoursCompact,
  formatDurationHoursDetailed,
  formatNumber,
  formatPercent,
  formatPowerWatts,
  formatWh,
} from '../../lib/formatters';
import { PHASE_COLORS } from '../../constants/defaults';
import { PhaseNameType } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export const ResultPMView: React.FC = () => {
  const result = useAppStore((s) => s.result)!;
  const phases = useAppStore((s) => s.phases);

  const ratio = result.worstCaseHours > 0 ? result.typicalHours / result.worstCaseHours : 1;
  const chartData = result.phaseBreakdown_typical.map((b) => ({
    id: b.phaseId,
    name: b.displayName.length > 6 ? b.displayName.slice(0, 6) : b.displayName,
    fullName: b.displayName,
    typical: b.avgPowerW * 1000,
    share: b.energyShare,
    color: PHASE_COLORS[b.phaseName as PhaseNameType] || '#a78bfa',
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <DurationCard
          label="典型续航"
          hours={result.typicalHours}
          color="success"
          icon="✨"
          gradient="from-emerald-400/30 via-green-500/20 to-transparent"
          borderColor="border-success/40"
          ringColor="--success"
        />
        <DurationCard
          label="最差续航"
          hours={result.worstCaseHours}
          color="danger"
          icon="🔥"
          gradient="from-rose-500/30 via-red-500/20 to-transparent"
          borderColor="border-danger/40"
          ringColor="--danger"
        />
      </div>

      <div className="rounded-lg border border-custom bg-black/20 p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-medium text-text-secondary">典型 / 最差 区间对比</span>
          <span className="text-[11px] font-mono text-text-muted">
            典型比最差高 {formatPercent((ratio - 1) * 100, 0)}
          </span>
        </div>
        <WorstCaseTimeline
          typicalHours={result.typicalHours}
          worstHours={result.worstCaseHours}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatMini
          label="额定能量"
          value={formatWh(result.nominalCapacityWh)}
          icon="🔋"
        />
        <StatMini
          label="典型可用"
          value={formatWh(result.availableCapacityWh_typical)}
          icon="✅"
          accent="success"
        />
        <StatMini
          label="平均功耗 (典型)"
          value={formatPowerWatts(result.avgPowerDrawW_typical)}
          icon="⚡"
        />
        <StatMini
          label="容量保留率"
          value={formatPercent(result.usableCapacityRatio * 100, 0)}
          icon="📉"
          accent={result.usableCapacityRatio > 0.75 ? 'success' : result.usableCapacityRatio > 0.55 ? 'warning' : 'danger'}
        />
      </div>

      {chartData.length > 0 && (
        <div className="rounded-lg border border-custom bg-black/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">各阶段平均功耗贡献</span>
            <span className="text-[10px] text-text-muted">单位：mW（时间加权）</span>
          </div>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  width={42}
                  tickFormatter={(v) => `${Math.round(v)}`}
                />
                <Tooltip
                  formatter={(value: number, _n: string, props: any) => [
                    `${formatNumber(value, 1)} mW · 占比 ${formatPercent(props.payload.share, 1)}`,
                    props.payload.fullName,
                  ]}
                  cursor={{ fill: 'rgba(0,212,170,0.06)' }}
                  contentStyle={{
                    background: 'rgba(10,22,40,0.95)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="typical" radius={[5, 5, 0, 0]} barSize={28} maxBarSize={36}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {phases.length === 1 && (
            <div className="mt-2 text-[11px] text-text-muted text-center">
              💡 建议添加多种负载阶段（待机/采样/无线）以获得更准确的估算
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-success/25 bg-gradient-to-br from-success/8 via-transparent to-transparent p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="text-lg flex-shrink-0">📝</span>
          <div className="text-xs text-text-secondary leading-relaxed">
            <div className="font-semibold text-text-primary mb-1">给产品经理的建议</div>
            对外沟通建议使用 <span className="text-danger font-semibold">最差续航 {formatDurationHoursDetailed(result.worstCaseHours)}</span> 作为保守承诺，
            内部目标参考典型值 <span className="text-success font-semibold">{formatDurationHoursDetailed(result.typicalHours)}</span>。
            低温环境、老化后实际续航将进一步下降 15%~30%。
          </div>
        </div>
      </div>
    </div>
  );
};

const DurationCard: React.FC<{
  label: string;
  hours: number;
  color: 'success' | 'danger';
  icon: string;
  gradient: string;
  borderColor: string;
  ringColor: string;
}> = ({ label, hours, icon, gradient, borderColor, ringColor }) => {
  const textColor = color === 'success' ? 'text-success' : 'text-danger';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-xl border ${borderColor} p-4 bg-gradient-to-br ${gradient}`}
      style={{
        background: `linear-gradient(135deg, rgba(${color === 'success' ? '16,185,129' : '239,68,68'},0.10) 0%, rgba(10,22,40,0.6) 60%)`,
      }}
    >
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl`} style={{ background: `var(${ringColor})` }} />
      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-base">{icon}</span>
          <span className="text-[11px] font-medium tracking-wider uppercase text-text-secondary">{label}</span>
        </div>
        <div className={`font-mono font-bold leading-tight ${textColor} mb-1`}>
          <AnimatedNumber
            value={hours}
            decimals={2}
            formatFn={(v) => formatDurationHoursCompact(v)}
            className="text-4xl sm:text-4xl"
          />
        </div>
        <div className="text-[11px] text-text-muted font-mono">
          = {formatDurationHoursDetailed(hours)}
        </div>
      </div>
    </motion.div>
  );
};

const StatMini: React.FC<{
  label: string;
  value: string;
  icon: string;
  accent?: 'success' | 'warning' | 'danger';
}> = ({ label, value, icon, accent }) => (
  <div className="rounded-lg border border-custom bg-black/25 p-2.5 hover:border-border-strong transition-colors">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-sm">{icon}</span>
      <span className="text-[10px] text-text-muted tracking-wide">{label}</span>
    </div>
    <div className={`font-mono text-sm font-semibold ${
      accent === 'success' ? 'text-success' :
      accent === 'warning' ? 'text-warning' :
      accent === 'danger' ? 'text-danger' :
      'text-text-primary'
    }`}>{value}</div>
  </div>
);

const WorstCaseTimeline: React.FC<{ typicalHours: number; worstHours: number }> = ({ typicalHours, worstHours }) => {
  const max = Math.max(typicalHours, worstHours) * 1.05;
  const typicalPct = (typicalHours / max) * 100;
  const worstPct = (worstHours / max) * 100;

  const ticks = 5;
  return (
    <div className="space-y-3">
      {[
        { label: '典型场景', pct: typicalPct, hours: typicalHours, color: 'var(--success)', bg: 'from-success/60 to-emerald-400/60' },
        { label: '最差场景', pct: worstPct, hours: worstHours, color: 'var(--danger)', bg: 'from-danger/60 to-rose-400/60' },
      ].map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-text-secondary font-medium">{row.label}</span>
            <span className="font-mono" style={{ color: row.color }}>
              {formatDurationHoursDetailed(row.hours)}
            </span>
          </div>
          <div className="relative h-6 rounded-md bg-black/40 border border-custom/80 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${row.pct}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className={`absolute inset-y-0 left-0 rounded-md bg-gradient-to-r ${row.bg}`}
              style={{ boxShadow: `inset 0 0 0 1px ${row.color}55, 0 0 10px ${row.color}33` }}
            />
            <div className="absolute inset-0 flex items-center px-2">
              <div className="flex-1 flex justify-between pointer-events-none">
                {Array.from({ length: ticks }).map((_, i) => (
                  <div
                    key={i}
                    className="w-px h-3 bg-white/8"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
