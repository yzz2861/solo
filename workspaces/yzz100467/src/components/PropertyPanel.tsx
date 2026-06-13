import { useState } from 'react';
import {
  Trash2, RotateCw, Move3d, Layers, Eye, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight,
} from 'lucide-react';
import type { Sign, ComplianceWarning, MaterialType } from '@/types';
import { SIGN_TEMPLATES, ZONE_LIST } from '@/types';

interface PropertyPanelProps {
  sign: Sign | null;
  warnings: ComplianceWarning[];
  onUpdateSign: (patch: Partial<Sign>) => void;
  onDeleteSign: () => void;
}

function AxisInput({ label, value, min, max, step, unit, onChange, color }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; color?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="app-label !mb-0 flex items-center gap-1">
          <span className="inline-flex w-4 h-4 rounded items-center justify-center text-[10px] font-bold text-white" style={{ background: color || '#64748B' }}>{label}</span>
          <span>{label}轴</span>
        </label>
        <span className="text-[11px] font-mono text-surface-muted">{value.toFixed(2)}{unit}</span>
      </div>
      <div className="flex gap-1.5 items-center">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-brand-600" />
        <input type="number" step={step} value={Number(value.toFixed(2))}
          onChange={(e) => onChange(Number(e.target.value))}
          className="app-input !w-20 !py-1 text-xs font-mono text-right" />
      </div>
    </div>
  );
}

