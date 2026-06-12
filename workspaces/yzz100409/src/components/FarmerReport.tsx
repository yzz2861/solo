import { motion } from 'framer-motion';
import { CheckCircle2, Lightbulb, Eye } from 'lucide-react';
import type { SensorInput, ETResult } from '../../shared/types';
import { buildFarmerReport } from '../utils/reportBuilder';
import { clsx } from 'clsx';

interface Props {
  input: SensorInput;
  result: ETResult;
}

const verdictStyle = {
  'water-plenty': {
    bar: 'bg-greenhouse-500',
    ring: 'ring-greenhouse-200',
    emoji: '🌳',
    title: '地够湿',
  },
  'water-ok': {
    bar: 'bg-greenhouse-400',
    ring: 'ring-greenhouse-100',
    emoji: '💚',
    title: '正常',
  },
  'water-moderate': {
    bar: 'bg-water-500',
    ring: 'ring-water-200',
    emoji: '💧',
    title: '需要灌溉',
  },
  'water-urgent': {
    bar: 'bg-warning-500',
    ring: 'ring-warning-200',
    emoji: '🔥',
    title: '急需补水',
  },
};

const FarmerReport = ({ input, result }: Props) => {
  const report = buildFarmerReport(input, result);
  const style = verdictStyle[report.verdict];
  const extraPct = Math.round((result.totalConservativeFactor - 1) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="card-base p-6 bg-gradient-to-br from-paper to-greenhouse-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 text-[120px] opacity-5 leading-none pointer-events-none select-none">
          {style.emoji}
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-14 h-14 rounded-2xl ${style.bar} text-white text-3xl flex items-center justify-center shadow-soft ring-4 ${style.ring}`}
            >
              {style.emoji}
            </div>
            <div>
              <p className="text-xs text-greenhouse-500 font-medium">今日灌溉建议</p>
              <h2 className="font-serif text-2xl font-bold text-greenhouse-800 leading-tight">
                {report.headline}
              </h2>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 flex-wrap">
            <span className="chip-success">
              <Eye className="w-3.5 h-3.5" />
              {style.title}
            </span>
            {result.warnings.length > 0 && (
              <span className="chip-warning">保守 +{extraPct}% 估算</span>
            )}
            <span className="chip-info">Kc × {result.kc.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {report.sections.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.08 }}
            className="card-base p-5"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{s.emoji}</span>
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-bold text-greenhouse-800 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-greenhouse-700 leading-relaxed whitespace-pre-line">
                  {s.content}
                </p>
                {s.highlight && (
                  <div className="mt-3 p-3 rounded-xl bg-water-50 border border-water-100 text-water-700 font-bold font-mono text-lg text-center">
                    ✦ {s.highlight} ✦
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="card-base p-5 bg-gradient-to-br from-greenhouse-50 to-paper border-greenhouse-50">
        <h3 className="font-serif text-lg font-bold text-greenhouse-800 flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          今日操作清单
        </h3>
        <ul className="space-y-2.5">
          {report.actionList.map((action, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-greenhouse-500 shrink-0 mt-0.5" />
              <span className="text-sm text-greenhouse-800 leading-relaxed">{action}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

export default FarmerReport;
