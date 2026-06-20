import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import {
  formatDurationHoursDetailed,
  formatNumber,
  formatPercent,
} from '../../lib/formatters';

export const ComparisonReport: React.FC = () => {
  const comparison = useAppStore((s) => s.comparison);
  const result = useAppStore((s) => s.result);
  const measurements = useAppStore((s) => s.measurements);
  const selectedId = useAppStore((s) => s.selectedMeasurementId);
  if (!comparison || !result) return null;

  const measurement = measurements.find((m) => m.id === selectedId);
  if (!measurement) return null;

  const dev = comparison.deviationPercent;
  let severity: 'good' | 'warn' | 'bad' = 'good';
  let severityColor = 'var(--success)';
  let severityBg = 'from-success/25 via-success/10 to-transparent';
  let severityBorder = 'border-success/40';
  let emoji = '✅';
  let severityLabel = '模型可靠';

  if (Math.abs(dev) > 25) {
    severity = 'bad';
    severityColor = dev > 0 ? 'var(--danger)' : 'var(--warning)';
    severityBg = dev > 0 ? 'from-danger/25 via-danger/8 to-transparent' : 'from-warning/25 via-warning/8 to-transparent';
    severityBorder = dev > 0 ? 'border-danger/45' : 'border-warning/45';
    emoji = dev > 0 ? '🚨' : '🤔';
    severityLabel = dev > 0 ? '显著偏乐观' : '显著偏保守';
  } else if (Math.abs(dev) > 10) {
    severity = 'warn';
    severityColor = dev > 0 ? 'var(--warning)' : 'var(--info)';
    severityBg = dev > 0 ? 'from-warning/25 via-warning/8 to-transparent' : 'from-info/25 via-info/8 to-transparent';
    severityBorder = dev > 0 ? 'border-warning/45' : 'border-info/40';
    emoji = dev > 0 ? '⚠️' : '📌';
    severityLabel = dev > 0 ? '偏乐观' : '偏保守';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-xl border p-4 bg-gradient-to-br ${severityBg} ${severityBorder}`}
    >
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-40"
        style={{ background: severityColor }}
      />
      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3.5">
          <div
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl border"
            style={{
              background: `${severityColor}22`,
              borderColor: `${severityColor}55`,
              boxShadow: `0 0 16px ${severityColor}33`,
            }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-text-primary">对比结论</span>
              <span
                className="text-[10.5px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: `${severityColor}22`,
                  color: severityColor,
                  border: `1px solid ${severityColor}44`,
                }}
              >
                {severityLabel}
              </span>
            </div>
            <p className="text-[12.5px] text-text-secondary leading-relaxed mt-1">
              {comparison.conclusion}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <MiniStat
            label="估算典型"
            value={formatDurationHoursDetailed(result.typicalHours)}
            accent="var(--info)"
          />
          <MiniStat label="实测续航" value={formatDurationHoursDetailed(measurement.measuredEnduranceHours)} accent="var(--text-primary)" />
          <MiniStat
            label={`总偏差 ${dev > 0 ? '(高估)' : '(低估)'}`}
            value={`${dev >= 0 ? '+' : ''}${formatNumber(dev, 1)}%`}
            accent={severityColor}
            bold
          />
        </div>

        <div className="rounded-lg bg-black/30 border border-custom/60 p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-[11px]">💡</span>
            <span className="text-[11.5px] font-semibold text-text-primary">改进建议</span>
          </div>
          <ul className="space-y-1.5">
            {comparison.recommendations.map((r, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25 }}
                className="flex items-start gap-2 text-[11.5px] text-text-secondary leading-relaxed"
              >
                <span
                  className="flex-shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    background: `${severityColor}22`,
                    color: severityColor,
                    border: `1px solid ${severityColor}33`,
                  }}
                >
                  {i + 1}
                </span>
                <span>{r}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {comparison.mostOptimisticPhaseName && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[11.5px]"
            style={{
              background: 'var(--danger)15',
              border: '1px solid var(--danger)35',
            }}
          >
            <span className="text-base flex-shrink-0">🎯</span>
            <span className="text-text-secondary leading-relaxed">
              <span className="font-bold text-danger">最偏乐观阶段：{comparison.mostOptimisticPhaseName}</span>
              ，建议优先重新标定该阶段的功耗和时长参数，效果最显著。
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const MiniStat: React.FC<{
  label: string;
  value: string;
  accent: string;
  bold?: boolean;
}> = ({ label, value, accent, bold }) => (
  <div className="rounded-lg bg-black/25 border border-custom/60 px-2.5 py-2">
    <div className="text-[9.5px] text-text-muted tracking-wide mb-0.5">{label}</div>
    <div
      className={`font-mono text-[12px] ${bold ? 'font-bold' : 'font-semibold'}`}
      style={{ color: accent }}
    >
      {value}
    </div>
  </div>
);
