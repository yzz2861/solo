export interface PatrolShift {
  id: string;
  date: string;
  shiftName: string;
  robotId: string;
  startTime: string;
  endTime: string;
  trajectoryPoints: TrajectoryPoint[];
  alarms: Alarm[];
}

export interface TrajectoryPoint {
  id: string;
  shiftId: string;
  x: number;
  y: number;
  z: number;
  timestamp: string;
  speed: number;
  signalStrength: number;
}

export interface Alarm {
  id: string;
  shiftId: string;
  alarmCode: string;
  description: string;
  x: number;
  y: number;
  timestamp: string;
  level: 'info' | 'warning' | 'critical';
}

export interface ForbiddenZone {
  id: string;
  name: string;
  type: 'pool' | 'warehouse' | 'restricted' | 'building';
  polygon: { x: number; y: number }[];
  warningDistance: number;
  height: number;
}

export interface Annotation {
  id: string;
  targetId: string;
  targetType: 'alarm' | 'detection' | 'point' | 'checkpoint' | 'zone';
  reason: string;
  note: string;
  createdAt: string;
  createdBy: string;
  x?: number;
  y?: number;
  z?: number;
}

export interface DetectionResult {
  id: string;
  type: 'missing' | 'duplicate' | 'proximity' | 'abnormalStay';
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  pointId?: string;
  zoneId?: string;
  distance?: number;
  duration?: number;
}

export interface Checkpoint {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  required: boolean;
}

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
}

export interface StopEvent {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  x: number;
  y: number;
}

export interface AbnormalStay {
  id: string;
  x: number;
  y: number;
  startTime: string;
  endTime: string;
  duration: number;
  reason?: string;
}

export interface CoverageReport {
  shiftId: string;
  shiftName: string;
  date: string;
  coverageRate: number;
  totalCheckpoints: number;
  coveredCheckpoints: number;
  missedCheckpoints: Checkpoint[];
  heatmapData: HeatmapCell[];
  patrolDuration: number;
  totalDistance: number;
}

export interface StayReport {
  shiftId: string;
  shiftName: string;
  date: string;
  abnormalStays: AbnormalStay[];
  totalStayTime: number;
  avgStayDuration: number;
  maxStayDuration: number;
  stayCount: number;
}

export interface MissedPointsReport {
  shiftId: string;
  shiftName: string;
  date: string;
  missedPoints: Checkpoint[];
  totalMissed: number;
  lastVisitTimes: { [checkpointId: string]: string | null };
}

export interface ShiftDifference {
  type: 'coverage' | 'route' | 'timing' | 'alarms';
  description: string;
  shift1Value: number | string;
  shift2Value: number | string;
  severity: 'low' | 'medium' | 'high';
}

export interface PatternAnalysis {
  consistentCoverage: number;
  frequentMissedPoints: Checkpoint[];
  averageCoverage: number;
  coverageVariance: number;
  isSystemicIssue: boolean;
  recommendations: string[];
}

export interface ComparisonReport {
  shiftIds: string[];
  shiftNames: string[];
  coverageComparison: { shiftId: string; shiftName: string; rate: number }[];
  differences: ShiftDifference[];
  patternAnalysis: PatternAnalysis;
  generatedAt: string;
}

export type SeverityColor = 'success' | 'warning' | 'danger' | 'primary';
