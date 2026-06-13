export interface Bridge {
  id: string;
  name: string;
  location: string;
}

export interface Crack {
  id: string;
  bridgeId: string;
  code: string;
  location: string;
  description: string;
}

export interface CrackAlias {
  id: string;
  crackId: string;
  oldCode: string;
  newCode: string;
  changeDate: string;
}

export type AnomalyType = 
  | 'unit_conversion' 
  | 'temp_diff' 
  | 'tool_change' 
  | 'surveyor_change' 
  | 'angle_change'
  | 'width_fluctuation';

export interface AnomalyNote {
  id: string;
  type: AnomalyType;
  description: string;
}

export interface Measurement {
  id: string;
  crackId: string;
  measureDate: string;
  widthRaw: number;
  widthUnit: 'mm' | 'cm';
  widthMm: number;
  temperature: number;
  photoId: string;
  photoAngle: string;
  surveyor: string;
  rechecker: string;
  tool: string;
  notes: string;
  anomalies: AnomalyNote[];
}

export type RiskLevel = 'normal' | 'warning' | 'danger';

export interface AnalysisResult {
  crackId: string;
  crackCode: string;
  bridgeName: string;
  bridgeId: string;
  location: string;
  growthRate: number;
  rSquared: number;
  currentWidth: number;
  predictedWidth: number;
  firstMeasureDate: string;
  lastMeasureDate: string;
  measureCount: number;
  riskLevel: RiskLevel;
  warnings: string[];
  measurements: Measurement[];
}

export interface ThresholdConfig {
  warningRate: number;
  dangerRate: number;
  warningWidth: number;
  dangerWidth: number;
  tempDiffThreshold: number;
  widthFluctuation: number;
}

export interface MeasurementFormData {
  bridgeId: string;
  crackId: string;
  measureDate: string;
  widthInput: string;
  temperature: number;
  photoId: string;
  photoAngle: string;
  surveyor: string;
  rechecker: string;
  tool: string;
  notes: string;
}

export interface ChartDataPoint {
  date: string;
  width: number;
  temperature: number;
  trend?: number;
  warningThreshold?: number;
  dangerThreshold?: number;
}

export const DEFAULT_THRESHOLD: ThresholdConfig = {
  warningRate: 0.1,
  dangerRate: 0.3,
  warningWidth: 1.5,
  dangerWidth: 3.0,
  tempDiffThreshold: 15,
  widthFluctuation: 0.2,
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  unit_conversion: '单位换算',
  temp_diff: '温度差异',
  tool_change: '工具变更',
  surveyor_change: '测量人变更',
  angle_change: '角度变更',
  width_fluctuation: '宽度波动',
};

export const ANOMALY_TYPE_COLORS: Record<AnomalyType, string> = {
  unit_conversion: 'badge-neutral',
  temp_diff: 'badge-warning',
  tool_change: 'badge-neutral',
  surveyor_change: 'badge-neutral',
  angle_change: 'badge-neutral',
  width_fluctuation: 'badge-warning',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  normal: '正常',
  warning: '需复查',
  danger: '需封控',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  normal: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
};
