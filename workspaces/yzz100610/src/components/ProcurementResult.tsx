import { useCalculatorStore } from '@/stores/calculatorStore';
import {
  SAFETY_LEVEL_LABELS,
  SAFETY_LEVEL_COLORS,
  SAFETY_LEVEL_BG_COLORS,
  SAFETY_THRESHOLDS,
} from '@/types/calculation';
import { StackVisualization } from './StackVisualization';
import { ShieldCheck, Package, Layers, TrendingDown, CheckCircle2 } from 'lucide-react';

export function ProcurementResult() {
  const { result, input } = useCalculatorStore();

  if (!result) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
        <div className="text-slate-400 text-sm">请输入参数后查看计算结果</div>
      </div>
    );
  }

  const safetyPercent = Math.min((result.safetyFactor / SAFETY_THRESHOLDS.excellent) * 100, 100);
  const bottomOverloaded = result.bottomLoadRatio >= 0.9;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={20} className="text-slate-700" />
          <h3 className="font-semibold text-slate-800">安全系数</h3>
        </div>

        <div className="flex items-end gap-2 mb-4">
          <span className={`text-5xl font-bold ${SAFETY_LEVEL_COLORS[result.safetyLevel]}`}>
            {result.safetyFactor.toFixed(2)}
          </span>
          <span className="text-slate-400 text-sm mb-2">倍</span>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>安全储备</span>
            <span className={SAFETY_LEVEL_COLORS[result.safetyLevel]}>
              {SAFETY_LEVEL_LABELS[result.safetyLevel]}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${SAFETY_LEVEL_BG_COLORS[result.safetyLevel]} transition-all duration-500 ease-out rounded-full`}
              style={{ width: `${safetyPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1.0</span>
            <span>2.0</span>
            <span>2.5</span>
            <span>3.0+</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Package size={14} />
            底层承重
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {result.bottomLoad.toFixed(1)}
            <span className="text-sm font-normal text-slate-400 ml-1">kg</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            占有效抗压 {(result.bottomLoadRatio * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <TrendingDown size={14} />
            有效抗压
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {result.effectiveCompression.toFixed(1)}
            <span className="text-sm font-normal text-slate-400 ml-1">kgf</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            修正后
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
          <Layers size={14} />
          修正系数明细
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">托盘修正</span>
            <span className="font-medium text-slate-700">× {result.palletFactor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">湿度修正</span>
            <span className="font-medium text-slate-700">× {result.humidityFactor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">运输时间修正</span>
            <span className="font-medium text-slate-700">× {result.transportFactor.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between">
            <span className="text-slate-600 font-medium">综合修正</span>
            <span className="font-bold text-slate-800">
              × {(result.palletFactor * result.humidityFactor * result.transportFactor).toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <StackVisualization
          layers={input.stackLayers}
          maxSafeLayers={result.maxSafeLayers}
          bottomOverloaded={bottomOverloaded}
        />
      </div>

      {result.suggestions.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-700 font-semibold mb-3">
            <CheckCircle2 size={18} className="text-emerald-500" />
            换箱建议
          </div>
          <ul className="space-y-2">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
