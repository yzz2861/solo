export type AnomalyType = 'heating_too_fast' | 'low_temp_too_long' | 'feeding_no_response';
export type BatchStatus = 'ongoing' | 'completed' | 'tasted';
export type SugarUnit = 'Brix' | '%' | 'brix' | 'percent';
export type ImportFileType = 'temperature' | 'sugar' | 'feeding' | 'auto';
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'primary';
export type InflectionPointType = 'peak' | 'valley' | 'sudden_rise' | 'sudden_drop' | 'sudden_change';

export interface TemperatureLog {
  id: string;
  timestamp: Date;
  temperature: number;
  isBadRow: boolean;
  rawValue: string;
  tankNo?: string;
}

export interface SugarReading {
  id: string;
  timestamp: Date;
  brix: number;
  originalUnit: SugarUnit;
  originalValue: string;
  isBadRow: boolean;
  rawValue: string;
  tankNo?: string;
}

export interface FeedingRecord {
  id: string;
  timestamp: Date;
  type: string;
  feedType: string;
  amount: number;
  unit: string;
  notes?: string;
  isBadRow: boolean;
  rawValue: string;
  tankNo?: string;
}

export interface AnomalySegment {
  id: string;
  type: AnomalyType;
  startTime: Date;
  endTime: Date;
  severity: number;
  description: string;
  reviewed: boolean;
}

export interface TastingNote {
  id: string;
  conclusion: string;
  treatment: string;
  score: number;
  createdAt: Date;
  author: string;
}

export interface CurveFeature {
  avgTemp: number;
  tempTrend: number;
  sugarDropRate: number;
  featureVector: number[];
}

export interface InflectionPoint {
  timestamp: Date;
  value: number;
  valueType: 'temperature' | 'sugar';
  type: InflectionPointType;
  description: string;
}

export interface FermentationBatch {
  id: string;
  tankNo: string;
  batchNo: string;
  startTime: Date;
  endTime?: Date;
  status: BatchStatus;
  riskLevel: number;
  temperatureLogs: TemperatureLog[];
  sugarReadings: SugarReading[];
  feedingRecords: FeedingRecord[];
  anomalies: AnomalySegment[];
  tastingNote?: TastingNote;
  curveFeatures?: CurveFeature;
  inflectionPoints?: InflectionPoint[];
  badRows?: BadRowInfo[];
}

export interface SimilarBatchResult {
  batchId: string;
  similarity: number;
}

export interface BadRowInfo {
  type: string;
  row: number;
  reason: string;
  rawData: string;
  source?: string;
  lineNumber?: number;
  error?: string;
}

export interface ImportPreview {
  temperatureLogs: TemperatureLog[];
  sugarReadings: SugarReading[];
  feedingRecords: FeedingRecord[];
  badRows: BadRowInfo[];
  previewBatches: FermentationBatch[];
}

export interface AnomalyConfig {
  heatingThreshold: number;
  heatingWindowHours: number;
  lowTempThreshold: number;
  lowTempDurationHours: number;
  feedingResponseHours: number;
  feedingMinChange: number;
}

export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  heatingThreshold: 2,
  heatingWindowHours: 1,
  lowTempThreshold: 25,
  lowTempDurationHours: 4,
  feedingResponseHours: 2,
  feedingMinChange: 0.5,
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  heating_too_fast: '升温太快',
  low_temp_too_long: '低温拖太久',
  feeding_no_response: '补料无响应',
};

export const ANOMALY_TYPE_COLORS: Record<AnomalyType, string> = {
  heating_too_fast: '#E53935',
  low_temp_too_long: '#1E88E5',
  feeding_no_response: '#FB8C00',
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  ongoing: '发酵中',
  completed: '已完成',
  tasted: '已品评',
};

export interface DataPoint {
  timestamp: number;
  value: number;
  type: 'temperature' | 'sugar';
}
