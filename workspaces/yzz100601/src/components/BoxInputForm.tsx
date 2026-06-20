import { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Package,
  Ruler,
  Hash,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import UnitSelect from './UnitSelect';
import PositionPicker from './PositionPicker';
import { toKg } from '@/utils/unitConverter';

export default function BoxInputForm() {
  const shelf = useAppStore((s) => s.shelf);
  const boxes = useAppStore((s) => s.boxes);
  const layerResults = useAppStore((s) => s.layerResults);
  const addBox = useAppStore((s) => s.addBox);
  const updateBox = useAppStore((s) => s.updateBox);
  const removeBox = useAppStore((s) => s.removeBox);
  const resetToSample = useAppStore((s) => s.resetToSample);
  const clearBoxes = useAppStore((s) => s.clearBoxes);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filterLayer = useMemo(() => {
    const arr: (number | 'all')[] = ['all'];
    for (let i = 0; i < shelf.layerCount; i++) arr.push(i);
    return arr;
  }, [shelf.layerCount]);
  const [activeFilter, setActiveFilter] = useState<number | 'all'>('all');

  const visibleBoxes = activeFilter === 'all' ? boxes : boxes.filter((b) => b.layerIndex === activeFilter);

  const Field = ({
    label,
    icon: Icon,
    value,
    onChange,
    type = 'number',
    min = 0,
    step = 0.1,
    width,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: number | string;
    onChange: (v: number | string) => void;
    type?: 'number' | 'text';
    min?: number;
    step?: number;
    width?: string;
  }) => (
    <div className={width || ''}>
      <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      {type === 'text' ? (
        <input
          type="text"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
        />
      ) : (
        <input
          type="number"
          value={value as number}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          step={step}
          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono"
        />
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-indigo-600" />
            货物录入
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">共 {boxes.length} 条记录 · {boxes.reduce((s, b) => s + b.quantity, 0)} 件</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearBoxes}
            className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 transition"
          >
            <Trash className="w-3 h-3" />清空
          </button>
          <button
            onClick={resetToSample}
            className="px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />示例
          </button>
          <button
            onClick={addBox}
            className="px-3 py-1.5 text-[12px] font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-md shadow-sm flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />新增货物
          </button>
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex flex-wrap gap-1.5">
        {filterLayer.map((f) => {
          const count = f === 'all' ? boxes.length : boxes.filter((b) => b.layerIndex === f).length;
          const active = activeFilter === f;
          return (
            <button
              key={String(f)}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                active
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {f === 'all' ? '全部' : `第${(f as number) + 1}层`}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto max-h-[460px] p-3 space-y-2">
        {visibleBoxes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无货物</p>
            <p className="text-xs mt-1">点击右上角「新增货物」开始录入</p>
          </div>
        ) : (
          visibleBoxes.map((box) => {
            const layerResult = layerResults[box.layerIndex];
            const kgEq = toKg(box.weight, box.weightUnit);
            const lineKg = kgEq * box.quantity;
            const expanded = expandedId === box.id;
            const isMax = layerResult?.maxContributor?.boxId === box.id;
            return (
              <div
                key={box.id}
                className={`rounded-lg border transition-all overflow-hidden ${
                  isMax ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-white'
                }`}
              >
                <div
                  className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setExpandedId(expanded ? null : box.id)}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${isMax ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {box.layerIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">{box.name}</span>
                      {isMax && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-amber-500 text-white rounded">最大</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{box.weight} {box.weightUnit === 'kg' ? 'kg' : box.weightUnit === 'jin' ? '斤' : 'lb'}/件</span>
                      <span>×{box.quantity}</span>
                      <span className="text-slate-300">|</span>
                      <span>{box.length_cm}×{box.width_cm}×{box.height_cm}cm</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold font-mono text-slate-800">{lineKg.toFixed(2)}<span className="text-[10px] text-slate-500 ml-1">kg</span></div>
                    <div className="text-[10px] text-slate-400">
                      {layerResult?.totalWeight_kg ? ((lineKg / layerResult.totalWeight_kg) * 100).toFixed(1) : '0'}%
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBox(box.id);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </div>

                {expanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-12 gap-2 mt-2">
                      <div className="col-span-4">
                        <Field label="名称" icon={Package} type="text" value={box.name} onChange={(v) => updateBox(box.id, { name: String(v) })} />
                      </div>
                      <div className="col-span-2">
                        <Field label="所在层" icon={Layers} value={box.layerIndex + 1} onChange={(v) => updateBox(box.id, { layerIndex: Math.max(1, Math.min(shelf.layerCount, Number(v))) - 1 })} step={1} />
                      </div>
                      <div className="col-span-2">
                        <Field label="单重" icon={Package} value={box.weight} onChange={(v) => updateBox(box.id, { weight: Number(v) })} step={0.1} />
                      </div>
                      <div className="col-span-2 pt-3.5">
                        <UnitSelect value={box.weightUnit} onChange={(u) => updateBox(box.id, { weightUnit: u })} size="sm" />
                      </div>
                      <div className="col-span-2">
                        <Field label="数量" icon={Hash} value={box.quantity} onChange={(v) => updateBox(box.id, { quantity: Math.max(0, Number(v)) })} step={1} />
                      </div>
                      <div className="col-span-4">
                        <Field label="长(cm)" icon={Ruler} value={box.length_cm} onChange={(v) => updateBox(box.id, { length_cm: Number(v) })} step={1} />
                      </div>
                      <div className="col-span-4">
                        <Field label="宽(cm)" icon={Ruler} value={box.width_cm} onChange={(v) => updateBox(box.id, { width_cm: Number(v) })} step={1} />
                      </div>
                      <div className="col-span-4">
                        <Field label="高(cm)" icon={Ruler} value={box.height_cm} onChange={(v) => updateBox(box.id, { height_cm: Number(v) })} step={1} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <PositionPicker
                        value={box.positionZone}
                        onChange={(z) => updateBox(box.id, { positionZone: z })}
                      />
                    </div>
                    <div className="mt-3 text-[11px] flex items-center gap-3 flex-wrap px-2 py-2 rounded-md bg-white border border-slate-200">
                      <span className="text-slate-500">折算：</span>
                      <span className="font-mono text-slate-800">{kgEq.toFixed(3)} kg / 件</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-mono font-bold text-blue-700">{lineKg.toFixed(2)} kg 本层小计</span>
                      {kgEq > shelf.singleItemLimit_kg && (
                        <span className="ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">⚠ 单件超重</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
