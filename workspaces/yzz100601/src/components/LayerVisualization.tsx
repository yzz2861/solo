import { useState } from 'react';
import { ShieldAlert, Shield, Gauge, Target, Box, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { RISK_LEVEL_CONFIG } from '@/types';
import PositionPicker from './PositionPicker';
import { toKg } from '@/utils/unitConverter';

export default function LayerVisualization() {
  const shelf = useAppStore((s) => s.shelf);
  const layerResults = useAppStore((s) => s.layerResults);
  const boxes = useAppStore((s) => s.boxes);
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);

  const totalWeight = layerResults.reduce((s, l) => s + l.totalWeight_kg, 0);
  const totalCapacity = shelf.layerMaxWeight_kg * shelf.layerCount;
  const totalUtil = totalCapacity > 0 ? (totalWeight / totalCapacity) * 100 : 0;

  const selectedBoxes = selectedLayer !== null ? boxes.filter((b) => b.layerIndex === selectedLayer) : [];
  const selectedResult = selectedLayer !== null ? layerResults[selectedLayer] : null;

  const zoneAgg = (() => {
    if (!selectedResult) return undefined;
    const obj = { ...selectedResult.zoneWeights } as typeof selectedResult.zoneWeights;
    return obj;
  })();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-purple-600" />
            层板承重状态
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">点击层板查看详情</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">总体利用率</div>
          <div className="text-lg font-bold font-mono text-slate-800">
            {totalUtil.toFixed(1)}
            <span className="text-sm text-slate-400 ml-0.5">%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto max-h-[520px]">
        <div className="mx-auto max-w-[380px] relative">
          <div className="absolute -left-1 top-0 bottom-0 w-2 bg-gradient-to-b from-slate-400 via-slate-500 to-slate-700 rounded-l-md" />
          <div className="absolute -right-1 top-0 bottom-0 w-2 bg-gradient-to-b from-slate-400 via-slate-500 to-slate-700 rounded-r-md" />
          <div className="h-3 bg-gradient-to-b from-slate-600 to-slate-700 rounded-t-md mx-0 shadow-inner" />

          <div className="space-y-3 px-1.5 py-3 bg-gradient-to-b from-slate-100/40 to-slate-50/40">
            {layerResults
              .slice()
              .reverse()
              .map((lr, reverseIdx) => {
                const displayIdx = layerResults.length - 1 - reverseIdx;
                const cfg = RISK_LEVEL_CONFIG[lr.riskLevel];
                const selected = selectedLayer === displayIdx;
                const pct = Math.min(lr.utilizationPercent, 140);
                return (
                  <button
                    key={displayIdx}
                    onClick={() => setSelectedLayer(selected ? null : displayIdx)}
                    className={`w-full block text-left rounded-lg overflow-hidden transition-all border-2 ${
                      selected
                        ? 'border-blue-500 shadow-lg shadow-blue-200/60 scale-[1.02]'
                        : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <div className="relative h-16 bg-gradient-to-b from-slate-200 to-slate-300 rounded-md shadow-inner overflow-hidden">
                      <div
                        className={`absolute inset-x-0 bottom-0 transition-all ${cfg.bar} opacity-90`}
                        style={{ height: `${Math.min(pct, 100)}%` }}
                      />
                      <div className={`absolute inset-0 ${pct > 100 ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.2)_6px,rgba(255,255,255,0.2)_12px)]' : ''}`} />
                      <div className="absolute inset-0 px-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold bg-white shadow-sm ${cfg.text} border`}>
                            {displayIdx + 1}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-600 font-medium">第 {displayIdx + 1} 层 · {lr.boxCount} 件</div>
                            <div className="text-sm font-bold font-mono text-slate-900 flex items-center gap-1">
                              {lr.totalWeight_kg.toFixed(1)}
                              <span className="text-[10px] text-slate-500 font-normal">/ {shelf.layerMaxWeight_kg} kg</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-600 font-medium">
                              余量
                              <span className="ml-1 font-mono font-bold">{lr.safetyMargin_kg.toFixed(1)}kg</span>
                            </div>
                            <div className={`flex items-center justify-end gap-1 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${cfg.bg} ${cfg.text} border`}>
                              {lr.riskLevel === 'safe' ? (
                                <Shield className="w-3 h-3" />
                              ) : (
                                <ShieldAlert className="w-3 h-3" />
                              )}
                              {cfg.label}
                              <span className="font-mono">{lr.utilizationPercent.toFixed(0)}%</span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition ${selected ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {selected && selectedResult && (
                      <div className="bg-white border-t border-slate-200 p-3 text-left animate-in">
                        <div className="grid grid-cols-4 gap-2 text-[11px] mb-3">
                          <div className="p-2 rounded-md bg-slate-50 border">
                            <div className="text-slate-500 text-[10px]">利用率</div>
                            <div className={`font-mono font-bold ${cfg.text} mt-0.5`}>
                              {lr.utilizationPercent.toFixed(1)}%
                            </div>
                          </div>
                          <div className="p-2 rounded-md bg-slate-50 border">
                            <div className="text-slate-500 text-[10px]">安全余量</div>
                            <div className="font-mono font-bold text-blue-700 mt-0.5">
                              {lr.safetyMargin_kg.toFixed(2)}kg
                            </div>
                          </div>
                          <div className="p-2 rounded-md bg-slate-50 border">
                            <div className="text-slate-500 text-[10px]">箱件数</div>
                            <div className="font-mono font-bold text-slate-700 mt-0.5">{lr.boxCount}</div>
                          </div>
                          <div className="p-2 rounded-md bg-slate-50 border">
                            <div className="text-slate-500 text-[10px]">中心集中度</div>
                            <div className={`font-mono font-bold mt-0.5 ${lr.centerConcentrationRatio > 60 ? 'text-amber-700' : 'text-slate-700'}`}>
                              {lr.centerConcentrationRatio.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {lr.maxContributor && (
                          <div className="mb-3 p-2.5 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                              <Target className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">最大重量贡献者</div>
                              <div className="text-sm font-bold text-amber-900 truncate">{lr.maxContributor.boxName}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[10px] text-amber-600 font-semibold">占比</div>
                              <div className="font-mono font-bold text-amber-800">
                                {lr.maxContributor.percent.toFixed(1)}% · {lr.maxContributor.weight_kg.toFixed(2)}kg
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-5 gap-3 items-start">
                          <div className="col-span-2">
                            <PositionPicker
                              value="mc"
                              onChange={() => {}}
                              zoneWeights={zoneAgg}
                            />
                          </div>
                          <div className="col-span-3">
                            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <Box className="w-3 h-3" />
                              本层货物 ({selectedBoxes.length})
                            </div>
                            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                              {selectedBoxes.length === 0 ? (
                                <div className="text-[11px] text-slate-400 py-4 text-center border-2 border-dashed rounded-md border-slate-200">
                                  空层
                                </div>
                              ) : (
                                [...selectedBoxes]
                                  .sort((a, b) => toKg(b.weight, b.weightUnit) * b.quantity - toKg(a.weight, a.weightUnit) * a.quantity)
                                  .map((b) => {
                                    const w = toKg(b.weight, b.weightUnit) * b.quantity;
                                    const pct = lr.totalWeight_kg > 0 ? (w / lr.totalWeight_kg) * 100 : 0;
                                    const isMax = lr.maxContributor?.boxId === b.id;
                                    return (
                                      <div
                                        key={b.id}
                                        className={`p-1.5 rounded-md border text-[11px] flex items-center gap-2 ${
                                          isMax ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'
                                        }`}
                                      >
                                        <div className="flex-1 min-w-0 truncate font-medium text-slate-700">
                                          {isMax && <span className="text-amber-600 mr-0.5">⭐</span>}
                                          {b.name}
                                        </div>
                                        <span className="text-[10px] text-slate-500 shrink-0">×{b.quantity}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-mono">
                                          {w.toFixed(1)}kg
                                        </span>
                                        <div className="w-14 h-1.5 bg-slate-100 rounded-full shrink-0 overflow-hidden">
                                          <div
                                            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
          </div>

          <div className="h-2 bg-gradient-to-b from-slate-700 to-slate-900 rounded-b-md shadow-md mx-0" />
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" /> 安全 {'<'}80%
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-amber-500" /> 警告 80~100%
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-rose-500" /> 超限 ≥100%
          </div>
        </div>
      </div>
    </div>
  );
}
