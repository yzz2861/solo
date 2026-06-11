import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { WeightUnit } from '../../types/devices';
import { parseWeightInput, getWeightUnitOptions } from '../../utils/unitConversion';

interface WeightInputProps {
  value: number;
  unit: WeightUnit;
  onChange: (weight: number, unit: WeightUnit) => void;
  label?: string;
  error?: boolean;
}

export function WeightInput({ value, unit, onChange, label, error }: WeightInputProps) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (unit === '') {
      setInputValue('');
    } else {
      setInputValue(value.toString());
    }
  }, [value, unit]);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue === '') {
      onChange(0, '');
    } else {
      const parsed = parseWeightInput(newValue + (unit || 'kg'));
      onChange(parsed.weight, parsed.unit || unit || 'kg');
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as WeightUnit;
    if (newUnit === '') {
      onChange(0, '');
    } else {
      onChange(value || 0, newUnit);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim() === '') {
      onChange(0, '');
    }
  };

  const unitOptions = getWeightUnitOptions();

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Input
          label={label}
          type="number"
          value={inputValue}
          onChange={handleWeightChange}
          onBlur={handleBlur}
          placeholder="输入重量"
          error={error || (unit === '' && inputValue !== '')}
          min="0"
          step="0.1"
        />
      </div>
      <div className="w-24">
        <Select
          value={unit}
          onChange={handleUnitChange}
          error={error}
        >
          <option value="">--</option>
          {unitOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
