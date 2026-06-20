import { Layers, Maximize2, Scale, PackageOpen } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ShelfConfig } from '@/types';

export default function ShelfConfigForm() {
  const shelf = useAppStore((s) => s.shelf);
  const setShelf = useAppStore((s) => s.setShelf);

  const Field = ({
    label,
    icon: Icon,
    unit,
    value,
    onChange,
    type = 'number',
    min,
    max,
    step,
    bold,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    unit?: string;
    value: string | number;
    onChange: (v: number) => void;
    type?: 'number' | 'text';
    min?: number;
    max?: number;
    step?: number;
    bold?: boolean;
  }) => (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        {label}
        {unit && <span className="normal-case text-slate-400">({unit})</span>}
      </span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'text' ? (e.target.value as never) : Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 ${
            bold ? 'font-bold text-slate-900' : 'text-slate-700'
          }`}
        />
      </div>
    </label>
  );

  const handleText = (k: keyof ShelfConfig) => (v: number) => setShelf({ [k]: v } as Partial<ShelfConfig>);

  return (
    <div className="bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 rounded-xl p-5 text-white shadow-lg border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold tracking-wide flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-blue-300" />
            货架配置
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">所有参数将实时影响承重计算</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400 uppercase">当前货架</div>
          <div className="text-sm font-semibold text-blue-200">{shelf.name}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-2">
          <label className="block">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1 uppercase tracking-wider">
              <PackageOpen className="w-3.5 h-3.5" />
              货架名称
            </span>
            <input
              type="text"
              value={shelf.name}
              onChange={(e) => setShelf({ name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700/60 border border-slate-600 rounded-md text-sm text-white outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
        </div>

        <Field label="层数" icon={Layers} value={shelf.layerCount} onChange={handleText('layerCount')} min={1} max={20} bold />
        <Field label="层板限重" icon={Scale} unit="kg" value={shelf.layerMaxWeight_kg} onChange={handleText('layerMaxWeight_kg')} min={1} step={5} bold />
        <Field label="宽度" icon={Maximize2} unit="cm" value={shelf.layerWidth_cm} onChange={handleText('layerWidth_cm')} min={10} step={5} />
        <Field label="深度" icon={Maximize2} unit="cm" value={shelf.layerDepth_cm} onChange={handleText('layerDepth_cm')} min={10} step={5} />
        <div className="col-span-2">
          <Field label="单件建议上限" icon={Scale} unit="kg" value={shelf.singleItemLimit_kg} onChange={handleText('singleItemLimit_kg')} min={1} step={1} />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/60 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div>
          <div className="text-slate-400">单层面板</div>
          <div className="mt-0.5 font-mono text-blue-200 font-semibold">
            {shelf.layerWidth_cm}×{shelf.layerDepth_cm}cm
          </div>
        </div>
        <div>
          <div className="text-slate-400">总面积</div>
          <div className="mt-0.5 font-mono text-blue-200 font-semibold">
            {((shelf.layerWidth_cm * shelf.layerDepth_cm * shelf.layerCount) / 10000).toFixed(2)} m²
          </div>
        </div>
        <div>
          <div className="text-slate-400">总限重</div>
          <div className="mt-0.5 font-mono text-blue-200 font-semibold">
            {(shelf.layerMaxWeight_kg * shelf.layerCount).toFixed(0)} kg
          </div>
        </div>
      </div>
    </div>
  );
}
