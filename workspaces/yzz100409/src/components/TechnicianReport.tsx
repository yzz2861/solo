import { motion } from 'framer-motion';
import { BookOpen, AlertOctagon, Calculator, FileText, ShieldAlert } from 'lucide-react';
import type { SensorInput, ETResult, DailyRecord } from '../../shared/types';
import { buildTechnicianReport } from '../utils/reportBuilder';

interface Props {
  input: SensorInput;
  result: ETResult;
  record?: DailyRecord;
}

const TECH_FORMULA = `ET₀ = [0.408·Δ·(Rₙ − G) + γ·(900/(T+273))·u₂·(eₛ − eₐ)
      —————————————————————————————————
        Δ + γ·(1 + 0.34·u₂)`;

const TechnicianReport = ({ input, result, record }: Props) => {
  const tech = buildTechnicianReport(input, result, record);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      <div className="card-base p-5 bg-soil-50/60 border-soil-100">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-soil-500 text-white flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">
              FAO Penman-Monteith 计算报告
            </h2>
            <p className="text-sm text-greenhouse-500">
              参考作物蒸散 + 作物系数法 · 温室番茄
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-soil-200 overflow-x-auto">
          <pre className="font-mono text-xs sm:text-sm text-soil-700 leading-relaxed whitespace-pre-wrap">
{TECH_FORMULA}
          </pre>
        </div>
        <p className="text-xs text-greenhouse-500 mt-2 text-center font-mono">
          其中 γ=0.067 kPa/℃ · G=0 · u₂ 室内折减 × 0.6
        </p>
      </div>

      <div className="card-base p-5">
        <h3 className="font-serif text-lg font-bold text-greenhouse-800 flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-water-500" />
          输入参数表
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-greenhouse-500 border-b border-greenhouse-100">
              <th className="py-2 pr-4 font-medium">参数</th>
              <th className="py-2 pr-4 font-medium">当前值</th>
              <th className="py-2 pr-4 font-medium">备注</th>
            </tr>
            </thead>
            <tbody>
              {tech.inputParams.map((p, i) => (
                <motion.tr
                  key={p.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-greenhouse-50 last:border-b-0"
                >
                  <td className="py-3 pr-4 font-medium text-greenhouse-800">
                    {p.label}
                  </td>
                  <td className="py-3 pr-4 font-mono text-ink tabular-nums">
                    {p.value}
                  </td>
                  <td className="py-3 pr-4 text-xs text-greenhouse-500">
                    {p.note ?? '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-base p-5">
        <h3 className="font-serif text-lg font-bold text-greenhouse-800 flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-greenhouse-600" />
          分步计算过程
        </h3>
        <ol className="space-y-2.5">
          {tech.calcSteps.map((step, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid sm:grid-cols-[auto_1fr_auto] items-start gap-x-4 gap-y-1 p-3 rounded-xl bg-greenhouse-50/50 border border-greenhouse-50"
            >
              <div className="w-7 h-7 rounded-full bg-greenhouse-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-greenhouse-800">{step.label}</p>
                <pre className="font-mono text-[11px] sm:text-xs text-greenhouse-600 mt-1 whitespace-pre-wrap break-words">
{step.formula}
                </pre>
              </div>
              <div className="font-mono text-sm sm:text-base font-bold text-water-600 text-right tabular-nums sm:pt-0.5">
                {step.value}
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="mt-5 p-4 rounded-2xl bg-greenhouse-gradient text-white shadow-card">
          <p className="text-sm text-white/80">最终结论</p>
          <p className="font-serif text-2xl sm:text-3xl font-bold mt-1 leading-tight break-words">
            {tech.finalResult.value}
          </p>
          <p className="text-xs text-white/70 mt-1 break-words">
            {tech.finalResult.label}
          </p>
        </div>
      </div>

      {tech.warnings.length > 0 && (
        <div className="card-base p-5 bg-warning-50/60 border-warning-100 border">
          <h3 className="font-serif text-lg font-bold text-warning-600 flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5" />
            数据质量与保守系数（{tech.warnings.length} 项）
          </h3>
          <div className="space-y-2">
            {tech.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-white border border-warning-100">
                <AlertOctagon className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-warning-600">
                      {w.type}
                    </span>
                    <span className="font-mono text-xs text-warning-500">
                      系数 {w.factor}
                    </span>
                  </div>
                  <p className="text-sm text-greenhouse-800 mt-0.5">{w.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TechnicianReport;
