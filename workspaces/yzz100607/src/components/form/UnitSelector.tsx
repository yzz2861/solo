import type { LengthUnit, RainfallUnit } from '@/types';
import { cn } from '@/lib/utils';

interface UnitSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function UnitSelector({ value, onChange, options, className }: UnitSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-10 px-3 text-sm border-2 border-zinc-300 bg-white',
        'focus:outline-none focus:border-blue-700',
        'transition-all duration-200',
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function LengthUnitSelector({
  value,
  onChange,
  className,
}: {
  value: LengthUnit;
  onChange: (value: LengthUnit) => void;
  className?: string;
}) {
  return (
    <UnitSelector
      value={value}
      onChange={(v) => onChange(v as LengthUnit)}
      options={[
        { value: 'mm', label: 'mm' },
        { value: 'cm', label: 'cm' },
        { value: 'm', label: 'm' },
      ]}
      className={className}
    />
  );
}

export function RainfallUnitSelector({
  value,
  onChange,
  className,
}: {
  value: RainfallUnit;
  onChange: (value: RainfallUnit) => void;
  className?: string;
}) {
  return (
    <UnitSelector
      value={value}
      onChange={(v) => onChange(v as RainfallUnit)}
      options={[
        { value: 'mm/min', label: 'mm/min' },
        { value: 'mm/h', label: 'mm/h' },
      ]}
      className={className}
    />
  );
}
