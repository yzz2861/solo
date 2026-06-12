import { useState } from 'react';
import { ChevronDown, ChevronRight, Repeat, Plus, Trash2, Play, Pause, CircleDot, Gauge, Navigation, MapPin } from 'lucide-react';
import { usePlanStore } from '@/hooks/usePlanStore';
import NumberInput from '../common/NumberInput';

interface Props {
  activeOpId?: string;
  setActiveOpId: (id: string | undefined) => void;
  animate?: boolean;
  setAnimate: (on: boolean) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export default function OperationPanel({
  activeOpId, setActiveOpId, animate, setAnimate,
}: Props) {
  const [open, setOpen] = useState(true);
  const plan = usePlanStore(s => s.currentPlan);
  const ops = plan.operations;
  const updateOp = usePlanStore(s => s.updateOperation);
  const addOp = usePlanStore(s => s.addOperation);
  const removeOp = usePlanStore(s => s.removeOperation);
  const updateWind = usePlanStore(s => s.updateWindSpeed);
  const updateRem = usePlanStore(s => s.updateRemarks);

  const addOperation = () => {
    const n = ops.length + 1;
    const last = ops[ops.length - 1];
    addOp({
      id: uid(),
      liftNo: `L-${String(n).padStart(3, '0')}`,
      armLength: last?.armLength ?? plan.crane.maxArmLength * 0.7,
      startAngle: last?.startAngle ?? 45,
      endAngle: last?.endAngle ?? 180,
      stepAngle: 5,
      liftPoint: last?.liftPoint ?? [-14, 1, 22],
      dropPoint: last?.dropPoint ?? [20, 0.5, -8],
      reviewed: false,
    });
  };

  return (
    <section className="panel overflow-hidden">
      <div
        onClick={() => setOpen(v => !v)}
        className="panel-header w-full text-left hover:bg-dock-700/30 transition-colors cursor-pointer"
      >
        <h2 className="panel-title">
          <Repeat className="w-4 h-4" /> 作业参数 · 吊次
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={(e) => { e.stopPropagation(); setAnimate(!animate); }}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition ${
              animate ? 'border-safety-green bg-safety-green/10 text-safety-green' : 'border-dock-600 text-slate-400 hover:text-slate-200'
            }`}
          >
            {animate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {animate ? '动画中' : '播放动画'}
          </button>
          <span>{ops.length} 吊次</span>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {open && (
        <div className="p-3 space-y-3">
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {ops.map((op, i) => {
              const active = op.id === activeOpId || (!activeOpId && i === 0);
              return (
                <div
                  key={op.id}
                  onClick={() => setActiveOpId(op.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    active
                      ? 'border-safety-orange/70 bg-safety-orange/5 shadow-[0_0_0_1px_rgba(255,138,61,0.2)]'
                      : 'border-dock-700 bg-dock-900/40 hover:border-dock-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CircleDot className={`w-4 h-4 ${active ? 'text-safety-orange' : 'text-slate-500'}`} />
                      <input
                        value={op.liftNo}
                        onChange={e => updateOp(op.id, { liftNo: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        className="bg-transparent text-sm font-mono font-bold text-white border-b border-transparent hover:border-dock-600 focus:border-safety-orange focus:outline-none w-20"
                      />
                      {op.reviewed
                        ? <span className="risk-green">已复查</span>
                        : <span className="risk-warning">待复查</span>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`删除吊次 ${op.liftNo}?`)) removeOp(op.id); }}
                      className="text-slate-500 hover:text-safety-red transition-colors p-1"
                      disabled={ops.length <= 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <NumberInput
                      label={<span className="inline-flex items-center gap-1"><Gauge className="w-3 h-3 text-safety-orange" />臂长</span> as any}
                      value={op.armLength}
                      onChange={v => updateOp(op.id, { armLength: v })}
                      unit="m" min={3} max={plan.crane.maxArmLength} step={0.5}
                    />
                    <NumberInput
                      label="步长"
                      value={op.stepAngle}
                      onChange={v => updateOp(op.id, { stepAngle: Math.max(1, v) })}
                      unit="°" min={1} max={30} step={1}
                      decimals={0}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <NumberInput
                      label={<span className="inline-flex items-center gap-1"><Navigation className="w-3 h-3 text-safety-blue" />起始角</span> as any}
                      value={op.startAngle}
                      onChange={v => updateOp(op.id, { startAngle: v })}
                      unit="°" min={-180} max={360} step={1} decimals={0}
                    />
                    <NumberInput
                      label={<span className="inline-flex items-center gap-1"><Navigation className="w-3 h-3 text-safety-green" />终止角</span> as any}
                      value={op.endAngle}
                      onChange={v => updateOp(op.id, { endAngle: v })}
                      unit="°" min={-180} max={360} step={1} decimals={0}
                    />
                  </div>

                  <div className="mt-2 pt-2 border-t border-dock-700/50 space-y-2">
                    <div>
                      <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-safety-orange" />起吊点
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <NumberInput
                          value={op.liftPoint[0]}
                          onChange={v => updateOp(op.id, { liftPoint: [v, op.liftPoint[1], op.liftPoint[2]] })}
                          unit="X" step={0.5}
                        />
                        <NumberInput
                          value={op.liftPoint[2]}
                          onChange={v => updateOp(op.id, { liftPoint: [op.liftPoint[0], op.liftPoint[1], v] })}
                          unit="Z" step={0.5}
                        />
                        <NumberInput
                          value={op.liftPoint[1]}
                          onChange={v => updateOp(op.id, { liftPoint: [op.liftPoint[0], v, op.liftPoint[2]] })}
                          unit="高" step={0.1} min={0}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-safety-green" />落吊点
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <NumberInput
                          value={op.dropPoint[0]}
                          onChange={v => updateOp(op.id, { dropPoint: [v, op.dropPoint[1], op.dropPoint[2]] })}
                          unit="X" step={0.5}
                        />
                        <NumberInput
                          value={op.dropPoint[2]}
                          onChange={v => updateOp(op.id, { dropPoint: [op.dropPoint[0], op.dropPoint[1], v] })}
                          unit="Z" step={0.5}
                        />
                        <NumberInput
                          value={op.dropPoint[1]}
                          onChange={v => updateOp(op.id, { dropPoint: [op.dropPoint[0], v, op.dropPoint[2]] })}
                          unit="高" step={0.1} min={0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={addOperation} className="btn-secondary w-full justify-center">
            <Plus className="w-4 h-4" /> 增加吊次
          </button>

          <div className="pt-2 border-t border-dock-700/60 grid grid-cols-2 gap-2">
            <NumberInput
              label="现场风速"
              value={plan.windSpeed}
              onChange={v => updateWind(v)}
              unit="m/s" min={0} max={30} step={0.1}
            />
            <div>
              <label className="label">工况备注</label>
              <textarea
                value={plan.remarks}
                onChange={e => updateRem(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="如：支腿垫30mm钢板、设揽风绳、现场安全员旁站…"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
