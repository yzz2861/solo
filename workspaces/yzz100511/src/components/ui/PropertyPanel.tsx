import { useState, useEffect } from 'react';
import {
  X,
  Move,
  Scale,
  Weight,
  Maximize2,
  Zap,
  Info,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Copy,
} from 'lucide-react';
import { useObjectStore } from '../../store/useObjectStore';
import { useRiskStore } from '../../store/useRiskStore';
import { useMallStore } from '../../store/useMallStore';
import { WeightInput, AreaInput } from './InputWithUnit';
import { cn } from '../../lib/utils';
import { calculateLoadPerM2, formatLoad } from '../../utils/unitConversion';
import { getObjectName } from '../../utils/mockData';
import type { WeightUnit, AreaUnit } from '../../types';

export const PropertyPanel = () => {
  const { objects, selectedId, updateObject, removeObject } = useObjectStore();
  const { risks } = useRiskStore();
  const { config } = useMallStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedObject = objects.find((o) => o.id === selectedId);
  const objectRisks = risks.filter((r) => r.objectId === selectedId);
  const hasDanger = objectRisks.some((r) => r.severity === 'danger');
  const hasWarning = objectRisks.some((r) => r.severity === 'warning');

  const loadPerM2 = selectedObject
    ? calculateLoadPerM2(
        selectedObject.weight,
        selectedObject.weightUnit,
        selectedObject.area,
        selectedObject.areaUnit
      )
    : 0;
  const isOverload = loadPerM2 > config.floorLoadCapacity;

  useEffect(() => {
    if (!selectedId) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [selectedId]);

  if (!selectedObject) {
    return (
      <div className="absolute right-4 top-4 z-10 w-80">
        <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <Info className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">点击场景中的物体查看属性</p>
            <p className="text-slate-500 text-xs mt-2">或双击场景添加新物体</p>
          </div>
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className="absolute right-4 top-4 z-10">
        <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-700 shadow-xl px-4 py-3 flex items-center gap-3">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              hasDanger ? 'bg-red-500 animate-pulse' : hasWarning ? 'bg-amber-500' : 'bg-emerald-500'
            )}
          />
          <span className="text-white text-sm font-medium">{selectedObject.name}</span>
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const handleWeightChange = (value: number) => {
    updateObject(selectedObject.id, { weight: value });
  };

  const handleWeightUnitChange = (unit: WeightUnit) => {
    updateObject(selectedObject.id, { weightUnit: unit });
  };

  const handleAreaChange = (value: number) => {
    updateObject(selectedObject.id, { area: value });
  };

  const handleAreaUnitChange = (unit: AreaUnit) => {
    updateObject(selectedObject.id, { areaUnit: unit });
  };

  const handlePowerChange = (hasPower: boolean) => {
    updateObject(selectedObject.id, {
      hasPower,
      powerSourceId: hasPower ? config.powerPoints[0]?.id : undefined,
    });
  };

  const handlePowerSourceChange = (powerSourceId: string) => {
    updateObject(selectedObject.id, { powerSourceId });
  };

  const handleNameChange = (name: string) => {
    updateObject(selectedObject.id, { name });
  };

  const handleDuplicate = () => {
    const newPos: [number, number, number] = [
      selectedObject.position[0] + 2,
      selectedObject.position[1],
      selectedObject.position[2] + 1,
    ];
    useObjectStore.getState().addObject(selectedObject.type, newPos);
  };

  const handleDelete = () => {
    if (confirm(`确定要删除"${selectedObject.name}"吗？`)) {
      removeObject(selectedObject.id);
    }
  };

  const weightError = objectRisks.find((r) => r.type === 'unit_error' && r.message.includes('重量'))?.message;
  const weightWarning = objectRisks.find((r) => r.type === 'unit_error' && r.message.includes('轻'))?.message;
  const areaError = objectRisks.find((r) => r.type === 'unit_error' && r.message.includes('面积') && r.severity === 'danger')?.message;
  const areaWarning = objectRisks.find(
    (r) => (r.type === 'area_error' || (r.type === 'unit_error' && r.message.includes('面积'))) && r.severity === 'warning'
  )?.message;

  return (
    <div className="absolute right-4 top-4 z-10 w-96">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div
          className={cn(
            'px-4 py-3 border-b border-slate-700 flex items-center justify-between',
            hasDanger && 'bg-red-500/10',
            hasWarning && !hasDanger && 'bg-amber-500/10'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                selectedObject.type === 'booth' && 'bg-blue-500',
                selectedObject.type === 'car' && 'bg-indigo-500',
                selectedObject.type === 'barrier' && 'bg-slate-500'
              )}
            >
              <span className="text-white text-lg font-bold">{getObjectName(selectedObject.type).charAt(0)}</span>
            </div>
            <div>
              <input
                type="text"
                value={selectedObject.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="bg-transparent text-white font-semibold text-base border-b border-transparent hover:border-slate-600 focus:border-blue-500 outline-none transition-colors w-full"
              />
              <p className="text-xs text-slate-400">{getObjectName(selectedObject.type)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDuplicate}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="复制"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="bg-slate-750 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Move className="w-4 h-4" />
              位置信息
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-400">X</label>
                <input
                  type="number"
                  value={selectedObject.position[0].toFixed(1)}
                  onChange={(e) => {
                    const x = parseFloat(e.target.value);
                    if (!isNaN(x)) {
                      updateObject(selectedObject.id, {
                        position: [x, selectedObject.position[1], selectedObject.position[2]],
                      });
                    }
                  }}
                  step={0.5}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Y</label>
                <input
                  type="number"
                  value={selectedObject.position[1].toFixed(1)}
                  readOnly
                  className="w-full px-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Z</label>
                <input
                  type="number"
                  value={selectedObject.position[2].toFixed(1)}
                  onChange={(e) => {
                    const z = parseFloat(e.target.value);
                    if (!isNaN(z)) {
                      updateObject(selectedObject.id, {
                        position: [selectedObject.position[0], selectedObject.position[1], z],
                      });
                    }
                  }}
                  step={0.5}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-750 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Scale className="w-4 h-4" />
              尺寸
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-400">宽 (m)</label>
                <input
                  type="number"
                  value={selectedObject.dimensions.width}
                  onChange={(e) => {
                    const width = parseFloat(e.target.value);
                    if (!isNaN(width) && width > 0) {
                      updateObject(selectedObject.id, {
                        dimensions: { ...selectedObject.dimensions, width },
                      });
                    }
                  }}
                  min={0.1}
                  step={0.1}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">深 (m)</label>
                <input
                  type="number"
                  value={selectedObject.dimensions.depth}
                  onChange={(e) => {
                    const depth = parseFloat(e.target.value);
                    if (!isNaN(depth) && depth > 0) {
                      updateObject(selectedObject.id, {
                        dimensions: { ...selectedObject.dimensions, depth },
                      });
                    }
                  }}
                  min={0.1}
                  step={0.1}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">高 (m)</label>
                <input
                  type="number"
                  value={selectedObject.dimensions.height}
                  onChange={(e) => {
                    const height = parseFloat(e.target.value);
                    if (!isNaN(height) && height > 0) {
                      updateObject(selectedObject.id, {
                        dimensions: { ...selectedObject.dimensions, height },
                      });
                    }
                  }}
                  min={0.1}
                  step={0.1}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-750 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <Weight className="w-4 h-4" />
              承重参数
            </div>
            <WeightInput
              value={selectedObject.weight}
              unit={selectedObject.weightUnit}
              onChange={handleWeightChange}
              onUnitChange={handleWeightUnitChange}
              error={weightError}
              warning={weightWarning}
            />
            <AreaInput
              value={selectedObject.area}
              unit={selectedObject.areaUnit}
              onChange={handleAreaChange}
              onUnitChange={handleAreaUnitChange}
              error={areaError}
              warning={areaWarning}
            />
            <div
              className={cn(
                'p-3 rounded-xl border',
                isOverload
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">单位面积承重</span>
                <span
                  className={cn(
                    'text-sm font-mono font-bold',
                    isOverload ? 'text-red-400' : 'text-emerald-400'
                  )}
                >
                  {formatLoad(loadPerM2)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-500">楼板限值</span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatLoad(config.floorLoadCapacity)}
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    isOverload ? 'bg-red-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min((loadPerM2 / config.floorLoadCapacity) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {['booth', 'car'].includes(selectedObject.type) && (
            <div className="bg-slate-750 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                <Zap className="w-4 h-4" />
                电源配置
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">需要供电</span>
                <button
                  onClick={() => handlePowerChange(!selectedObject.hasPower)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors duration-200 relative',
                    selectedObject.hasPower ? 'bg-emerald-500' : 'bg-slate-600'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200',
                      selectedObject.hasPower ? 'left-7' : 'left-1'
                    )}
                  />
                </button>
              </div>
              {selectedObject.hasPower && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">电源点</label>
                  <select
                    value={selectedObject.powerSourceId || ''}
                    onChange={(e) => handlePowerSourceChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {config.powerPoints.map((pp) => (
                      <option key={pp.id} value={pp.id} className="bg-slate-800">
                        {pp.name} - ({pp.position[0].toFixed(1)}, {pp.position[2].toFixed(1)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {objectRisks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                风险提示 ({objectRisks.length})
              </div>
              {objectRisks.map((risk) => (
                <div
                  key={risk.id}
                  className={cn(
                    'p-3 rounded-xl border',
                    risk.severity === 'danger'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {risk.severity === 'danger' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm text-white font-medium">{risk.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{risk.basis}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
