import { useBufferStore } from '@/store/useBufferStore';
import type { ConcentrationUnit, VolumeUnit } from '@/types';
import { FlaskConical, Droplets, Beaker } from 'lucide-react';

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">{icon}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${icon ? 'pl-9' : ''}`}
        />
      </div>
    </div>
  );
}

function UnitSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

const concUnits: { value: ConcentrationUnit; label: string }[] = [
  { value: 'mol/L', label: 'mol/L' },
  { value: 'mM', label: 'mM' },
];

const volUnits: { value: VolumeUnit; label: string }[] = [
  { value: 'mL', label: 'mL' },
  { value: 'L', label: 'L' },
];

export default function InputPanel() {
  const { input, setInput, calculateResult, resetInput } = useBufferStore();

  const handleCalculate = () => {
    calculateResult();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-teal-600" />
            <h3 className="font-serif text-lg font-bold text-teal-800">酸组分</h3>
          </div>
          <div className="space-y-3">
            <LabeledInput
              label="名称"
              value={input.acidName}
              onChange={(v) => setInput('acidName', v)}
              placeholder="如：乙酸 (HAc)"
              icon={<FlaskConical className="h-4 w-4" />}
            />
            <LabeledInput
              label="母液浓度"
              type="number"
              value={input.acidConcentration || ''}
              onChange={(v) => setInput('acidConcentration', parseFloat(v) || 0)}
              placeholder="0.1"
            />
            <div className="flex items-end gap-2">
              <UnitSelect
                value={input.acidConcentrationUnit}
                onChange={(v) => setInput('acidConcentrationUnit', v)}
                options={concUnits}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-amber-600" />
            <h3 className="font-serif text-lg font-bold text-amber-800">碱组分</h3>
          </div>
          <div className="space-y-3">
            <LabeledInput
              label="名称"
              value={input.baseName}
              onChange={(v) => setInput('baseName', v)}
              placeholder="如：乙酸钠 (NaAc)"
              icon={<Droplets className="h-4 w-4" />}
            />
            <LabeledInput
              label="母液浓度"
              type="number"
              value={input.baseConcentration || ''}
              onChange={(v) => setInput('baseConcentration', parseFloat(v) || 0)}
              placeholder="0.1"
            />
            <div className="flex items-end gap-2">
              <UnitSelect
                value={input.baseConcentrationUnit}
                onChange={(v) => setInput('baseConcentrationUnit', v)}
                options={concUnits}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Beaker className="h-5 w-5 text-slate-600" />
          <h3 className="font-serif text-lg font-bold text-slate-800">目标参数</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LabeledInput
            label="pKa"
            type="number"
            value={input.pKa || ''}
            onChange={(v) => setInput('pKa', parseFloat(v) || 0)}
            placeholder="4.76"
          />
          <LabeledInput
            label="目标 pH"
            type="number"
            value={input.targetPH || ''}
            onChange={(v) => setInput('targetPH', parseFloat(v) || 0)}
            placeholder="4.8"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <LabeledInput
                label="目标体积"
                type="number"
                value={input.targetVolume || ''}
                onChange={(v) => setInput('targetVolume', parseFloat(v) || 0)}
                placeholder="100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">&nbsp;</label>
              <UnitSelect
                value={input.targetVolumeUnit}
                onChange={(v) => setInput('targetVolumeUnit', v)}
                options={volUnits}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCalculate}
          className="rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-white shadow-md shadow-amber-200 transition-all hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-300 active:scale-[0.97]"
        >
          计算配比
        </button>
        <button
          onClick={resetInput}
          className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]"
        >
          重置
        </button>
      </div>
    </div>
  );
}
