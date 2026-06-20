export interface DryingParams {
  materialName: string;
  weight: number;
  initialMoisture: number;
  targetMoisture: number;
  temperature: number;
  airFlow: number;
  ambientHumidity: number;
}

export interface DryingResult {
  waterToRemove: number;
  estimatedTime: number;
  energyConsumption: number;
  hourlyDehumidification: number;
  dryMatterWeight: number;
  finalWeight: number;
}

export interface ValidationWarning {
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
}

export interface DryingRecord {
  id: string;
  date: string;
  params: DryingParams;
  result: DryingResult;
  actualMoisture: number;
  actualTime: number;
  notes: string;
}

export type ReportMode = 'worker' | 'boss';
