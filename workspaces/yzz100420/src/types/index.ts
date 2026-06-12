export type TemperatureUnit = 'C' | 'F';

export interface TemperaturePoint {
  timestamp: number;
  temperature: number;
  unit: TemperatureUnit;
  isValid: boolean;
  interpolated?: boolean;
  rate?: number;
}

export interface PlanSegment {
  id: string;
  type: 'heating' | 'holding' | 'cooling';
  startTime: number;
  startTemp: number;
  endTime: number;
  endTemp: number;
  rate?: number;
  tolerance?: number;
  name?: string;
}

export interface FiringPlan {
  id: string;
  name: string;
  unit: TemperatureUnit;
  segments: PlanSegment[];
  description?: string;
}

export type DeviationSeverity = 'low' | 'medium' | 'high';

export interface DeviationPoint {
  timestamp: number;
  timeHours: number;
  actualTemp: number;
  targetTemp: number;
  difference: number;
  percentage: number;
  severity: DeviationSeverity;
}

export type SegmentType = 'heating' | 'holding' | 'cooling';

export interface FiringSegment {
  id: string;
  type: SegmentType;
  index: number;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  startTemp: number;
  endTemp: number;
  durationHours: number;
  tempChange: number;
  rate: number;
  targetRate?: number;
  deviations: DeviationPoint[];
  maxDeviationValue: number;
  maxDeviationTime: number;
  avgDeviation: number;
  grade?: 'A' | 'B' | 'C' | 'D';
}

export type EventType = 'log_gap' | 'overnight' | 'lid_open' | 'manual_adjust' | 'power_loss' | 'other';

export interface SpecialEvent {
  id: string;
  timestamp: number;
  timeHours: number;
  type: EventType;
  title: string;
  description: string;
  durationMinutes?: number;
  params?: Record<string, any>;
}

export interface GlazeRecipe {
  id: string;
  name: string;
  ingredients: { name: string; percentage: number }[];
  firingTemp: number;
  notes: string;
}

export type ColorDeviation = 'excellent' | 'good' | 'slight' | 'significant' | 'failed';

export interface StudentWork {
  id: string;
  studentName: string;
  workName: string;
  glaze: GlazeRecipe;
  expectedColor: string;
  actualColor: string;
  colorDeviation: ColorDeviation;
  notes: string;
  relatedSegmentIds: string[];
  relatedEventIds: string[];
  impactExplanation: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  shelfPosition?: string;
}

export interface WorkBatch {
  id: string;
  name: string;
  shelfPosition: string;
  works: StudentWork[];
}

export interface FiringRecord {
  id: string;
  name: string;
  startAt: number;
  endAt: number;
  durationHours: number;
  unit: TemperatureUnit;
  logPoints: TemperaturePoint[];
  targetPoints?: { timeHours: number; temperature: number }[];
  plan: FiringPlan;
  segments: FiringSegment[];
  events: SpecialEvent[];
  batches: WorkBatch[];
  maxDeviation: DeviationPoint[];
  overallGrade: 'A' | 'B' | 'C' | 'D';
  summary: {
    avgHeatingRate: number;
    totalHoldingHours: number;
    avgCoolingRate: number;
    peakTemp: number;
    peakTime: number;
    avgDeviation: number;
    maxDeviation: number;
    deviationPeriods: number;
    overnight: boolean;
    logGaps: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface PlainSummary {
  id: string;
  recordId: string;
  goodPoints: { icon: string; title: string; detail: string }[];
  warnPoints: { icon: string; title: string; detail: string }[];
  suggestions: { icon: string; title: string; detail: string }[];
  segmentReviews: {
    segmentId: string;
    segmentName: string;
    type: SegmentType;
    grade: string;
    title: string;
    analogy: string;
    keyMetrics: string;
  }[];
}
