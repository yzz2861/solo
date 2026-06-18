import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectProps {
  label?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({ 
  label, options, value, onChange, placeholder = '请选择', className, disabled = false
}) => {
  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-2.5 pr-10 text-sm',
            'bg-white border border-gray-300 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'appearance-none cursor-pointer',
            'transition-colors',
            disabled && 'bg-gray-100 cursor-not-allowed opacity-60',
            className
          )}
        >
            <option value="">{placeholder}</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
};

interface MultiSelectProps {
  label?: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = '请选择',
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };
  
  const toggleAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };
  
  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full px-4 py-2.5 text-left text-sm',
          'bg-white border border-gray-300 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'flex items-center justify-between',
          'transition-colors'
        )}
      >
        <span className={selected.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
          {selected.length > 0 
            ? `已选择 ${selected.length} 项`
            : placeholder
          }
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-gray-100">
            <button
              type="button"
              onClick={toggleAll}
              className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded"
            >
              {selected.length === options.length ? '取消全选' : '全选'}
            </button>
          </div>
          {options.map(option => (
            <label
              key={option.value}
              className={cn(
                'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50',
                selected.includes(option.value) && 'bg-blue-50'
              )}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
