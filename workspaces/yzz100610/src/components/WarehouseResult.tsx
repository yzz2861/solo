import { useCalculatorStore } from '@/stores/calculatorStore';
import { Layers, CloudRain, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { HUMIDITY_FACTORS, HUMIDITY_LABELS } from '@/types/calculation';
import { calculateMaxLayers, convertToKgf } from '@/utils/calculationEngine';
import { SAFETY_THRESHOLDS } from '@/types/calculation';

export function WarehouseResult() {
  const { result, input, getHumidityWarnings } = useCalculatorStore();

  if (!result) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
        <div className="text-slate-400 text-sm">请输入参数后查看建议</div>
      </div>
    );
  }

  const humidityWarnings = getHumidityWarnings();
  const compressionKgf = convertToKgf(input.boxCompression, input.compressionUnit);
  const palletFactor = result.palletFactor;

  const layersByHumidity = [
    {
      condition: 'dry' as const,
      layers: calculateMaxLayers(input.boxWeight, compressionKgf * palletFactor * HUMIDITY_FACTORS.dry, SAFETY_THRESHOLDS.good),
      minLayers: calculateMaxLayers(input.boxWeight, compressionKgf * palletFactor * HUMIDITY_FACTORS.dry, SAFETY_THRESHOLDS.pass),
    },
    {
      condition: 'normal' as const,
      layers: calculateMaxLayers(input.boxWeight, compressionKgf * palletFactor * HUMIDITY_FACTORS.normal, SAFETY_THRESHOLDS.good),
      minLayers: calculateMaxLayers(input.boxWeight, compressionKgf * palletFactor * HUMIDITY_FACTORS.normal, SAFETY_THRESHOLDS.pass),
    },
    {
      condition: 'humid' as const,
      layers: calculateMaxLayers(input.boxWeight, compressionKgf * palletFactor * HUMIDITY_FACTORS.humid, SAFETY_THRESHOLDS.good),
      minLayers: calculateMaxLayers(input.boxWeight, compressionKgf * palletFactor * HUMIDITY_FACTORS.humid, SAFETY_THRESHOLDS.pass),
    },
    {
      condition: 'high' as const,
      layers: calculateMaxLayers(input.boxWeight, compressionKgf * palletFactor * HUMIDITY_FACTORS.high, SAFETY_THRESHOLDS.good),
      minLayers: calculateMaxLayers(input.boxWeight, compressionKgf * palletFactor * HUMIDITY_FACTORS.high, SAFETY_THRESHOLDS.pass),
    },
  ];

  const isCurrentSafe = input.stackLayers <= result.maxSafeLayers;
  const isCurrentMinSafe = input.stackLayers <= result.maxSafeLayersMin;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-3 opacity-90">
          <Layers size={20} />
          <span className="text-sm font-medium">建议堆码层数</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-6xl font-bold">{result.maxSafeLayers}</span>
          <span className="text-lg mb-2 opacity-80">层</span>
        </div>
        <p className="text-sm opacity-80 mt-2">
          安全系数 ≥ 2.5 的最大堆码层数
        </p>
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex justify-between text-sm">
            <span className="opacity-80">最低标准 (≥ 2.0)</span>
            <span className="font-semibold">{result.maxSafeLayersMin} 层</span>
          </div>
        </div>
      </div>

      <div className={`rounded-xl p-4 border ${
        isCurrentSafe
          ? 'bg-emerald-50 border-emerald-200'
          : isCurrentMinSafe
          ? 'bg-amber-50 border-amber-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {isCurrentSafe ? (
            <CheckCircle size={24} className="text-emerald-500 shrink-0" />
          ) : isCurrentMinSafe ? (
            <AlertTriangle size={24} className="text-amber-500 shrink-0" />
          ) : (
            <XCircle size={24} className="text-red-500 shrink-0" />
          )}
          <div>
            <div className={`font-semibold ${
              isCurrentSafe ? 'text-emerald-700' : isCurrentMinSafe ? 'text-amber-700' : 'text-red-700'
            }`}>
              当前 {input.stackLayers} 层
              {isCurrentSafe ? ' — 安全' : isCurrentMinSafe ? ' — 临界' : ' — 超限'}
            </div>
            <div className={`text-sm ${
              isCurrentSafe ? 'text-emerald-600' : isCurrentMinSafe ? 'text-amber-600' : 'text-red-600'
            }`}>
              {isCurrentSafe
                ? `距离最大安全层数还有 ${result.maxSafeLayers - input.stackLayers} 层余量`
                : isCurrentMinSafe
                ? `安全系数不足 2.5，建议减少 ${input.stackLayers - result.maxSafeLayers} 层`
                : `超出 ${input.stackLayers - result.maxSafeLayersMin} 层，必须减少堆码`}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-slate-700 font-semibold mb-4">
          <CloudRain size={18} className="text-blue-500" />
          不同湿度下的堆码层数参考
        </div>
        <div className="space-y-3">
          {layersByHumidity.map((item) => {
            const isDanger = item.condition === 'high';
            const isWarning = item.condition === 'humid';
            const isCurrent = item.condition === input.humidityCondition;

            return (
              <div
                key={item.condition}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-slate-100 ring-2 ring-slate-300'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isDanger && <XCircle size={16} className="text-red-500" />}
                  {isWarning && <AlertTriangle size={16} className="text-amber-500" />}
                  <span className={`text-sm ${
                    isDanger ? 'text-red-600 font-medium' : isWarning ? 'text-amber-600' : 'text-slate-600'
                  }`}>
                    {HUMIDITY_LABELS[item.condition]}
                  </span>
                  {isCurrent && (
                    <span className="text-xs bg-slate-600 text-white px-2 py-0.5 rounded-full">
                      当前
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-bold ${
                    isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-800'
                  }`}>
                    {item.layers}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">层</span>
                  <div className="text-xs text-slate-400">
                    最低 {item.minLayers} 层
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {humidityWarnings.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-700 font-semibold mb-3">
            <AlertTriangle size={18} />
            必须注意的潮湿条件
          </div>
          <ul className="space-y-2">
            {humidityWarnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-amber-700">
                <span>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
