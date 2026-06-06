import { HandoverState, DecisionType } from '../../domain';

export interface ApplicationSummaryDTO {
  totalItemCount: number;
  totalQuantity: number;
  totalValue: number;
  totalRemainingQuantity: number;
  totalUsedQuantity: number;
  highRiskItemCount: number;
  drugCategoryCount: Record<string, number>;
}

export interface RuleResultDTO {
  ruleId: string;
  ruleName: string;
  category: string;
  severity: string;
  passed: boolean;
  message: string;
  detail?: Record<string, unknown>;
  affectedItems?: string[];
}

export interface RuleEngineOutputDTO {
  results: RuleResultDTO[];
  overallPassed: boolean;
  requiresReview: boolean;
  shouldReject: boolean;
  riskTags: string[];
  totalWarnings: number;
  totalErrors: number;
  totalReviewRequired: number;
}

export interface HandoverResponseDTO {
  success: boolean;
  code: number;
  message: string;
  data?: {
    applicationId: string;
    finalState: HandoverState;
    decision: DecisionType;
    decisionText: string;
    reasons: string[];
    riskTags: string[];
    riskLevel: 'high' | 'medium' | 'low';
    summary: ApplicationSummaryDTO;
    ruleResults: RuleEngineOutputDTO;
    recordId: string;
    recordNo: string;
    logCount: number;
  };
  error?: string;
}

export const DECISION_TEXT_MAP: Record<DecisionType, string> = {
  [DecisionType.PASS]: '通过',
  [DecisionType.REJECT]: '拦截',
  [DecisionType.REVIEW_REQUIRED]: '待复核',
};
