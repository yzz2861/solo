export type PrecipType = 'none' | 'drizzle' | 'rain' | 'sleet' | 'snow' | 'freezing_rain';

export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger';

export type TempUnit = 'C' | 'F';

export type WindUnit = 'm/s' | 'km/h' | 'mph';

export interface BridgePoint {
  id: string;
  name: string;
  code?: string;
  district?: string;
}

export interface RiskInput {
  bridgeId: string;
  bridgeName: string;
  airTemp: number;
  airTempUnit: TempUnit;
  roadTemp?: number | null;
  roadTempUnit?: TempUnit;
  roadTempMissing?: boolean;
  humidity: number;
  windSpeed: number;
  windUnit: WindUnit;
  precipitation: PrecipType;
  saltAmount: number;
  lastSaltHours?: number;
}

export interface FactorItem {
  name: string;
  weight: number;
  contribution: number;
  highlight: boolean;
  value?: string;
}

export interface WarningItem {
  type: 'info' | 'warning' | 'danger';
  code: string;
  message: string;
  suggestion?: string;
}

export interface CalcTrace {
  formulaVersion: string;
  normalizedParams: Record<string, number>;
  intermediateScores: Record<string, number>;
  thresholdsUsed: Record<string, unknown>;
  saltCorrectionApplied: boolean;
  missingDataFallback: string | null;
}

export interface RiskResult {
  level: RiskLevel;
  score: number;
  reviewMinutes: number;
  urgent: boolean;
  keyFactors: FactorItem[];
  warnings: WarningItem[];
  calcTrace: CalcTrace;
  timestamp: number;
}

export interface SaltRecord {
  id: string;
  vehiclePlate: string;
  bridgeId: string;
  bridgeName: string;
  startTime: string;
  endTime: string;
  saltKg: number;
  saltPerSqm: number;
  airTempAtSite: number;
  operator: string;
  weatherNote?: string;
  photos?: string[];
  createdAt: number;
}

export type DispatchStatus = 'pending' | 'dispatched' | 'completed';

export interface DispatchItem {
  id: string;
  bridgeId: string;
  bridgeName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  priority: number;
  assignedVehicle?: string;
  status: DispatchStatus;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BatchRow {
  id: string;
  selected: boolean;
  bridgeName: string;
  airTemp: number | null;
  roadTemp: number | null;
  humidity: number | null;
  windSpeed: number | null;
  precipitation: PrecipType;
  saltAmount: number | null;
  riskResult?: RiskResult;
}

export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  status: 'available' | 'working' | 'maintenance';
}
