export type EventType = '100m' | '200m';

export type TimingMethod = 'manual' | 'electronic';

export type TrackType = 'synthetic' | 'cinder' | 'dirt' | 'tartan';

export interface SprintRecord {
  id: string;
  date: string;
  event: EventType;
  rawTime: number;
  windSpeed?: number;
  altitude: number;
  temperature: number;
  trackType: TrackType;
  timingMethod: TimingMethod;
  manualError?: number;
  isExcluded?: boolean;
  isOutlier?: boolean;
  note?: string;
  studentName?: string;
}

export interface CorrectionBreakdown {
  wind: number;
  altitude: number;
  temperature: number;
  track: number;
  timing: number;
}

export interface CorrectionResult {
  originalTime: number;
  correctedTime: number;
  totalCorrection: number;
  breakdown: CorrectionBreakdown;
  isComparable: boolean;
  warnings: string[];
  factors: string[];
}

export interface BatchAnalysisResult {
  totalRecords: number;
  validRecords: number;
  excludedRecords: number;
  missingWind: number;
  highErrorManual: number;
  outlierCount: number;
  trend: Array<SprintRecord & { correctedTime: number }>;
  improvement: number;
  improvementPercent: number;
  avgCorrectedTime: number;
  bestCorrectedTime: number;
}

export interface Filters {
  excludeMissingWind: boolean;
  excludeHighError: boolean;
  excludeOutliers: boolean;
  excludeExcluded: boolean;
  eventType: EventType | 'all';
}

export type ReportMode = 'student' | 'coach';

export const TRACK_TYPE_LABELS: Record<TrackType, string> = {
  synthetic: '塑胶跑道',
  cinder: '煤渣跑道',
  dirt: '土跑道',
  tartan: '聚氨酯跑道',
};

export const EVENT_DISTANCES: Record<EventType, number> = {
  '100m': 100,
  '200m': 200,
};

export const TIMING_CORRECTIONS: Record<EventType, number> = {
  '100m': 0.24,
  '200m': 0.14,
};

export const TRACK_FACTORS: Record<TrackType, number> = {
  synthetic: 1.0,
  tartan: 0.99,
  cinder: 1.03,
  dirt: 1.05,
};
