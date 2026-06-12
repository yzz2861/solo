export type TimeSlot = 'breakfast' | 'lunch' | 'dinner' | 'bedtime';

export type MedicationStatus = 
  | 'taken' 
  | 'missed' 
  | 'late' 
  | 'duplicate' 
  | 'supplemented' 
  | 'discontinued' 
  | 'offline' 
  | 'conflict';

export type UserRole = 'nurse' | 'family';

export interface Elderly {
  id: string;
  name: string;
  roomNumber: string;
  floor: number;
  age: number;
  gender: 'male' | 'female';
  avatar?: string;
  familyMembers: string[];
}

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  frequency: 'qd' | 'bid' | 'tid' | 'qid' | 'qn';
  times: string[];
}

export interface Prescription {
  id: string;
  elderlyId: string;
  medicationId: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'discontinued' | 'completed';
  changeReason?: string;
  changeTime?: string;
  doctorName: string;
}

export interface PillboxRecord {
  id: string;
  elderlyId: string;
  medicationId: string;
  timestamp: string;
  deviceId: string;
  deviceStatus: 'online' | 'offline' | 'low_battery';
  isSuccess: boolean;
}

export interface NurseRecord {
  id: string;
  elderlyId: string;
  medicationId: string;
  timestamp: string;
  nurseName: string;
  type: 'supplement' | 'missed' | 'noted';
  note: string;
  publicNote?: string;
}

export interface MedicationAnalysis {
  id: string;
  elderlyId: string;
  medicationId: string;
  date: string;
  timeSlot: TimeSlot;
  status: MedicationStatus;
  plannedTime: string;
  actualTime?: string;
  delayMinutes?: number;
  explanation: string;
  pillboxRecord?: PillboxRecord;
  nurseRecord?: NurseRecord;
  prescription?: Prescription;
  isInternalNote: boolean;
  medicationName?: string;
}

export interface DailyStatistics {
  date: string;
  totalDoses: number;
  taken: number;
  missed: number;
  late: number;
  duplicate: number;
  supplemented: number;
  discontinued: number;
  offline: number;
  conflict: number;
}

export interface FloorStatistics {
  floor: number;
  totalDoses: number;
  missedRate: number;
  offlineRate: number;
  shiftIssues: {
    morning: number;
    afternoon: number;
    night: number;
  };
  deviceIssues: number;
}

export interface ElderlyRisk {
  elderlyId: string;
  name: string;
  floor: number;
  roomNumber: string;
  missedCount: number;
  lateCount: number;
  riskLevel: 'high' | 'medium' | 'low';
  last30DaysRate: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  elderlyIds?: string[];
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export interface ElderlySummary {
  name: string;
  adherenceRate: number;
  thisMonth: {
    total: number;
    normal: number;
    abnormal: number;
  };
  recentRecords: MedicationAnalysis[];
}
