import React from 'react';
import { Card } from '../common/Card';
import { NumberInput } from '../common/NumberInput';
import { useAppStore } from '../../store/useAppStore';
import {
  CapacityUnit,
  CellType,
} from '../../types';
import {
  CELL_LABELS,
  CELL_TEMP_COEFFICIENTS,
  CELL_VOLTAGES,
} from '../../constants/defaults';
import { convertCapacityToWh, convertWhToCapacity } from '../../lib/units';
import { formatmAh, formatWh, formatNumber } from '../../lib/formatters';

const CELL_TYPES: CellType[] = ['LiPo', 'Li-ion', 'LiFePO4', 'NiMH'];
const CAPACITY_UNITS: readonly CapacityUnit[] = ['mAh', 'Wh'] as const;
const SERIES_OPTIONS = [1, 2, 3, 4, 6, 8];

export const BatteryForm: React.FC = () => {
  const battery = useAppStore((s) => s.battery);
  const setBattery = useAppStore((s) => s.setBattery);

  const totalVoltage = battery.nominalVoltage * battery.seriesCount;
  const whValue = convertCapacityToWh(battery.capacity, battery.capacityUnit, totalVoltage);

  const handleCapacityChange = (newVal: number) => {
    setBattery({ capacity: newVal });
  };

  const handleCapacityUnitChange = (newUnit: string) => {
    const unit = newUnit as CapacityUnit;
    if (unit === battery.capacityUnit) return;
    const tv = battery.nominalVoltage * battery.seriesCount;
    const wh = convertCapacityToWh(battery.capacity, battery.capacityUnit, tv);
    const newCapacity = convertWhToCapacity(wh, unit, tv);
    setBattery({ capacity: Math.round(newCapacity * 100) / 100, capacityUnit: unit });
  };

  const handleSeriesChange = (val: string) => {
    const s = parseInt(val, 10);
    if (!isNaN(s)) {
      const newNominal = CELL_VOLTAGES[battery.cellType];
      setBattery({ seriesCount: s, nominalVoltage: newNominal });
    }
  };

  const handleCellTypeChange = (val: string) => {
    const type = val as CellType;
    setBattery({
      cellType: type,
      nominalVoltage: CELL_VOLTAGES[type],
    });
  };

  return (
    <Card
      id="battery"
      title="电池组参数"
      icon="🔋"
      accent="primary"
      animationDelay={0.04}
      titleExtra={
        <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
          <span className="px-2 py-0.5 rounded bg-accent-primary/15 text-accent-primary border border-accent-primary/25">
            {formatWh(whValue)}
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            id="battery-capacity"
            label="电池容量"
            value={battery.capacity}
            onChange={handleCapacityChange}
            min={1}
            step={battery.capacityUnit === 'mAh' ? 10 : 0.1}
            decimals={battery.capacityUnit === 'mAh' ? 0 : 2}
            unitOptions={CAPACITY_UNITS}
            selectedUnit={battery.capacityUnit}
            onUnitChange={handleCapacityUnitChange}
            hint={battery.capacityUnit === 'mAh'
              ? `≈ ${formatmAh(battery.capacity)}`
              : `≈ ${formatmAh(convertWhToCapacity(battery.capacity, 'mAh', totalVoltage))}`
            }
          />
          <NumberInput
            id="battery-voltage"
            label="标称电压"
            suffix="V"
            value={battery.nominalVoltage}
            onChange={(v) => setBattery({ nominalVoltage: v })}
            min={0.1}
            step={0.05}
            decimals={2}
            hint={`${battery.seriesCount}S 组串总压 ${formatNumber(totalVoltage, 2)}V`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary tracking-wide">
              电芯类型
            </label>
            <select
              value={battery.cellType}
              onChange={(e) => handleCellTypeChange(e.target.value)}
              className="select-base"
            >
              {CELL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CELL_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-text-muted leading-tight">
              温度系数 {formatNumber(CELL_TEMP_COEFFICIENTS[battery.cellType], 1)}%/℃
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary tracking-wide">
              串联节数 (S)
            </label>
            <select
              value={battery.seriesCount}
              onChange={(e) => handleSeriesChange(e.target.value)}
              className="select-base"
            >
              {SERIES_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}S — {formatNumber(CELL_VOLTAGES[battery.cellType] * s, 2)}V
                </option>
              ))}
            </select>
            <div className="text-[11px] text-text-muted leading-tight">
              总压 = {battery.seriesCount} × {formatNumber(battery.nominalVoltage, 2)}V
            </div>
          </div>
        </div>

        <div className="mt-2 pt-3 border-t border-dashed border-custom/60">
          <BatteryVisual
            capacity={battery.capacity}
            unit={battery.capacityUnit}
            voltage={totalVoltage}
            cellType={battery.cellType}
          />
        </div>
      </div>
    </Card>
  );
};

interface BatteryVisualProps {
  capacity: number;
  unit: CapacityUnit;
  voltage: number;
  cellType: CellType;
}

const BatteryVisual: React.FC<BatteryVisualProps> = ({ capacity, unit, voltage, cellType }) => {
  const displayCapacity = unit === 'mAh' ? `${formatNumber(capacity, 0)} mAh` : `${formatNumber(capacity, 2)} Wh`;
  const fillPct = Math.min(100, Math.max(10, (capacity / (unit === 'mAh' ? 10000 : 50)) * 100));

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-black/25 border border-custom">
      <div className="relative flex-shrink-0">
        <div className="flex items-center">
          <div className="relative w-[90px] h-[44px] rounded-md border-2 border-text-secondary/60 bg-black/40 overflow-hidden">
            <div
              className="absolute inset-y-1 left-1 rounded-[3px] transition-all duration-700 ease-out"
              style={{
                width: `${fillPct}%`,
                background: `linear-gradient(90deg, #10b98180, #00d4aa, #34d399)`,
                boxShadow: '0 0 10px rgba(0, 212, 170, 0.5)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold text-text-primary drop-shadow-md">
              {Math.round(fillPct)}%
            </div>
          </div>
          <div className="w-1.5 h-6 rounded-r bg-text-secondary/60 -ml-[1px]" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-bold text-sm text-gradient-accent">{displayCapacity}</span>
          <span className="text-xs text-text-muted">|</span>
          <span className="font-mono text-xs text-text-secondary">{formatNumber(voltage, 2)} V</span>
        </div>
        <div className="text-[11px] text-text-muted mt-1 flex items-center gap-1.5">
          <span>{CELL_LABELS[cellType]}</span>
          <span className="w-1 h-1 rounded-full bg-text-muted/50" />
          <span>{formatWh(convertCapacityToWh(capacity, unit, voltage))} 额定能量</span>
        </div>
      </div>
    </div>
  );
};
