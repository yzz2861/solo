import { RiskLevel } from './rule';

export enum ObjectStatus {
  NORMAL = 'normal',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  ARREARS = 'arrears',
  MATERIAL_INCOMPLETE = 'material_incomplete'
}

export enum QualificationStatus {
  QUALIFIED = 'qualified',
  NOT_QUALIFIED = 'not_qualified',
  PENDING_REVIEW = 'pending_review',
  UNDETERMINED = 'undetermined'
}

export interface StatusSnapshot {
  id: string;
  objectId: string;
  businessId: string;
  statuses: ObjectStatus[];
  materialChecklist: {
    [key: string]: boolean;
  };
  riskScore: number;
  riskLevel: RiskLevel;
  timeWindow: {
    start: Date;
    end: Date;
  };
  properties: {
    [key: string]: any;
  };
  createdAt: Date;
}
