export type VolumeUnit = 'ton' | 'cubicMeter' | 'liter';
export type FlowUnit = 'lpm' | 'lph' | 'tph' | 'cmh';

export interface InputParams {
  tankCapacity: number;
  tankCapacityUnit: VolumeUnit;

  currentWaterLevel: number;
  currentLevelType: 'percent' | 'volume';
  currentLevelUnit: VolumeUnit;

  targetWaterLevel: number;
  targetLevelType: 'percent' | 'volume';
  targetLevelUnit: VolumeUnit;

  pumpFlowRate: number;
  pumpFlowUnit: FlowUnit;

  pipeLoss: number;
  pipeLossType: 'ratio' | 'percent';

  concurrentUsage: number;
  concurrentUsageUnit: FlowUnit;

  morningPeakTime: string;
}

export interface CalculationWarnings {
  levelExceeded: boolean;
  zeroFlow: boolean;
  excessiveUsage: boolean;
  flowRateZero: boolean;
  messages: string[];
}

export interface CalculationResult {
  tankCapacityLiters: number;
  currentLiters: number;
  targetLiters: number;
  requiredLiters: number;

  nominalFlowLpm: number;
  pipeLossAmount: number;
  pipeLossRatio: number;
  concurrentUsageLpm: number;
  netFlowLpm: number;

  fillMinutesExact: number;
  fillMinutesRounded: number;
  fillDurationDisplay: string;

  latestStartTime: Date;
  latestStartDisplay: string;
  latestStartPeriod: string;

  conservativeBufferPct: number;
  conservativeMinutes: number;
  conservativeStartTime: Date;
  conservativeStartDisplay: string;
  conservativeStartPeriod: string;

  warnings: CalculationWarnings;
  hasBlockingError: boolean;
}

export interface FillHistoryRecord {
  id: string;
  createdAt: number;
  paramsSnapshot: InputParams;
  estimatedResult: {
    requiredLiters: number;
    fillMinutesExact: number;
    netFlowLpm: number;
    latestStartDisplay: string;
  };

  actualStartTime: number | null;
  actualStopTime: number | null;
  actualFillMinutes: number | null;

  actualStopLevel: number | null;
  actualStopLevelType: 'percent' | 'volume' | null;
  actualStopLevelUnit: VolumeUnit | null;

  actualFlowLpm: number | null;
  estimateAccuracyPct: number | null;

  notes: string;
  engineerName: string;
  status: 'running' | 'completed' | 'cancelled';
}

export type ViewMode = 'engineer' | 'supervisor';

export const VOLUME_UNIT_LABELS: Record<VolumeUnit, string> = {
  ton: '吨 (t)',
  cubicMeter: '立方米 (m³)',
  liter: '升 (L)',
};

export const FLOW_UNIT_LABELS: Record<FlowUnit, string> = {
  lpm: '升/分钟 (L/min)',
  lph: '升/小时 (L/h)',
  tph: '吨/小时 (t/h)',
  cmh: '立方米/时 (m³/h)',
};
