import { BatterySpec, CorrectionFactors, LoadPhase, PhaseNameType, CellType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const CELL_VOLTAGES: Record<CellType, number> = {
  'LiPo': 3.7,
  'Li-ion': 3.7,
  'LiFePO4': 3.2,
  'NiMH': 1.2,
};

export const CELL_TEMP_COEFFICIENTS: Record<CellType, number> = {
  'LiPo': -2.0,
  'Li-ion': -2.0,
  'LiFePO4': -1.5,
  'NiMH': -0.8,
};

export const CELL_LABELS: Record<CellType, string> = {
  'LiPo': '锂聚合物 (LiPo)',
  'Li-ion': '锂离子 (Li-ion)',
  'LiFePO4': '磷酸铁锂 (LiFePO4)',
  'NiMH': '镍氢 (NiMH)',
};

export const PHASE_LABELS: Record<PhaseNameType, string> = {
  standby: '待机',
  sampling: '采样',
  wireless: '无线发送',
  charging: '充电',
  custom: '自定义',
};

export const PHASE_COLORS: Record<PhaseNameType, string> = {
  standby: '#60a5fa',
  sampling: '#34d399',
  wireless: '#fbbf24',
  charging: '#a78bfa',
  custom: '#f472b6',
};

export const PHASE_ICONS: Record<PhaseNameType, string> = {
  standby: '💤',
  sampling: '📊',
  wireless: '📡',
  charging: '⚡',
  custom: '⚙️',
};

export const TEMPERATURE_PRESETS: Array<{ label: string; value: number }> = [
  { label: '极寒 (-40℃)', value: -40 },
  { label: '严寒 (-20℃)', value: -20 },
  { label: '寒冷 (0℃)', value: 0 },
  { label: '常温 (25℃)', value: 25 },
  { label: '温热 (45℃)', value: 45 },
  { label: '高温 (60℃)', value: 60 },
];

export const DEFAULT_BATTERY: BatterySpec = {
  capacity: 5000,
  capacityUnit: 'mAh',
  nominalVoltage: 3.7,
  seriesCount: 1,
  cellType: 'LiPo',
};

export const DEFAULT_CORRECTIONS: CorrectionFactors = {
  conversionEfficiency: 85,
  ambientTemperature: 25,
  temperatureCoefficient: -2.0,
  agingFactor: 0.95,
  selfDischarge: 2,
  designMargin: 10,
};

export function createDefaultPhase(name: PhaseNameType = 'standby'): LoadPhase {
  const templates: Record<PhaseNameType, Partial<LoadPhase>> = {
    standby: {
      power: 5,
      powerUnit: 'mW',
      duration: 10,
      durationUnit: 's',
      dutyCycle: 95,
      worstCaseMultiplier: 1.2,
      worstCaseDurationMultiplier: 1.0,
    },
    sampling: {
      power: 150,
      powerUnit: 'mW',
      duration: 500,
      durationUnit: 'ms',
      dutyCycle: 4,
      worstCaseMultiplier: 1.3,
      worstCaseDurationMultiplier: 1.2,
    },
    wireless: {
      power: 800,
      powerUnit: 'mW',
      duration: 200,
      durationUnit: 'ms',
      dutyCycle: 1,
      worstCaseMultiplier: 1.5,
      worstCaseDurationMultiplier: 1.3,
    },
    charging: {
      power: 2,
      powerUnit: 'W',
      duration: 2,
      durationUnit: 'h',
      dutyCycle: 0,
      worstCaseMultiplier: 1.1,
      worstCaseDurationMultiplier: 1.0,
    },
    custom: {
      power: 100,
      powerUnit: 'mW',
      duration: 1,
      durationUnit: 's',
      dutyCycle: 50,
      worstCaseMultiplier: 1.5,
      worstCaseDurationMultiplier: 1.2,
    },
  };

  return {
    id: uuidv4(),
    name,
    ...templates[name],
  } as LoadPhase;
}

export const DEFAULT_PHASES: LoadPhase[] = [
  createDefaultPhase('standby'),
  createDefaultPhase('sampling'),
  createDefaultPhase('wireless'),
];
