import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import {
  formatDurationSeconds,
  formatJoules,
  formatNumber,
  formatPercent,
  formatPowerWatts,
  formatTemperature,
  formatWh,
} from '../../lib/formatters';
import {
  PHASE_COLORS,
  PHASE_ICONS,
} from '../../constants/defaults';
import { PhaseNameType } from '../../types';

export const ResultEngineeringView: React.FC = () => {
  const result = useAppStore((s) => s.result)!;
  const corrections = useAppStore((s) => s.corrections);
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <FactorTile
          label="标称容量"
          value={formatWh(result.nominalCapacityWh)}
          sub={`原始能量`}
          accent="text-text-primary"
          icon="🔋"
        />
        <FactorTile
          label="× 温度降容"
          value={`×${formatNumber(result.temperatureDerating, 3)}`}
          sub={`${formatTemperature(corrections.ambientTemperature)} · ${formatPercent((1 - result.temperatureDerating) * -100, 1)}损失`}
          accent="text-info"
          icon="🌡️"
          warn={result.temperatureDerating < 0.75}
        />
        <FactorTile
          label="× 老化/裕度"
          value={`×${formatNumber(result.agingLoss * result.marginLoss, 3)}`}
          sub={`老化${formatPercent(result.agingLoss * 100, 0)} · 裕度保留${formatPercent(result.marginLoss * 100, 0)}`}
          accent="text-accent-secondary"
          icon="📆"
        />
        <FactorTile
          label="× 转换效率"
          value={`×${formatNumber(result.efficiencyLoss, 3)}`}
          sub={`DC-DC ${formatPercent(result.efficiencyLoss * 100, 1)}有效`}
          accent="text-warning"
          icon="⚡"
          warn={result.efficiencyLoss < 0.75}
        />
      </div>

      <div className="rounded-lg border border-accent-primary/30 bg-gradient-to-br from-accent-primary/8 via-black/20 to-transparent p-3.5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-text-secondary">
          <span className="text-text-muted">可用容量 =</span>
          <span className="text-text-primary">{formatWh(result.nominalCapacityWh)}</span>
          <span className="text-text-muted">×</span>
          <span className="text-info">{formatNumber(result.temperatureDerating, 3)}</span>
          <span className="text-text-muted">×</span>
          <span className="text-accent-secondary">{formatNumber(result.agingLoss, 3)}</span>
          <span className="text-text-muted">×</span>
          <span className="text-accent-secondary">{formatNumber(result.marginLoss, 3)}</span>
          <span className="text-text-muted">×</span>
          <span className="text-warning">{formatNumber(result.efficiencyLoss, 3)}</span>
          <span className="text-text-muted">=</span>
          <span className="px-2 py-0.5 rounded bg-accent-primary/20 text-accent-primary font-bold border border-accent-primary/30">
            {formatWh(result.availableCapacityWh_typical)}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-custom bg-black/20 overflow-hidden">
        <div
          className="flex items-center justify-between px-3.5 py-2.5 border-b border-custom cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">📋</span>
            <span className="text-xs font-semibold text-text-primary">各阶段能耗拆解 (典型场景)</span>
            <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-black/30 border border-custom">
              {result.phaseBreakdown_typical.length} 个阶段
            </span>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`text-text-muted transition-transform ${expanded ? '' : '-rotate-90'}`}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {expanded && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="text-text-muted border-b border-custom bg-black/20">
                  <th className="px-3 py-2 text-left font-medium">阶段</th>
                  <th className="px-3 py-2 text-right font-medium">功率</th>
                  <th className="px-3 py-2 text-right font-medium">时长/次</th>
                  <th className="px-3 py-2 text-right font-medium">占空比</th>
                  <th className="px-3 py-2 text-right font-medium">单次能耗</th>
                  <th className="px-3 py-2 text-right font-medium">时间平均</th>
                  <th className="px-3 py-2 text-right font-medium">能耗占比</th>
                </tr>
              </thead>
              <tbody>
                {result.phaseBreakdown_typical.map((b, idx) => {
                  const color = PHASE_COLORS[b.phaseName as PhaseNameType] || '#a78bfa';
                  return (
                    <motion.tr
                      key={b.phaseId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.25 }}
                      className="border-b border-custom/50 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs"
                            style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                          >
                            {PHASE_ICONS[b.phaseName as PhaseNameType] || '⚙️'}
                          </span>
                          <span className="font-medium text-text-primary">{b.displayName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                        {formatPowerWatts(b.powerW)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-text-secondary">
                        {formatDurationSeconds(b.durationS)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <span className="text-text-secondary">{formatPercent(b.dutyCycle, 1)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-text-muted">
                        {formatJoules(b.energyPerCycleJ)}
                        <div className="text-[9.5px] opacity-70">{formatNumber(b.energyPerCycleWh * 1000, 2)} mWh</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-accent-primary">
                        {formatPowerWatts(b.avgPowerW)}
                      </td>
                      <td className="px-3 py-2.5 pr-4">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-1.5 rounded-full bg-black/40 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, b.energyShare)}%`,
                                background: color,
                                boxShadow: `0 0 6px ${color}66`,
                              }}
                            />
                          </div>
                          <span className="font-mono font-semibold w-12 text-right" style={{ color }}>
                            {formatPercent(b.energyShare, 1)}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                <tr className="bg-black/30">
                  <td className="px-3 py-2.5 font-semibold text-text-primary">⏱️ 合计</td>
                  <td className="px-3 py-2.5 text-right text-text-muted">-</td>
                  <td className="px-3 py-2.5 text-right text-text-muted">-</td>
                  <td className="px-3 py-2.5 text-right text-text-muted">-</td>
                  <td className="px-3 py-2.5 text-right text-text-muted">-</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-accent-primary text-sm">
                    {formatPowerWatts(result.avgPowerDrawW_typical)}
                  </td>
                  <td className="px-3 py-2.5 pr-4 text-right font-mono font-semibold text-text-primary">
                    {formatPercent(100, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FinalFormulaBox
          title="典型续航公式"
          icon="✨"
          formula={`${formatWh(result.availableCapacityWh_typical)} ÷ ${formatNumber(result.avgPowerDrawW_typical, 4)} W`}
          result={formatNumber(result.typicalHours, 3)}
          unit="小时"
          resultDetail={`= ${
            result.typicalHours >= 1
              ? `${formatNumber(result.typicalHours, 3)} h ≈ ${Math.floor(result.typicalHours)}h ${Math.round((result.typicalHours % 1) * 60)}min`
              : `${formatNumber(result.typicalHours * 60, 1)} 分钟`
          }`}
          color="--success"
          detail={`≈ ${Math.floor(result.typicalHours * 60)} 分钟 · ${result.typicalHours >= 24 ? formatNumber(result.typicalHours / 24, 2) + ' 天' : ''}`}
        />
        <FinalFormulaBox
          title="最差续航公式"
          icon="🔥"
          formula={`${formatWh(result.availableCapacityWh_worst)} ÷ ${formatNumber(result.avgPowerDrawW_worst, 4)} W`}
          result={formatNumber(result.worstCaseHours, 3)}
          unit="小时"
          resultDetail={`= ${
            result.worstCaseHours >= 1
              ? `${formatNumber(result.worstCaseHours, 3)} h ≈ ${Math.floor(result.worstCaseHours)}h ${Math.round((result.worstCaseHours % 1) * 60)}min`
              : `${formatNumber(result.worstCaseHours * 60, 1)} 分钟`
          }`}
          color="--danger"
          detail={`≈ ${Math.floor(result.worstCaseHours * 60)} 分钟 · 含最差功耗倍率`}
        />
      </div>

      <div className="rounded-lg border border-custom/60 bg-black/25 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">📜</span>
          <span className="text-xs font-semibold text-text-primary">完整计算步骤追踪</span>
        </div>
        <ol className="space-y-1.5 pl-1">
          {result.calculationSteps.map((step, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.2 }}
              className="flex items-start gap-2 text-[11.5px] font-mono leading-relaxed"
            >
              <span className="text-text-muted mt-0.5 flex-shrink-0 w-4 text-right">{idx + 1}.</span>
              <code className="flex-1 text-text-secondary whitespace-pre-wrap break-all">
                {step.split('：').map((part, i, arr) => (
                  <span key={i}>
                    {i === 0 ? (
                      <span className="text-accent-primary">{part}</span>
                    ) : (
                      <>{i > 0 && arr.length > 1 ? '：' : ''}{part}</>
                    )}
                    {i < arr.length - 1 && arr.length > 1 ? null : null}
                  </span>
                ))}
              </code>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
};

const FactorTile: React.FC<{
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: string;
  warn?: boolean;
}> = ({ label, value, sub, accent, icon, warn }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className={`relative rounded-lg border p-3 bg-black/25 overflow-hidden transition-colors ${
      warn ? 'border-danger/40' : 'border-custom hover:border-border-strong'
    }`}
  >
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-sm">{icon}</span>
      <span className="text-[10.5px] text-text-muted tracking-wide">{label}</span>
    </div>
    <div className={`font-mono font-bold text-lg ${accent}`}>{value}</div>
    <div className={`text-[10px] mt-0.5 ${warn ? 'text-danger/80' : 'text-text-muted'}`}>{sub}</div>
  </motion.div>
);

const FinalFormulaBox: React.FC<{
  title: string;
  icon: string;
  formula: string;
  result: string;
  unit: string;
  resultDetail: string;
  color: string;
  detail: string;
}> = ({ title, icon, formula, result, unit, resultDetail, color, detail }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    className="rounded-xl border p-4 relative overflow-hidden"
    style={{
      borderColor: `var(${color})55`,
      background: `linear-gradient(135deg, var(${color})12 0%, rgba(10,22,40,0.6) 60%)`,
    }}
  >
    <div
      className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30"
      style={{ background: `var(${color})` }}
    />
    <div className="relative z-10">
      <div className="flex items-center gap-1.5 mb-2">
        <span>{icon}</span>
        <span className="text-[11px] font-medium tracking-wide text-text-secondary">{title}</span>
      </div>
      <div className="text-[11px] font-mono text-text-muted mb-2 break-all px-2 py-1.5 rounded bg-black/30 border border-custom/60">
        {formula}
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span
          className="font-mono font-bold text-3xl"
          style={{ color: `var(${color})`, textShadow: `0 0 20px var(${color})55` }}
        >
          {result}
        </span>
        <span className="text-sm text-text-muted">{unit}</span>
      </div>
      <div className="text-[11px] text-text-secondary font-mono">{resultDetail}</div>
      <div className="text-[10px] text-text-muted mt-1">{detail}</div>
    </div>
  </motion.div>
);
