export interface PublicToilet {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  level: '一类' | '二类' | '三类';
  isOnline: boolean;
  lastReportTime?: string;
  createdAt: string;
}

export interface InspectionRecord {
  id: string;
  toiletId: string;
  inspectTime: string;
  inspector: string;
  status: '正常' | '异常' | '待整改';
  remark?: string;
}

export interface CleaningRecord {
  id: string;
  toiletId: string;
  checkinTime: string;
  cleaner: string;
  checkType: '普扫' | '循环保洁' | '深度保洁';
}

export interface PassengerFlow {
  id: string;
  toiletId: string;
  flowDate: string;
  hour: number;
  count: number;
  source: '客流计' | '估算';
}

export interface Complaint {
  id: string;
  toiletId: string;
  complaintTime: string;
  type: '异味' | '脏乱' | '设施损坏' | '其他';
  description: string;
  status: '待处理' | '处理中' | '已解决';
  isDuplicate: boolean;
}

export interface Alias {
  id: string;
  toiletId: string;
  aliasName: string;
  source: string;
}

export interface WeatherRecord {
  date: string;
  weatherType: '晴' | '多云' | '阴' | '小雨' | '中雨' | '大雨' | '雪';
  temperature: number;
  windLevel: string;
}

export interface Activity {
  id: string;
  activityDate: string;
  name: string;
  location: string;
  scale: '小型' | '中型' | '大型';
}

export type AnomalyType =
  | 'high_flow_low_clean'
  | 'high_complaint_normal_inspection'
  | 'missing_checkin'
  | 'device_offline';

export interface HeatmapPoint {
  toiletId: string;
  toiletName: string;
  latitude: number;
  longitude: number;
  timeSlot: string;
  heatLevel: 1 | 2 | 3 | 4 | 5;
  passengerCount: number;
  cleaningCount: number;
  complaintCount: number;
  inspectionCount: number;
  anomalies: AnomalyType[];
}

export interface DailyStats {
  date: string;
  totalPassengers: number;
  totalCleanings: number;
  totalComplaints: number;
  totalInspections: number;
  offlineDevices: number;
  anomalyCount: number;
}

export interface AnomalyDetail {
  type: AnomalyType;
  toiletId: string;
  toiletName: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  data?: Record<string, unknown>;
}

export interface ThresholdConfig {
  minCleaningPerHour: number;
  highComplaintThreshold: number;
  missingCheckinDays: number;
  deviceOfflineHours: number;
  heatLevelWeights: {
    passenger: number;
    cleaning: number;
    complaint: number;
  };
}

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  totalToilets: number;
  totalInspections: number;
  totalCleanings: number;
  totalComplaints: number;
  avgPassengerFlow: number;
  complaintResolutionRate: number;
  offlineRate: number;
  anomalyToilets: string[];
  dailyStats: DailyStats[];
  topComplaintToilets: { name: string; count: number }[];
  topFlowToilets: { name: string; count: number }[];
}

export type DataCategory = 'inspection' | 'cleaning' | 'passenger' | 'complaint';

export interface TimeRange {
  start: string;
  end: string;
}
