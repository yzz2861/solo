import { useState } from 'react';
import { ChevronDown, ChevronRight, Truck, Ruler, Scale3d } from 'lucide-react';
import { usePlanStore } from '@/hooks/usePlanStore';
import NumberInput from '../common/NumberInput';
import { CRANE_PRESETS } from '@/utils/mockData';

export default function CraneParams() {
  const [open, setOpen] = useState(true);
  const plan = usePlanStore(s => s.currentPlan);
  const updateCrane = usePlanStore(s => s.updateCrane);
  const crane = plan.crane;

  const applyPreset = (pid: string) => {
    const p = CRANE_PRESETS.find(x => x.id === pid);
    if (!p) return;
    updateCrane({
      ...p.spec,
      basePosition: crane.basePosition,
      brand: p.brand as any,
    });
  };

  return (
    <section className="panel overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="panel-header w-full text-left hover:bg-dock-700/30 transition-colors"
      >
        <h2 className="panel-title">
          <Truck className="w-4 h-4" /> 吊车参数
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="font-mono">{crane.brand ?? ''} {crane.model}</span>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="p-3 space-y-3">
          <div>
            <label className="label">型号预设（临时换吊车可重新选择）</label>
            <div className="grid grid-cols-3 gap-2">
              {CRANE_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`p-2 rounded text-xs border transition-all ${
                    crane.model === p.spec.model
                      ? 'border-safety-orange bg-safety-orange/10 text-safety-orange shadow-glow'
                      : 'border-dock-600 bg-dock-900/50 text-slate-300 hover:border-dock-500'
                  }`}
                >
                  <div className="font-semibold">{p.brand}</div>
                  <div className="font-mono text-[11px] opacity-80">{p.spec.model}</div>
                  <div className="mt-0.5 text-[10px] opacity-60">{p.spec.ratedCapacity}t · {p.spec.maxArmLength}m</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <NumberInput
              label="最大臂长"
              value={crane.maxArmLength}
              onChange={v => updateCrane({ maxArmLength: v })}
              unit="m"
              min={5} max={80} step={0.5}
            />
            <NumberInput
              label="额定起重量"
              value={crane.ratedCapacity}
              onChange={v => updateCrane({ ratedCapacity: v })}
              unit="t"
              min={1} max={500} step={1}
            />
          </div>

          <div className="pt-1 border-t border-dock-700/60">
            <label className="label flex items-center gap-1.5">
              <Ruler className="w-3 h-3 text-safety-blue" /> 停靠位置（码头坐标）
            </label>
            <div className="grid grid-cols-3 gap-2">
              <NumberInput
                label="X（横向）"
                value={crane.basePosition[0]}
                onChange={v => updateCrane({ basePosition: [v, crane.basePosition[1], crane.basePosition[2]] })}
                unit="m" step={0.5}
              />
              <NumberInput
                label="Y（高度）"
                value={crane.basePosition[1]}
                onChange={v => updateCrane({ basePosition: [crane.basePosition[0], v, crane.basePosition[2]] })}
                unit="m" step={0.1} min={0}
              />
              <NumberInput
                label="Z（纵向）"
                value={crane.basePosition[2]}
                onChange={v => updateCrane({ basePosition: [crane.basePosition[0], crane.basePosition[1], v] })}
                unit="m" step={0.5}
              />
            </div>
          </div>

          <div className="pt-1 border-t border-dock-700/60">
            <label className="label flex items-center gap-1.5">
              <Scale3d className="w-3 h-3 text-safety-yellow" /> 作业半径表（当前型号 {crane.radiusTable.length} 条记录）
            </label>
            <div className="bg-dock-950/50 rounded px-2.5 py-1.5 text-[11px] text-slate-400 font-mono flex justify-between">
              <span>臂长档位数：{new Set(crane.radiusTable.map(r => r.armLength)).size}</span>
              <span>半径范围：{Math.min(...crane.radiusTable.map(r => r.radius))}~{Math.max(...crane.radiusTable.map(r => r.radius))}m</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
