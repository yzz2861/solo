import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import type { Position } from '../../types/devices';

interface PositionInputProps {
  value: Position;
  onChange: (position: Position) => void;
  label?: string;
}

export function PositionInput({ value, onChange, label }: PositionInputProps) {
  const [localValues, setLocalValues] = useState({
    x: value.x.toString(),
    y: value.y.toString(),
    z: value.z.toString(),
  });

  useEffect(() => {
    setLocalValues({
      x: value.x.toFixed(1),
      y: value.y.toFixed(1),
      z: value.z.toFixed(1),
    });
  }, [value]);

  const handleChange = (axis: keyof Position, e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValues(prev => ({ ...prev, [axis]: newValue }));
    
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      onChange({
        ...value,
        [axis]: numValue,
      });
    }
  };

  const handleBlur = (axis: keyof Position) => {
    const numValue = parseFloat(localValues[axis]);
    if (isNaN(numValue)) {
      setLocalValues(prev => ({
        ...prev,
        [axis]: value[axis].toFixed(1),
      }));
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-[#94a3b8]">
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] text-[#64748b] mb-0.5">X</label>
          <Input
            type="number"
            value={localValues.x}
            onChange={(e) => handleChange('x', e)}
            onBlur={() => handleBlur('x')}
            step="0.1"
            className="text-center py-1 px-2"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#64748b] mb-0.5">Y</label>
          <Input
            type="number"
            value={localValues.y}
            onChange={(e) => handleChange('y', e)}
            onBlur={() => handleBlur('y')}
            step="0.1"
            className="text-center py-1 px-2"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#64748b] mb-0.5">Z</label>
          <Input
            type="number"
            value={localValues.z}
            onChange={(e) => handleChange('z', e)}
            onBlur={() => handleBlur('z')}
            step="0.1"
            className="text-center py-1 px-2"
          />
        </div>
      </div>
    </div>
  );
}
