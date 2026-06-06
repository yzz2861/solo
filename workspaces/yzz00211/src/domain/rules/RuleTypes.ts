export enum RuleSeverity {
  PASS = 'pass',
  WARNING = 'warning',
  ERROR = 'error',
  REVIEW = 'review',
}

export enum RuleCategory {
  THRESHOLD = 'threshold',
  MATERIAL = 'material',
  RISK = 'risk',
  HISTORY = 'history',
  QUANTITY = 'quantity',
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: RuleSeverity;
  passed: boolean;
  message: string;
  detail?: Record<string, unknown>;
  affectedItems?: string[];
}

export interface RuleEngineInput {
  application: import('../objects').HandoverApplication;
  materials: import('../objects').SupportingMaterial[];
  history: import('../objects').ApplicationHistory;
  thresholdConfig: import('../objects').ThresholdConfig;
  summary: import('../objects').ApplicationSummary;
}

export interface RuleEngineOutput {
  results: RuleResult[];
  overallPassed: boolean;
  requiresReview: boolean;
  shouldReject: boolean;
  riskTags: string[];
  totalWarnings: number;
  totalErrors: number;
  totalReviewRequired: number;
}

export interface IRule {
  id: string;
  name: string;
  category: RuleCategory;
  execute(input: RuleEngineInput): RuleResult;
}
