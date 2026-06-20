import { useCalculatorStore } from '@/stores/calculatorStore';
import {
  CompressionUnit,
  PalletType,
  HumidityCondition,
  PALLET_LABELS,
  HUMIDITY_LABELS,
} from '@/types/calculation';
import { Package, Shield, Layers, LayoutGrid, CloudRain, Truck, Route } from 'lucide-react';

export function ProcurementForm() {
  const {
    input,
    setBoxWeight,
    setBoxCompression,
    setCompressionUnit,
    setStackLayers,
    setPalletType,
    setHumidityCondition,
    setTransportDays,
    setRouteName,
    setRouteNotes,
  } = useCalculatorStore();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
            <Package size={14} />
            单箱重量
          </label>
          <div className="relative">
            <input
              type="number"
              value={input.boxWeight || ''}
              onChange={(e) => setBoxWeight(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
              placeholder="输入重量"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">kg</span>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
            <Shield size={14} />
            纸箱抗压值
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={input.boxCompression || ''}
                onChange={(e) => setBoxCompression(parseFloat(e.target.value) || 0)}
                min="0"
                step="1"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
                placeholder="抗压值"
              />
            </div>
            <select
              value={input.compressionUnit}
              onChange={(e) => setCompressionUnit(e.target.value as CompressionUnit)}
              className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm text-slate-700 bg-white"
            >
              <option value="kgf">kgf</option>
              <option value="N">N</option>
              <option value="kg">公斤</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
          <Layers size={14} />
          堆码层数
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStackLayers(input.stackLayers - 1)}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
          >
            −
          </button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-bold text-slate-800">{input.stackLayers}</span>
            <span className="text-sm text-slate-400 ml-1">层</span>
          </div>
          <button
            onClick={() => setStackLayers(input.stackLayers + 1)}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
          >
            +
          </button>
        </div>
        <input
          type="range"
          value={input.stackLayers}
          onChange={(e) => setStackLayers(parseInt(e.target.value))}
          min="1"
          max="20"
          className="w-full mt-2 accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>1层</span>
          <span>10层</span>
          <span>20层</span>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
          <LayoutGrid size={14} />
          托盘方式
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PALLET_LABELS) as PalletType[]).map((type) => (
            <button
              key={type}
              onClick={() => setPalletType(type)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                input.palletType === type
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {PALLET_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
          <CloudRain size={14} />
          湿度条件
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(HUMIDITY_LABELS) as HumidityCondition[]).map((condition) => (
            <button
              key={condition}
              onClick={() => setHumidityCondition(condition)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                input.humidityCondition === condition
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {HUMIDITY_LABELS[condition]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
          <Truck size={14} />
          运输天数
        </label>
        <div className="relative">
          <input
            type="number"
            value={input.transportDays || ''}
            onChange={(e) => setTransportDays(parseInt(e.target.value) || 0)}
            min="0"
            step="1"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
            placeholder="运输天数"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">天</span>
        </div>
        <div className="flex gap-2 mt-2">
          {[1, 3, 7, 15, 30].map((days) => (
            <button
              key={days}
              onClick={() => setTransportDays(days)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                input.transportDays === days
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {days}天
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-3">
          <Route size={14} />
          运输路线备注
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={input.routeName || ''}
            onChange={(e) => setRouteName(e.target.value)}
            placeholder="路线名称（如：上海-广州陆运）"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 text-sm"
          />
          <textarea
            value={input.routeNotes || ''}
            onChange={(e) => setRouteNotes(e.target.value)}
            placeholder="备注信息（如：途经梅雨地区，需防潮）"
            rows={2}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 text-sm resize-none"
          />
        </div>
      </div>
    </div>
  );
}
