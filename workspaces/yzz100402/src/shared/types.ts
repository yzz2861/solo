export interface Patient {
  id: number;
  name: string;
  phone?: string;
  idCard?: string;
  age?: number;
  gender?: '男' | '女';
  createdAt: string;
}

export interface Department {
  id: number;
  name: string;
  createdAt: string;
}

export interface Doctor {
  id: number;
  name: string;
  departmentId: number;
  title?: string;
  isActive: number;
  createdAt: string;
}

export type QueueStatus = 'waiting' | 'calling' | 'called' | 'passed' | 'recovered' | 'cancelled';

export interface QueueItem {
  id: number;
  queueNumber: string;
  patientId: number;
  departmentId: number;
  doctorId: number;
  isUrgent: number;
  urgentReason?: string;
  isFollowUp: number;
  followUpNote?: string;
  status: QueueStatus;
  checkInTime: string;
  calledTime?: string;
  calledCount: number;
  recoverPosition?: number;
  createdAt: string;
}

export interface CallRecord {
  id: number;
  queueId: number;
  action: 'call' | 'pass' | 'recover' | 'cancel' | 'recall' | 'change_doctor';
  fromDoctorId?: number;
  toDoctorId?: number;
  createdAt: string;
  note?: string;
}

export interface AppState {
  isPaused: number;
  lunchBreakExportPath?: string;
  updatedAt: string;
}

export interface WaitingExportRow {
  queueNumber: string;
  patientName: string;
  departmentName: string;
  doctorName: string;
  isUrgent: number;
  isFollowUp: number;
  checkInTime: string;
  waitMinutes: number;
}

export interface DailyStat {
  date: string;
  totalCount: number;
  avgWaitMinutes: number;
  maxWaitMinutes: number;
  passedCount: number;
  cancelledCount: number;
  urgentCount: number;
  recallCount: number;
  changeDoctorCount: number;
}

export interface QueueDetail {
  queue: QueueItem;
  patient: Patient;
  department: Department;
  doctor: Doctor;
}
