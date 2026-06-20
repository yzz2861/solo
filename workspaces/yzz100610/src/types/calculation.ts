export type CompressionUnit = 'kgf' | 'N' | 'kg';

export type PalletType = 'wood' | 'plastic' | 'paper' | 'none';

export type HumidityCondition = 'dry' | 'normal' | 'humid' | 'high';

export type SafetyLevel = 'excellent' | 'good' | 'pass' | 'critical' | 'fail';

export type ViewMode = 'procurement' | 'warehouse';

export interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
  code: string;
}

export interface CalculationInput {
  boxWeight: number;
  boxCompression: number;
  compressionUnit: CompressionUnit;
  stackLayers: number;
  palletType: PalletType;
  humidityCondition: HumidityCondition;
  transportDays: number;
  routeName?: string;
  routeNotes?: string;
}

export interface CalculationResult {
  safetyFactor: number;
  safetyLevel: SafetyLevel;
  bottomLoad: number;
  bottomLoadRatio: number;
  effectiveCompression: number;
  maxSafeLayers: number;
  maxSafeLayersMin: number;
  warnings: Warning[];
  suggestions: string[];
  humidityFactor: number;
  palletFactor: number;
  transportFactor: number;
}

export const PALLET_FACTORS: Record<PalletType, number> = {
  wood: 1.0,
  plastic: 0.95,
  paper: 0.85,
  none: 0.8,
};

export const HUMIDITY_FACTORS: Record<HumidityCondition, number> = {
  dry: 1.0,
  normal: 0.85,
  humid: 0.7,
  high: 0.55,
};

export const HUMIDITY_LABELS: Record<HumidityCondition, string> = {
  dry: '干燥 (<60%RH)',
  normal: '正常 (60-75%RH)',
  humid: '潮湿 (75-85%RH)',
  high: '高湿 (>85%RH)',
};

export const PALLET_LABELS: Record<PalletType, string> = {
  wood: '木托盘 (满铺)',
  plastic: '塑料托盘',
  paper: '纸托盘',
  none: '直接堆码 (无托盘)',
};

export const SAFETY_LEVEL_LABELS: Record<SafetyLevel, string> = {
  excellent: '优秀',
  good: '良好',
  pass: '合格',
  critical: '临界',
  fail: '不合格',
};

export const SAFETY_LEVEL_COLORS: Record<SafetyLevel, string> = {
  excellent: 'text-emerald-600',
  good: 'text-green-600',
  pass: 'text-amber-500',
  critical: 'text-orange-500',
  fail: 'text-red-600',
};

export const SAFETY_LEVEL_BG_COLORS: Record<SafetyLevel, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-green-500',
  pass: 'bg-amber-500',
  critical: 'bg-orange-500',
  fail: 'bg-red-500',
};

export const SAFETY_THRESHOLDS = {
  excellent: 3.0,
  good: 2.5,
  pass: 2.0,
  critical: 1.5,
};

export const MAX_RECOMMENDED_LAYERS = 8;
