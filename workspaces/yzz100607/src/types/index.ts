export type LengthUnit = 'mm' | 'cm' | 'm';
export type RainfallUnit = 'mm/min' | 'mm/h';
export type RiskLevel = 'safe' | 'warning' | 'danger';
export type SlopeStatus = 'excellent' | 'good' | 'poor' | 'zero';
export type WarningType = 'slope' | 'rainfall' | 'drain' | 'unit';
export type WarningLevel = 'info' | 'warning' | 'danger';

export interface DrainPosition {
  x: number;
  y: number;
}

export interface DrainageInput {
  length: number;
  lengthUnit: LengthUnit;
  width: number;
  widthUnit: LengthUnit;
  slope: number;
  rainfallIntensity: number;
  rainfallUnit: RainfallUnit;
  drainCount: number;
  drainDiameter: number;
  drainBlocked: boolean;
  drainPositions: DrainPosition[];
}

export interface Warning {
  type: WarningType;
  level: WarningLevel;
  message: string;
}

export interface DrainageResult {
  rainwaterVolume: number;
  drainCapacity: number;
 积水系数: number;
  riskLevel: RiskLevel;
  slopeStatus: SlopeStatus;
  warnings: Warning[];
  areaM2: number;
  rainfallMmMin: number;
  singleDrainCapacity: number;
}

export interface CalculationRecord extends DrainageInput {
  id: string;
  result: DrainageResult;
  contractorReport: string;
  ownerReport: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  projectName?: string;
}

export interface AdjustmentSuggestion {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  details: string;
}

export interface ContractorReportData {
  calculationSteps: CalculationStep[];
  suggestions: AdjustmentSuggestion[];
  summary: string;
}

export interface CalculationStep {
  step: number;
  title: string;
  formula: string;
  values: string;
  result: string;
}

export interface OwnerReportData {
  riskLevel: RiskLevel;
  riskDescription: string;
  summary: string;
  recordId: string;
  timestamp: string;
}

export interface DisclosureFormData {
  recordId: string;
  projectName: string;
  rainfallIntensity: number;
  rainfallUnit: RainfallUnit;
  drainDiameter: number;
  slope: number;
  length: number;
  lengthUnit: LengthUnit;
  width: number;
  widthUnit: LengthUnit;
  drainCount: number;
  result: DrainageResult;
  createdAt: string;
}
