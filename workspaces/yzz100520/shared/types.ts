export interface Building {
  id: number;
  code: string;
  name: string;
  meterCode: string;
  totalRooms: number;
  floors: number;
  createdAt: string;
}

export type WaterPeriod = 'day' | 'night';

export interface WaterReading {
  id: number;
  buildingId: number;
  readingDate: string;
  period: WaterPeriod;
  reading: number;
  consumption: number;
  isMeterChange?: boolean;
  isReversed?: boolean;
  createdAt: string;
}

export interface Occupancy {
  id: number;
  buildingId: number;
  date: string;
  occupiedRooms: number;
  totalPeople: number;
  isVacant: boolean;
}

export type RepairStatus = 'pending' | 'repairing' | 'completed' | 'recheck';

export interface RepairRecord {
  id: number;
  buildingId: number;
  reportDate: string;
  repairDate: string | null;
  repairType: string;
  description: string;
  result: string | null;
  recheckReading: number | null;
  recheckDate: string | null;
  recheckNote: string | null;
  status: RepairStatus;
}

export interface Holiday {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  buildingIds: number[];
}

export type AnomalyLevel = 'normal' | 'warning' | 'severe';

export interface AnomalyPoint {
  date: string;
  period: WaterPeriod;
  consumption: number;
  expectedConsumption: number;
  deviation: number;
  anomalyLevel: AnomalyLevel;
  reason?: string;
}

export interface BuildingAnomalySummary {
  buildingId: number;
  buildingName: string;
  buildingCode: string;
  anomalyLevel: AnomalyLevel;
  nightPeakConsumption: number;
  anomalyDays: number;
  consecutiveAnomalyDays: number;
  lastRepairDate: string | null;
  isOnHoliday: boolean;
}

export interface SuspectedLeakWindow {
  startDate: string;
  endDate: string;
  daysCount: number;
  avgNightConsumption: number;
  probability: 'high' | 'medium' | 'low';
}

export interface BuildingAnomalyDetail extends BuildingAnomalySummary {
  readings: WaterReading[];
  anomalyPoints: AnomalyPoint[];
  repairs: RepairRecord[];
  suspectedLeaks: SuspectedLeakWindow[];
}
