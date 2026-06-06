import { TaskStatus, StatusTransitionTrigger } from '../status';
import { RuleResult } from '../rules';
import { RiskLevel } from '../rules';

export interface ProcessingRecord {
  recordId: string;
  applicationId: string;
  cardId: string;
  studentId: string;
  processTime: string;
  operator: string;
  previousStatus: TaskStatus;
  currentStatus: TaskStatus;
  trigger: StatusTransitionTrigger;
  reason: string;
  riskSnapshot: RiskSnapshot;
  ruleResults: RuleResult[];
}

export interface RiskSnapshot {
  totalRiskScore: number;
  riskLevel: RiskLevel;
  calculationBasis: {
    totalScore: number;
    breakdown: Array<{
      ruleType: string;
      ruleName: string;
      score: number;
      triggered: boolean;
    }>;
  };
  anomalyExplanation: string;
}

export interface DataReplayInput {
  applicationId: string;
  records: ProcessingRecord[];
}

export interface ReplayStep {
  stepIndex: number;
  recordId: string;
  processTime: string;
  operator: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  trigger: StatusTransitionTrigger;
  reason: string;
  riskScore: number;
  riskLevel: RiskLevel;
  anomalyExplanation: string;
}

export interface DataReplayResult {
  applicationId: string;
  totalSteps: number;
  steps: ReplayStep[];
  finalStatus: TaskStatus;
  statusTimeline: Array<{
    status: TaskStatus;
    startTime: string;
    endTime?: string;
    duration?: number;
  }>;
}
