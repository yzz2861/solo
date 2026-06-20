import { ChevronDown } from 'lucide-react';
import { WeightUnit, WEIGHT_UNIT_LABELS } from '@/types';

export default function UnitSelect({
  value,
  onChange,
  size = 'normal',
}: {
  value: WeightUnit;
  onChange: (u: WeightUnit) => void;
  size?: 'sm' | 'normal';
}) {
  const sz =
    size === 'sm'
      ? 'py-1 pl-2 pr-6 text-xs'
      : 'py-2 pl-3 pr-8 text-sm';
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as WeightUnit)}
        className={`appearance-none w-full bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 rounded-md text-slate-700 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer transition ${sz}`}
      >
        <option value="kg">{WEIGHT_UNIT_LABELS.kg}</option>
        <option value="jin">{WEIGHT_UNIT_LABELS.jin}</option>
        <option value="lb">{WEIGHT_UNIT_LABELS.lb}</option>
      </select>
      <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}
