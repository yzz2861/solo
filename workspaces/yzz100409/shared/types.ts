export type CropStage =
  | 'seedling'
  | 'flowering'
  | 'fruit_set'
  | 'fruit_expansion'
  | 'mature'
  | null;

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type RadiationUnit = 'w_m2' | 'lux';
export type WindUnit = 'm_s' | 'km_h';
export type SoilMoistureUnit = 'vol_percent' | 'mbar';
export type IrrigationUnit = 'mm' | 'm3_per_mu';

export interface Unit {
  temperature: TemperatureUnit;
  humidity: 'percent';
  radiation: RadiationUnit;
  wind: WindUnit;
  soilMoisture: SoilMoistureUnit;
  irrigation: IrrigationUnit;
}

export interface SensorInput {
  temperature: number | null;
  temperatureRaw: { value: number; unit: TemperatureUnit } | null;
  humidity: number | null;
  humidityPrevious: number | null;
  radiation: number | null;
  radiationRaw: { value: number; unit: RadiationUnit } | null;
  wind: number | null;
  windRaw: { value: number; unit: WindUnit } | null;
  cropStage: CropStage;
  soilMoisture: number | null;
  soilMoistureRaw: { value: number; unit: SoilMoistureUnit } | null;
  irrigationEfficiency: number;
  irrigationMethod: 'drip' | 'sprinkler' | 'furrow';
}

export type ValidationWarningType =
  | 'missing'
  | 'jump'
  | 'stage_unselected'
  | 'out_of_range';

export interface ValidationWarning {
  type: ValidationWarningType;
  field: keyof SensorInput;
  message: string;
  conservativeFactor: number;
}

export interface IrrigationWindow {
  startHour: number;
  endHour: number;
  reason: string;
  priority: 'primary' | 'secondary';
}

export interface ETResult {
  et0: number;
  kc: number;
  etc: number;
  soilCorrection: number;
  netIrrigation: number;
  grossIrrigation: number;
  grossIrrigationM3Mu: number;
  scheduledWindows: IrrigationWindow[];
  warnings: ValidationWarning[];
  totalConservativeFactor: number;
  calcSteps: CalcStep[];
}

export interface CalcStep {
  label: string;
  formula: string;
  value: string;
}

export interface DailyRecord {
  date: string;
  input: SensorInput;
  result: ETResult;
  actualIrrigation: number | null;
  note: string;
  createdAt: number;
}

export interface WeeklySummary {
  weekStart: string;
  totalSuggested: number;
  totalActual: number;
  deviationPercent: number;
  advice: string;
  dailyRecords: Array<{
    date: string;
    suggested: number;
    actual: number | null;
    diff: number | null;
  }>;
}

export const CROP_STAGE_LABELS: Record<Exclude<CropStage, null>, string> = {
  seedling: '育苗期',
  flowering: '开花期',
  fruit_set: '坐果期',
  fruit_expansion: '膨果期',
  mature: '成熟期',
};

export const CROP_KC_VALUES: Record<Exclude<CropStage, null>, number> = {
  seedling: 0.5,
  flowering: 0.75,
  fruit_set: 0.9,
  fruit_expansion: 1.12,
  mature: 0.8,
};
