import { RiskLevel } from './rule';
import { QualificationStatus } from './status';

export enum ActionType {
  SUBMIT = 'submit',
  REVIEW = 'review',
  APPROVE = 'approve',
  REJECT = 'reject',
  RECHECK = 'recheck',
  CANCEL = 'cancel',
  AUTO_JUDGE = 'auto_judge'
}

export enum AuditResult {
  PASS = 'pass',
  FAIL = 'fail',
  REVIEW_REQUIRED = 'review_required',
  UNDETERMINED = 'undetermined'
}

export interface AuditRecord {
  id: string;
  auditNo: string;
  businessId: string;
  objectId: string;
  ruleVersion: string;
  operatorId: string;
  operatorName: string;
  actionType: ActionType;
  qualificationStatus: QualificationStatus;
  riskLevel: RiskLevel;
  riskTags: string[];
  conclusion: string;
  nextAction: string;
  failureReasons?: string[];
  reviewComment?: string;
  reviewOperatorId?: string;
  reviewTime?: Date;
  previousAuditNo?: string;
  timeWindow: {
    start: Date;
    end: Date;
  };
  statusSnapshotId: string;
  ruleHitDetails: RuleHitDetail[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleHitDetail {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  isHit: boolean;
  riskLevel: RiskLevel;
  riskTags: string[];
  requireReview: boolean;
  message: string;
}

export interface ReviewRecord {
  id: string;
  auditNo: string;
  businessId: string;
  objectId: string;
  operatorId: string;
  operatorName: string;
  reviewResult: 'approve' | 'reject' | 'return';
  reviewComment: string;
  reviewedAt: Date;
}
