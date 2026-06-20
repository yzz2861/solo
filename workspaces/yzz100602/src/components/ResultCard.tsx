import {
  Droplets,
  Clock,
  Zap,
  CheckCircle2,
  TrendingDown,
  Calculator,
  DollarSign,
  Gauge,
  ArrowRight,
} from 'lucide-react';
import { useDryingStore } from '@/store/useDryingStore';
import { formatTime, getOperationSuggestions, getEnergyCost } from '@/utils/calculator';
import { constants } from '@/utils/calculator';
import ModeSwitch from './ModeSwitch';

export default function ResultCard() {
  const { result, params, reportMode, setReportMode } = useDryingStore();

  if (!result) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            估算结果
          </h2>
        </div>
        <div className="p-12 text-center text-warm-400">
          <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>填写左侧参数后，自动计算排湿量和烘干时长</p>
        </div>
      </div>
    );
  }

  const suggestions = getOperationSuggestions(params, result);
  const energyCost = getEnergyCost(result.energyConsumption);

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            估算结果
            {params.materialName && (
              <span className="text-sm font-normal bg-white/20 px-3 py-1 rounded-full">
                {params.materialName}
              </span>
            )}
          </h2>
          <p className="text-sm text-primary-100 mt-1">
            请根据实际情况适当调整
          </p>
        </div>
        <ModeSwitch mode={reportMode} onChange={setReportMode} />
      </div>

      <div className="p-6">
        {reportMode === 'worker' ? (
          <WorkerView result={result} suggestions={suggestions} />
        ) : (
          <BossView
            result={result}
            params={params}
            suggestions={suggestions}
            energyCost={energyCost}
          />
        )}
      </div>
    </div>
  );
}

function WorkerView({
  result,
  suggestions,
}: {
  result: ReturnType<typeof useDryingStore.getState>['result'];
  suggestions: string[];
}) {
  if (!result) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <div className="stat-number">{result.waterToRemove}</div>
              <div className="stat-label">需排湿水量 (kg)</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <div className="stat-number text-xl">{formatTime(result.estimatedTime)}</div>
              <div className="stat-label">预估烘干时长</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-amber-50 rounded-xl p-5 border border-primary-100">
        <h3 className="font-bold text-primary-700 flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5" />
          操作建议
        </h3>
        <ul className="space-y-2">
          {suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-primary-800">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between text-sm text-warm-500">
        <span>每小时排湿约 {result.hourlyDehumidification} kg</span>
        <span>出料约 {result.finalWeight} kg</span>
      </div>
    </div>
  );
}

