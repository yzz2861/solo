import {
  Scale,
  Droplets,
  Thermometer,
  Wind,
  CloudRain,
  Package,
} from 'lucide-react';
import { useDryingStore } from '@/store/useDryingStore';
import { getWarningsByField } from '@/utils/validation';

interface FieldProps {
  label: string;
  icon: React.ReactNode;
  value: string | number;
  unit?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  warnings?: Array<{ type: string; message: string }>;
}

function InputField({
  label,
  icon,
  value,
  unit,
  onChange,
  placeholder,
  type = 'text',
  warnings = [],
}: FieldProps) {
  const hasError = warnings.some((w) => w.type === 'error');
  const hasWarning = warnings.some((w) => w.type === 'warning');

  const inputClass = `input-field ${hasError ? 'error' : ''} ${
    hasWarning && !hasError ? 'warning' : ''
  } pr-${unit ? '16' : '4'}`;

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-warm-700">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-400 text-sm">
            {unit}
          </span>
        )}
      </div>
      {warnings.length > 0 && (
        <p
          className={`text-xs ${
            hasError ? 'text-red-500' : 'text-amber-500'
          }`}
        >
          {warnings[0].message}
        </p>
      )}
    </div>
  );
}

export default function InputCard() {
  const { params, setParam, warnings } = useDryingStore();

  const handleNumberChange = (
    key: keyof typeof params,
    value: string
  ) => {
    const num = value === '' ? 0 : parseFloat(value);
    setParam(key, isNaN(num) ? 0 : num);
  };

  const fieldWarnings = (field: string) =>
    getWarningsByField(warnings, field).map((w) => ({
      type: w.type,
      message: w.message,
    }));

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-bold flex items-center gap-3">
          <Package className="w-6 h-6" />
          烘干参数设置
        </h2>
        <p className="text-sm text-primary-100 mt-1">
          输入物料和烘房参数，自动估算排湿量和时间
        </p>
      </div>

      <div className="p-6 space-y-5">
        <InputField
          label="物料名称"
          icon={<Package className="w-4 h-4 text-primary-500" />}
          value={params.materialName}
          onChange={(v) => setParam('materialName', v)}
          placeholder="如：红薯片、芒果干"
          warnings={[]}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="物料重量"
            icon={<Scale className="w-4 h-4 text-primary-500" />}
            value={params.weight || ''}
            unit="kg"
            type="number"
            onChange={(v) => handleNumberChange('weight', v)}
            placeholder="0"
            warnings={fieldWarnings('weight')}
          />
          <InputField
            label="烘房温度"
            icon={<Thermometer className="w-4 h-4 text-primary-500" />}
            value={params.temperature || ''}
            unit="℃"
            type="number"
            onChange={(v) => handleNumberChange('temperature', v)}
            placeholder="60"
            warnings={fieldWarnings('temperature')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="初始含水率"
            icon={<Droplets className="w-4 h-4 text-primary-500" />}
            value={params.initialMoisture || ''}
            unit="%"
            type="number"
            onChange={(v) => handleNumberChange('initialMoisture', v)}
            placeholder="如 60"
            warnings={fieldWarnings('initialMoisture')}
          />
          <InputField
            label="目标含水率"
            icon={<Droplets className="w-4 h-4 text-primary-500" />}
            value={params.targetMoisture || ''}
            unit="%"
            type="number"
            onChange={(v) => handleNumberChange('targetMoisture', v)}
            placeholder="如 12"
            warnings={fieldWarnings('targetMoisture')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="排风量"
            icon={<Wind className="w-4 h-4 text-primary-500" />}
            value={params.airFlow || ''}
            unit="m³/h"
            type="number"
            onChange={(v) => handleNumberChange('airFlow', v)}
            placeholder="如 500"
            warnings={fieldWarnings('airFlow')}
          />
          <InputField
            label="环境湿度"
            icon={<CloudRain className="w-4 h-4 text-primary-500" />}
            value={params.ambientHumidity || ''}
            unit="%"
            type="number"
            onChange={(v) => handleNumberChange('ambientHumidity', v)}
            placeholder="如 60"
            warnings={fieldWarnings('ambientHumidity')}
          />
        </div>
      </div>
    </div>
  );
}
