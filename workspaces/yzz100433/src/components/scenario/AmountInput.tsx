import { useState, useEffect } from 'react';
import { INPUT_LABELS } from '@/utils/constants';
import { parseAmount } from '@/utils/formatters';
import { Calculator } from 'lucide-react';

interface AmountInputProps {
  field: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: boolean;
  correctValue?: number;
  showResult?: boolean;
}

export default function AmountInput({
  field,
  value,
  onChange,
  error = false,
  correctValue,
  showResult = false,
}: AmountInputProps) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || val === '.') {
      setInputValue(val);
      onChange(undefined);
      return;
    }
    const num = parseAmount(val);
    setInputValue(val);
    onChange(num);
  };

  const label = INPUT_LABELS[field] || field;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 font-semibold text-caramel-700">
        <Calculator className="w-4 h-4 text-primary-500" />
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-caramel-500">
          ¥
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleChange}
          placeholder="0.00"
          disabled={showResult}
          className={`w-full pl-12 pr-4 py-4 text-2xl font-bold text-center border-2 rounded-xl transition-all focus:outline-none ${
            showResult
              ? error
                ? 'border-red-400 bg-red-50 text-red-700'
                : 'border-matcha-400 bg-matcha-50 text-matcha-700'
              : error
              ? 'border-red-300 bg-red-50 focus:border-red-500'
              : 'border-primary-200 bg-white focus:border-primary-400'
          }`}
        />
        {showResult && correctValue !== undefined && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium">
            {error && (
              <span className="text-matcha-600">
                正确: ¥{correctValue.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>
      {showResult && error && (
        <p className="text-xs text-red-500 animate-shake">
          答案有误，请查看计算过程
        </p>
      )}
    </div>
  );
}
