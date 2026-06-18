export type Role = 'operation' | 'customer_service' | 'cleaning' | 'mall_admin';

export type PointStatus = 'active' | 'temporary_removed' | 'maintenance';
export type PointArea = 'mall_entrance' | 'subway_exit' | 'bus_station' | 'office_building' | 'school';

export interface UmbrellaPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  status: PointStatus;
  area: PointArea;
  currentInventory: number;
}

export type RecordStatus = 'borrowing' | 'returned' | 'overdue' | 'lost';

export interface BorrowRecord {
  id: string;
  umbrellaId: string;
  userId: string;
  userPhone: string;
  borrowPointId: string;
  returnPointId: string | null;
  borrowTime: Date;
  returnTime: Date | null;
  status: RecordStatus;
  scanFailCount: number;
  crossPointReturn: boolean;
}

export type RainfallLevel = 'sunny' | 'light' | 'moderate' | 'heavy';

export interface WeatherRecord {
  date: string;
  hour: number;
  rainfallLevel: RainfallLevel;
  rainfallMm: number;
  rainStopTime: Date | null;
  dataMissing: boolean;
}

export type AnomalyType = 'scan_fail' | 'duplicate_borrow' | 'weather_missing' | 'point_removed';

export interface AnomalyEvent {
  id: string;
  recordId: string | null;
  pointId: string | null;
  type: AnomalyType;
  description: string;
  status: 'pending' | 'resolved' | 'waived';
  reportedAt: Date;
}

export interface AnalysisResult {
  shortageIndex: Record<string, number>;
  transferSuggestions: TransferSuggestion[];
  overdueList: OverdueItem[];
  rainStopDelay: RainStopDelayPoint[];
  timeRainMatrix: TimeRainMatrixCell[][];
  anomalies: AnomalyEvent[];
}

export interface TransferSuggestion {
  id: string;
  fromPointId: string;
  toPointId: string;
  quantity: number;
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
}

export interface OverdueItem {
  recordId: string;
  userPhone: string;
  overdueDays: number;
  umbrellaCount: number;
  totalFee: number;
  feeBreakdown: FeeBreakdown;
  hasAnomaly: boolean;
  anomalyType?: AnomalyType;
}

export interface FeeBreakdown {
  freeMinutes: number;
  usedMinutes: number;
  baseFee: number;
  tieredFee: Array<{ range: string; rate: number; minutes: number; amount: number }>;
  crossPointFee: number;
  discount: number;
  formula: string;
}

export interface RainStopDelayPoint {
  hoursAfterRainStop: number;
  returnCount: number;
  overdueRate: number;
  cumulativeReturnRate: number;
}

export interface TimeRainMatrixCell {
  timeSlot: string;
  rainLevel: string;
  shortageRate: number;
  turnoverRate: number;
  sampleSize: number;
}

export interface CleaningTask {
  id: string;
  pointId: string;
  pointName: string;
  currentInventory: number;
  suggestedRefill: number;
  priority: 'high' | 'medium' | 'low';
  estimatedArrival: string;
  area: string;
  completed: boolean;
}

export interface MonthlyReport {
  period: string;
  totalBorrows: number;
  totalReturns: number;
  turnoverRate: number;
  overdueRate: number;
  crossPointRate: number;
  servedUsers: number;
  topPoints: Array<{ name: string; borrows: number; satisfaction: number }>;
  anomalyStats: Record<AnomalyType, number>;
  roiEstimate: { revenue: number; cost: number; profit: number };
}
