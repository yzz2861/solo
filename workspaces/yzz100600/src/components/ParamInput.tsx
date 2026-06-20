import { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: { value: string; label: string }[];
}

export const UnitSelect = ({ options, className, ...rest }: SelectProps) => (
  <select
    className={cn(
      'h-12 px-4 rounded-lg border-2 border-industrial-100 bg-industrial-50/50 text-industrial-700 font-medium text-sm outline-none transition-all cursor-pointer hover:border-industrial-200 focus:border-aqua-400 focus:bg-white focus:shadow-glow-sm',
      className,
    )}
    {...rest}
  >
    {options.map((op) => (
      <option key={op.value} value={op.value}>
        {op.label}
      </option>
    ))}
  </select>
);

interface ParamInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  hint?: string;
  accentColor?: string;
}

const ParamInput = ({
  label,
  icon,
  hint,
  accentColor = '#00B8D9',
  className,
  ...rest
}: ParamInputProps) => (
  <div className="group">
    <div className="flex items-center justify-between mb-2">
      <label className="flex items-center gap-2 text-sm font-medium text-industrial-700">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm shadow-md"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)` }}
        >
          {icon}
        </span>
        {label}
      </label>
      {hint && <span className="text-xs text-industrial-400">{hint}</span>}
    </div>
    <div className="gauge-line">
      <input
        className={cn('param-input', className)}
        {...rest}
      />
    </div>
  </div>
);

export default ParamInput;
