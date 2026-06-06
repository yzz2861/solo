export enum HistoricalStatusType {
  SUBMITTED = 'submitted',
  PASSED = 'passed',
  REJECTED = 'rejected',
  REVIEW_REQUIRED = 'review_required',
  REVIEW_PASSED = 'review_passed',
  REVIEW_REJECTED = 'review_rejected',
  CANCELLED = 'cancelled',
}

export interface HistoricalStatusRecord {
  id: string;
  applicationId: string;
  status: HistoricalStatusType;
  operatorId: string;
  operatorName: string;
  operateTime: string;
  remark?: string;
  riskTags?: string[];
}

export interface ApplicationHistory {
  applicationId: string;
  records: HistoricalStatusRecord[];
  currentStatus: HistoricalStatusType;
  reviewCount: number;
  rejectCount: number;
  hasHighRiskHistory: boolean;
}