function BossView({
  result,
  params,
  suggestions,
  energyCost,
}: {
  result: ReturnType<typeof useDryingStore.getState>['result'];
  params: ReturnType<typeof useDryingStore.getState>['params'];
  suggestions: string[];
  energyCost: number;
}) {
  if (!result) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <Droplets className="w-5 h-5 text-primary-500 mb-2" />
          <div className="stat-number text-2xl">{result.waterToRemove}</div>
          <div className="stat-label">排湿量 (kg)</div>
        </div>
        <div className="stat-card">
          <Clock className="w-5 h-5 text-primary-500 mb-2" />
          <div className="stat-number text-2xl">{result.estimatedTime}</div>
          <div className="stat-label">时长 (小时)</div>
        </div>
        <div className="stat-card">
          <Zap className="w-5 h-5 text-primary-500 mb-2" />
          <div className="stat-number text-2xl">{result.energyConsumption}</div>
          <div className="stat-label">能耗 (kWh)</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-800">电费估算（按0.8元/度）</span>
          </div>
          <span className="text-2xl font-bold text-amber-600 font-mono">
            ¥{energyCost}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-warm-700 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          计算过程
        </h3>

        <div className="bg-warm-50 rounded-xl p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between text-warm-600">
            <span>初始重量</span>
            <span className="font-mono">{params.weight} kg</span>
          </div>
          <div className="flex items-center justify-between text-warm-600">
            <span>初始含水率</span>
            <span className="font-mono">{params.initialMoisture}%</span>
          </div>
          <div className="border-t border-warm-200 pt-2">
            <div className="flex items-center justify-between text-warm-600">
              <span>干物质重量</span>
              <span className="font-mono text-primary-600">
                {result.dryMatterWeight} kg
              </span>
            </div>
            <div className="text-xs text-warm-400 mt-1 pl-4">
              = {params.weight} kg × (1 - {params.initialMoisture}%)
            </div>
          </div>

          <div className="border-t border-warm-200 pt-2">
            <div className="flex items-center justify-between text-warm-600">
              <span>目标含水率</span>
              <span className="font-mono">{params.targetMoisture}%</span>
            </div>
            <div className="flex items-center justify-between text-warm-600 mt-1">
              <span>最终重量</span>
              <span className="font-mono text-primary-600">
                {result.finalWeight} kg
              </span>
            </div>
            <div className="text-xs text-warm-400 mt-1 pl-4">
              = {result.dryMatterWeight} kg ÷ (1 - {params.targetMoisture}%)
            </div>
          </div>

          <div className="border-t border-warm-200 pt-2">
            <div className="flex items-center justify-between font-bold text-primary-700">
              <span>需排出水量</span>
              <span className="font-mono">{result.waterToRemove} kg</span>
            </div>
            <div className="text-xs text-warm-400 mt-1 pl-4">
              = {params.weight} kg - {result.finalWeight} kg
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-warm-700 flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          排湿速率分析
        </h3>
        <div className="bg-warm-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-warm-500">温度系数</span>
            <span className="font-mono text-warm-700">
              {Math.min(params.temperature / 60, 2).toFixed(2)}×
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-warm-500">风量系数</span>
            <span className="font-mono text-warm-700">
              {(params.airFlow > 0
                ? Math.min(params.airFlow / 1000, 1.5)
                : 0.3
              ).toFixed(2)}
              ×
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-warm-500">湿度修正</span>
            <span className="font-mono text-warm-700">
              {Math.max(1 - (params.ambientHumidity - 50) / 100, 0.3).toFixed(2)}×
            </span>
          </div>
          <div className="border-t border-warm-200 pt-2">
            <div className="flex items-center justify-between font-bold text-primary-700">
              <span>每小时排湿量</span>
              <span className="font-mono">{result.hourlyDehumidification} kg/h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-warm-700 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          能耗估算
        </h3>
        <div className="bg-warm-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-warm-500">加热功率（基准）</span>
            <span className="font-mono text-warm-700">
              {constants.BASE_HEATING_POWER} kW
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-warm-500">风机功率</span>
            <span className="font-mono text-warm-700">
              {constants.FAN_POWER} kW
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-warm-500">温度修正后功率</span>
            <span className="font-mono text-warm-700">
              {(
                constants.BASE_HEATING_POWER * (params.temperature / 60) +
                constants.FAN_POWER
              ).toFixed(2)}{' '}
              kW
            </span>
          </div>
          <div className="border-t border-warm-200 pt-2">
            <div className="flex items-center justify-between font-bold text-primary-700">
              <span>总能耗</span>
              <span className="font-mono">{result.energyConsumption} kWh</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-amber-50 rounded-xl p-4 border border-primary-100">
        <h3 className="font-bold text-primary-700 flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5" />
          操作建议
        </h3>
        <ul className="space-y-1.5">
          {suggestions.slice(0, 3).map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-primary-800">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-warm-50 rounded-xl p-3">
          <div className="text-warm-500">出料重量</div>
          <div className="text-lg font-bold text-warm-700 font-mono mt-1">
            {result.finalWeight} kg
          </div>
        </div>
        <div className="bg-warm-50 rounded-xl p-3">
          <div className="text-warm-500">重量减少</div>
          <div className="text-lg font-bold text-warm-700 font-mono mt-1">
            {((result.waterToRemove / params.weight) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
