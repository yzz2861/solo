import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div
        className={`relative w-5 h-5 rounded border-2 transition-all ${
          checked
            ? 'bg-primary-600 border-primary-600'
            : 'bg-white border-neutral-300 hover:border-neutral-400'
        }`}
        onClick={() => !disabled && onChange(!checked)}
      >
        {checked && (
          <Check className="absolute inset-0 m-auto w-3.5 h-3.5 text-white" />
        )}
      </div>
      {label && (
        <span className="text-sm text-neutral-700 select-none">{label}</span>
      )}
    </label>
  );
};

export default Checkbox;
