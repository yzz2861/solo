import { AnomalyType } from './application-record';

export interface HistoricalStatusRecord {
  recordId: string;
  applicationId: string;
  cardId: string;
  studentId: string;
  previousStatus: string;
  currentStatus: string;
  statusChangeTime: string;
  operator: string;
  changeReason: string;
}

export interface HistoricalAnomaly {
  anomalyId: string;
  cardId: string;
  studentId: string;
  anomalyType: AnomalyType;
  occurTime: string;
  resolutionStatus: 'resolved' | 'unresolved' | 'pending';
  resolutionResult?: string;
  involvedAmount: number;
}

export interface HistoricalData {
  statusHistory: HistoricalStatusRecord[];
  anomalyHistory: HistoricalAnomaly[];
}