export default function PropertyPanel({ sign, warnings, onUpdateSign, onDeleteSign }: PropertyPanelProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ basic: true, pos: true, rotate: true, warn: true });
  const toggle = (k: string) => setOpenGroups((s) => ({ ...s, [k]: !s[k] }));

  if (!sign) {
    return (
      <div className="w-[320px] shrink-0 flex flex-col h-full bg-white border-l border-surface-3/60 overflow-hidden">
        <div className="p-4 border-b border-surface-3/60">
          <div className="panel-title">
            <Layers className="w-4 h-4 text-brand-600" />
            属性面板
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
            <Eye className="w-8 h-8 text-brand-500" />
          </div>
          <div className="text-sm font-medium text-surface-strong mb-1">未选中标牌</div>
          <div className="text-xs text-surface-muted leading-relaxed max-w-[200px]">
            在左侧标牌库点击添加，或在3D场景中点击标牌进行编辑
          </div>
        </div>
      </div>
    );
  }

  const tpl = SIGN_TEMPLATES[sign.type];
  const signWarnings = warnings.filter((w) => w.signId === sign.id);
  const maxLevel = signWarnings.reduce((a, w) => {
    const order = ['error', 'warning', 'info'] as const;
    return order.indexOf(w.level) < order.indexOf(a) ? w.level : a;
  }, 'info' as const);
  const statusClass = maxLevel === 'error' ? 'warn-error' : maxLevel === 'warning' ? 'warn-warning' : 'warn-info';

  return (
    <div className="w-[320px] shrink-0 flex flex-col h-full bg-white border-l border-surface-3/60 overflow-hidden">
      <div className="p-4 border-b border-surface-3/60">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center shadow-sm" style={{ background: tpl.color }}>
              <span className="text-lg font-bold" style={{ color: tpl.textColor }}>{tpl.label[0]}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <input
                  value={sign.name}
                  onChange={(e) => onUpdateSign({ name: e.target.value })}
                  className="app-input !py-1 text-sm font-semibold text-surface-strong !w-full"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="app-chip bg-brand-50 text-brand-700 border-brand-200">{tpl.label}</span>
                {signWarnings.length > 0 ? (
                  <span className={`app-chip border ${statusClass}`}>
                    <AlertTriangle className="w-3 h-3" />{signWarnings.length}项
                  </span>
                ) : (
                  <span className="app-chip bg-success-500/10 text-success-600 border-success-500/30">✓合规</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setOpenGroups((s) => ({ ...s, pos: !s.pos, rotate: !s.rotate }))} className="app-btn-secondary !py-1.5 !px-2 text-xs">
            <Move3d className="w-3.5 h-3.5" />调整参数
          </button>
          <button onClick={onDeleteSign} className="app-btn-danger !py-1.5 !px-2 text-xs">
            <Trash2 className="w-3.5 h-3.5" />删除标牌
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="app-card p-3">
          <button onClick={() => toggle('basic')} className="w-full flex items-center text-left mb-2">
            <span className="panel-title flex-1">基础信息</span>
            {openGroups.basic ? <ChevronDown className="w-4 h-4 text-surface-muted" /> : <ChevronRight className="w-4 h-4 text-surface-muted" />}
          </button>
          {openGroups.basic && (
            <div className="space-y-3">
              <div>
                <label className="app-label">所属区域</label>
                <select value={sign.zone} onChange={(e) => onUpdateSign({ zone: e.target.value })} className="app-input">
                  {ZONE_LIST.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="app-label">材质</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['acrylic', 'metal', 'pvc'] as MaterialType[]).map((m) => (
                    <button key={m}
                      onClick={() => onUpdateSign({ material: m })}
                      className={`py-1.5 rounded-md text-xs font-medium border transition ${sign.material === m ? 'bg-brand-600 border-brand-600 text-white' : 'bg-surface border-surface-3 text-surface-text hover:border-brand-300'}`}>
                      {m === 'acrylic' ? '亚克力' : m === 'metal' ? '金属' : 'PVC'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="app-label">宽度 (m)</label>
                  <input type="number" step="0.05" min="0.1" max="3" value={sign.width}
                    onChange={(e) => onUpdateSign({ width: Number(e.target.value) })}
                    className="app-input font-mono text-sm" />
                </div>
                <div>
                  <label className="app-label">高度 (m)</label>
                  <input type="number" step="0.05" min="0.1" max="3" value={sign.height}
                    onChange={(e) => onUpdateSign({ height: Number(e.target.value) })}
                    className="app-input font-mono text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="app-card p-3">
          <button onClick={() => toggle('pos')} className="w-full flex items-center text-left mb-2">
            <span className="panel-title flex-1"><Move3d className="w-4 h-4 text-brand-600" />空间位置</span>
            {openGroups.pos ? <ChevronDown className="w-4 h-4 text-surface-muted" /> : <ChevronRight className="w-4 h-4 text-surface-muted" />}
          </button>
          {openGroups.pos && (
            <div className="space-y-3">
              <AxisInput label="X" value={sign.position.x} min={0} max={40} step={0.05} unit="m" onChange={(v) => onUpdateSign({ position: { ...sign.position, x: v } })} color="#EF4444" />
              <AxisInput label="Y" value={sign.position.y} min={0} max={4} step={0.02} unit="m" onChange={(v) => onUpdateSign({ position: { ...sign.position, y: v } })} color="#22C55E" />
              <AxisInput label="Z" value={sign.position.z} min={0} max={24} step={0.05} unit="m" onChange={(v) => onUpdateSign({ position: { ...sign.position, z: v } })} color="#3B82F6" />
            </div>
          )}
        </div>

        <div className="app-card p-3">
          <button onClick={() => toggle('rotate')} className="w-full flex items-center text-left mb-2">
            <span className="panel-title flex-1"><RotateCw className="w-4 h-4 text-brand-600" />朝向旋转</span>
            {openGroups.rotate ? <ChevronDown className="w-4 h-4 text-surface-muted" /> : <ChevronRight className="w-4 h-4 text-surface-muted" />}
          </button>
          {openGroups.rotate && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="app-label !mb-0">水平朝向 (绕Y轴)</label>
                <span className="text-[11px] font-mono text-surface-muted">{(sign.rotationY * 180 / Math.PI).toFixed(0)}°</span>
              </div>
              <input type="range" min={-180} max={180} step={5}
                value={sign.rotationY * 180 / Math.PI}
                onChange={(e) => onUpdateSign({ rotationY: Number(e.target.value) * Math.PI / 180 })}
                className="w-full accent-brand-600 mb-2" />
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { lbl: '↖ 左上', val: -135 }, { lbl: '↑ 正向', val: 0 },
                  { lbl: '↗ 右上', val: 135 }, { lbl: '← 朝左', val: -90 },
                  { lbl: '→ 朝右', val: 90 }, { lbl: '↓ 反向', val: 180 },
                  { lbl: '-15°', val: -15 }, { lbl: '+15°', val: 15 },
                ].map((p) => (
                  <button key={p.lbl} onClick={() => onUpdateSign({ rotationY: p.val * Math.PI / 180 })}
                    className="py-1 text-[11px] rounded-md bg-surface border border-surface-3 hover:border-brand-300 hover:bg-brand-50 transition">
                    {p.lbl}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="app-card p-3">
          <button onClick={() => toggle('warn')} className="w-full flex items-center text-left mb-2">
            <span className="panel-title flex-1">
              <AlertTriangle className="w-4 h-4 text-accent-400" />
              合规报告
              <span className="ml-auto mr-1">{signWarnings.length === 0 ? '✓ 通过' : `${signWarnings.length}项`}</span>
            </span>
            {openGroups.warn ? <ChevronDown className="w-4 h-4 text-surface-muted" /> : <ChevronRight className="w-4 h-4 text-surface-muted" />}
          </button>
          {openGroups.warn && (
            <div className="space-y-1.5">
              {signWarnings.length === 0 ? (
                <div className="text-xs text-success-600 p-2 rounded-md bg-success-500/10 text-center border border-success-500/20">
                  此标牌无合规问题，状态良好
                </div>
              ) : (
                signWarnings.map((w) => {
                  const Icon = w.level === 'error' ? AlertCircle : w.level === 'warning' ? AlertTriangle : Info;
                  const cls = w.level === 'error' ? 'warn-error' : w.level === 'warning' ? 'warn-warning' : 'warn-info';
                  return (
                    <div key={w.id} className={`p-2 rounded-lg border ${cls}`}>
                      <div className="flex items-start gap-1.5">
                        <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium leading-snug">{w.message}</div>
                          <div className="text-[10px] opacity-80 mt-1 leading-snug">💡 {w.suggestion}</div>
                          {w.value !== undefined && w.threshold !== undefined && (
                            <div className="text-[10px] font-mono mt-1 opacity-70">
                              当前 {w.value.toFixed(2)} / 阈值 {w.threshold}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
