import { useState } from 'react';
import { AlertTriangle, ChevronDown, Shield } from 'lucide-react';
import type { ValidationWarning } from '../../shared/types';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  warnings: ValidationWarning[];
  totalFactor: number;
}

const TYPE_META: Record<ValidationWarning['type'], { label: string; color: string; emoji: string }> = {
  missing: { label: '传感器缺测', color: 'bg-red-50 text-red-700 border-red-100', emoji: '📡' },
  jump: { label: '数据跳变', color: 'bg-orange-50 text-orange-700 border-orange-100', emoji: '🔀' },
  stage_unselected: { label: '阶段未选', color: 'bg-yellow-50 text-yellow-700 border-yellow-100', emoji: '🌱' },
  out_of_range: { label: '范围异常', color: 'bg-warning-50 text-warning-600 border-warning-100', emoji: '⚠️' },
};

const WarningBanner = ({ warnings, totalFactor }: Props) => {
  const [open, setOpen] = useState(false);
  if (warnings.length === 0) return null;

  const extraPercent = Math.round((totalFactor - 1) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-base overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-start gap-3 text-left bg-gradient-to-r from-warning-50 to-orange-50"
      >
        <div className="w-10 h-10 rounded-xl bg-warning-500 text-white flex items-center justify-center shrink-0 animate-pulse-ring">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-warning-600">
              检测到 {warnings.length} 项数据异常，已启用保守估算
            </p>
            <span className="chip-warning">
              <Shield className="w-3.5 h-3.5" />
              估算偏大约 +{extraPercent}%
            </span>
          </div>
          <p className="text-sm text-warning-600/80 mt-1">
            点击展开查看详细说明，建议下午4点复核作物状态再微调
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-warning-600 shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-2">
              {warnings.map((w, i) => {
                const meta = TYPE_META[w.type];
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${meta.color}`}
                  >
                    <span className="text-lg">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                          {meta.label}
                        </p>
                        <span className="text-xs font-mono opacity-70">
                          保守系数 ×{w.conservativeFactor.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5">{w.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WarningBanner;
