export interface User {
  id: string;
  name: string;
  employeeId: string;
  role: 'admin' | 'supervisor';
}

export interface Chemical {
  id: string;
  name: string;
  type: 'tablet' | 'liquid';
  defaultConcentration: number;
  defaultUnit: 'percent' | 'mgL' | 'ppm';
}

export type ChlorineUnit = 'mgL' | 'ppm';
export type ConcentrationUnit = 'percent' | 'mgL' | 'ppm';
export type DosingMethod = 'direct' | 'diluted' | 'feeder';
export type DoseUnit = 'g' | 'kg' | 'mL' | 'L';

export interface CalculationParams {
  poolVolume: number | null;
  currentChlorine: number | null;
  targetChlorine: number | null;
  chlorineUnit: ChlorineUnit;
  ph: number | null;
  chemicalId: string;
  chemicalConcentration: number | null;
  concentrationUnit: ConcentrationUnit;
  dosingMethod: DosingMethod;
}

export interface Warning {
  type: 'danger' | 'warning' | 'info';
  message: string;
  code: string;
}

export interface CalculationStep {
  stepOrder: number;
  description: string;
  formula: string;
  result: string;
}

export interface CalculationResult {
  dose: number;
  doseUnit: DoseUnit;
  steps: CalculationStep[];
  warnings: Warning[];
  hasBoundaryViolation: boolean;
  violationReason?: string;
}

export interface ShiftRecord {
  id: string;
  calculatorId: string;
  calculatorName: string;
  operatorId: string;
  operatorName: string;
  createdAt: string;
  poolVolume: number | null;
  currentChlorine: number | null;
  targetChlorine: number | null;
  chlorineUnit: ChlorineUnit;
  ph: number | null;
  chemicalId: string;
  chemicalName: string;
  chemicalConcentration: number | null;
  concentrationUnit: ConcentrationUnit;
  dosingMethod: DosingMethod;
  calculatedDose: number;
  doseUnit: DoseUnit;
  warnings: Warning[];
  hasBoundaryViolation: boolean;
  violationReason?: string;
  postChlorine: number | null;
  postPh: number | null;
  notes: string;
  isPrinted: boolean;
  steps: CalculationStep[];
}
