export type EcUnit = 'mS/cm' | 'μS/cm';
export type VolumeUnit = 'L' | 'mL';
export type UserMode = 'farmer' | 'technician';
export type ActionType = 'add_stock' | 'add_water' | 'no_action';
export type WarningType = 'target_lower' | 'stock_insufficient' | 'tank_insufficient' | 'input_invalid';

export interface CalculationInput {
  currentEc: number;
  currentEcUnit: EcUnit;
  targetEc: number;
  targetEcUnit: EcUnit;
  tankVolume: number;
  tankVolumeUnit: VolumeUnit;
  stockEc: number;
  stockEcUnit: EcUnit;
  waterVolume: number;
  waterVolumeUnit: VolumeUnit;
  cropStage: string;
}

export interface Warning {
  type: WarningType;
  message: string;
}

export interface CalculationStep {
  description: string;
  formula: string;
  result: string;
}

export interface CalculationResult {
  stockAmount: number;
  stockAmountUnit: VolumeUnit;
  waterAmount: number;
  waterAmountUnit: VolumeUnit;
  actionType: ActionType;
  warnings: Warning[];
  calculationSteps: CalculationStep[];
  finalEc: number;
  finalEcUnit: EcUnit;
}

export interface HistoryRecord {
  id: string;
  date: string;
  timestamp: number;
  input: CalculationInput;
  result: CalculationResult;
  notes?: string;
}

export interface CropStageReference {
  stage: string;
  ecRange: [number, number];
  description: string;
}
