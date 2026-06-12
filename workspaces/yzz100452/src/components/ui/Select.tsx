import * as React from "react";
import { cn } from "../../utils/cn";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
  onChange?: (value: string) => void;
  wrapperClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  placeholder = "请选择",
  error,
  hint,
  onChange,
  wrapperClassName,
  className,
  id,
  value,
  ...props
}) => {
  const selectId = id || React.useId();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={cn("w-full", wrapperClassName)}>
      {label && (
        <label htmlFor={selectId} className="label-field">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "input-field appearance-none pr-9 cursor-pointer",
            error && "border-signal-red/60 focus:border-signal-red focus:ring-2 focus:ring-signal-red/20",
            className
          )}
          value={value}
          onChange={handleChange}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-400 pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1 text-xs text-signal-red">{error}</p>
      )}
      {!error && hint && (
        <p className="mt-1 text-xs text-space-400">{hint}</p>
      )}
    </div>
  );
};
