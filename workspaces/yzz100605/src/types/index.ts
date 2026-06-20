export type ConcentrationUnit = 'mM' | 'mol/L';
export type VolumeUnit = 'mL' | 'L';

export interface BufferInput {
  acidName: string;
  baseName: string;
  pKa: number;
  acidConcentration: number;
  acidConcentrationUnit: ConcentrationUnit;
  baseConcentration: number;
  baseConcentrationUnit: ConcentrationUnit;
  targetPH: number;
  targetVolume: number;
  targetVolumeUnit: VolumeUnit;
}

export interface CalculationStep {
  step: number;
  title: string;
  formula: string;
  substitution: string;
  result: string;
}

export interface ValidationMessage {
  level: 'info' | 'warning' | 'error';
  rule: string;
  message: string;
  suggestion: string;
}

export interface BufferResult {
  ratio: number;
  acidVolume_mL: number;
  baseVolume_mL: number;
  waterVolume_mL: number;
  totalVolume_mL: number;
  finalAcidConc_molL: number;
  finalBaseConc_molL: number;
  bufferCapacity: number;
  warnings: ValidationMessage[];
  steps: CalculationStep[];
}
