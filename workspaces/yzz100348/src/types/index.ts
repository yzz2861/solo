export type DoseUnit = 'mg/kg/min' | 'μg/kg/h' | 'mg/h' | 'μg/h' | 'mg' | 'μg' | 'g';
export type ConcentrationUnit = 'mg/mL' | 'μg/mL' | 'g/mL' | 'mg/50mL' | 'mg/100mL' | 'mg/250mL' | 'mg/500mL';
export type WeightUnit = 'kg';
export type TimeUnit = 'min' | 'h';
export type VolumeUnit = 'mL';

export type WarningLevel = 'error' | 'warning';

export interface CalculationWarning {
  level: WarningLevel;
  message: string;
}

export interface CalculationStep {
  label: string;
  formula: string;
  result: string;
}

export interface CalculationInput {
  drugName: string;
  doseValue: number;
  doseUnit: DoseUnit;
  concentration: number;
  concentrationUnit: ConcentrationUnit;
  totalVolume: number;
  volumeUnit: VolumeUnit;
  weight: number;
  weightUnit: WeightUnit;
  plannedTime: number;
  timeUnit: TimeUnit;
}

export interface CalculationResult {
  pumpRateMlPerH: number | null;
  weightDoseMgKgMin: number | null;
  weightDoseUgKgH: number | null;
  steps: CalculationStep[];
  warnings: CalculationWarning[];
}

export interface CalculationRecord {
  id: string;
  input: CalculationInput;
  result: CalculationResult;
  confirmedBy: string;
  confirmedAt: string;
  createdAt: string;
}
