import { useState } from 'react';
import { ChevronDown, ChevronRight, Package, Scale, Ruler as RulerIcon, MoveHorizontal, AlertTriangle } from 'lucide-react';
import { usePlanStore } from '@/hooks/usePlanStore';
import NumberInput from '../common/NumberInput';
import type { WeightUnit } from '@/types';

export default function CargoParams() {
  const [open, setOpen] = useState(true);
  const plan = usePlanStore(s => s.currentPlan);
  const updateCargo = usePlanStore(s => s.updateCargo);
  const updateName = usePlanStore(s => s.updateName);
  const cargo = plan.cargo;

  const hasEccentric = Math.abs(cargo.liftPointOffsetX) > 0.001 || Math.abs(cargo.liftPointOffsetY) > 0.001;

  return (
    <section className="panel overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="panel-header w-full text-left hover:bg-dock-700/30 transition-colors"
      >
        <h2 className="panel-title">
          <Package className="w-4 h-4" /> 货物参数
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {!cargo.height && <span className="risk-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" />高度缺失</span>}
          {hasEccentric && <span className="risk-warning flex items-center gap-1"><MoveHorizontal className="w-3 h-3" />偏心</span>}
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="p-3 space-y-3">
          <div>
            <label className="label">方案/货物名称</label>
            <input
              type="text"
              value={plan.name}
              onChange={e => updateName(e.target.value)}
              className="input-field"
              placeholder="例：3号泊位-汽轮机转子卸船"
            />
          </div>

          <div>
            <label className="label">货物名称</label>
            <input
              type="text"
              value={cargo.name}
              onChange={e => updateCargo({ name: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Scale className="w-3 h-3 text-safety-orange" /> 重量
            </label>
            <NumberInput
              value={cargo.weight}
              onChange={v => updateCargo({ weight: v })}
              min={0} step={cargo.weightUnit === 'ton' ? 0.1 : 50}
              unitOptions={[
                { value: 'ton', label: '吨 (t)' },
                { value: 'kg', label: '公斤 (kg)' },
              ]}
              unitValue={cargo.weightUnit}
              onUnitChange={u => updateCargo({ weightUnit: u as WeightUnit })}
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <RulerIcon className="w-3 h-3 text-safety-blue" /> 外形尺寸（长×宽×高）
            </label>
            <div className="grid grid-cols-3 gap-2">
              <NumberInput
                label="长"
                value={cargo.length} onChange={v => updateCargo({ length: v })}
                unit="m" min={0.1} step={0.05}
              />
              <NumberInput
                label="宽"
                value={cargo.width} onChange={v => updateCargo({ width: v })}
                unit="m" min={0.1} step={0.05}
              />
              <NumberInput
                label="高（含吊具）"
                value={cargo.height ?? 0}
                onChange={v => updateCargo({ height: v > 0 ? v : undefined })}
                unit="m" min={0} step={0.05}
                placeholder="可留空"
              />
            </div>
            {!cargo.height && (
              <div className="mt-1.5 text-[11px] text-safety-yellow flex items-start gap-1.5 bg-safety-yellow/5 border border-safety-yellow/20 rounded px-2 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>未填高度将按 3m 估算净距。建议输入：货物本体 + 吊具/吊索 + 垫木。</span>
              </div>
            )}
          </div>

          <div className="pt-1 border-t border-dock-700/60">
            <label className="label flex items-center gap-1.5">
              <MoveHorizontal className="w-3 h-3 text-safety-yellow" /> 吊点偏心距（相对几何中心）
            </label>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="X 方向偏心"
                value={cargo.liftPointOffsetX}
                onChange={v => updateCargo({ liftPointOffsetX: v })}
                unit="m" step={0.01}
              />
              <NumberInput
                label="Y 方向偏心"
                value={cargo.liftPointOffsetY}
                onChange={v => updateCargo({ liftPointOffsetY: v })}
                unit="m" step={0.01}
              />
            </div>
            {hasEccentric && (
              <div className="mt-1.5 text-[11px] text-safety-yellow bg-safety-yellow/5 border border-safety-yellow/20 rounded px-2 py-1.5">
                ⚠ 偏心起吊会导致摆动和支腿反力不均，净距需再增加 1.5~2× 偏心量。
              </div>
            )}
          </div>

          <div>
            <label className="label">货物放置位置（坐标）</label>
            <div className="grid grid-cols-3 gap-2">
              <NumberInput
                label="X"
                value={cargo.position[0]}
                onChange={v => updateCargo({ position: [v, cargo.position[1], cargo.position[2]] })}
                unit="m" step={0.5}
              />
              <NumberInput
                label="底高"
                value={cargo.position[1]}
                onChange={v => updateCargo({ position: [cargo.position[0], v, cargo.position[2]] })}
                unit="m" step={0.1} min={0}
              />
              <NumberInput
                label="Z"
                value={cargo.position[2]}
                onChange={v => updateCargo({ position: [cargo.position[0], cargo.position[1], v] })}
                unit="m" step={0.5}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
