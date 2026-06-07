export type RecordStatus = 'normal' | 'abnormal' | 'pending';

export type AbnormalType =
  | 'missing_field'
  | 'rule_conflict'
  | 'duplicate'
  | 'invalid_value'
  | 'unknown';

export type TaskStatus =
  | 'pending_classify'
  | 'classified'
  | 'pending_review'
  | 'reviewed'
  | 'rejected';

export interface HotlineRecord {
  id: string;
  title: string;
  content: string;
  category?: string;
  source?: string;
  reporter?: string;
  reporterPhone?: string;
  occurTime?: string;
  receiveTime?: string;
  department?: string;
  urgency?: string;
  [key: string]: string | undefined;
}

export interface ClassifyRule {
  id: string;
  name: string;
  priority: number;
  category: string;
  department: string;
  conditions: RuleCondition[];
  matchAll?: boolean;
  description?: string;
}

export interface RuleCondition {
  field: string;
  operator: 'contains' | 'equals' | 'regex' | 'startsWith' | 'endsWith' | 'in';
  value: string | string[];
}

export interface RuleMatchResult {
  ruleId: string;
  ruleName: string;
  category: string;
  department: string;
  matched: boolean;
  matchedConditions: number;
  totalConditions: number;
}

export interface ProcessedRecord {
  record: HotlineRecord;
  sourceRow: number;
  status: RecordStatus;
  category?: string;
  department?: string;
  matchedRules: RuleMatchResult[];
  abnormalTypes: AbnormalType[];
  abnormalReasons: string[];
  taskStatus: TaskStatus;
  isDuplicate: boolean;
  duplicateOf?: string;
  hasRuleConflict: boolean;
  conflictingRules?: string[];
  processingTime: string;
  batchId: string;
  previousSnapshot?: SnapshotRecord;
}

export interface SnapshotRecord {
  id: string;
  category?: string;
  department?: string;
  status?: TaskStatus;
  snapshotTime: string;
}

export interface ClassificationConfig {
  requiredFields: string[];
  rules: ClassifyRule[];
  duplicateCheckFields: string[];
  defaultCategory: string;
  defaultDepartment: string;
}

export interface CliOptions {
  input: string;
  rules: string;
  snapshot: string;
  output: string;
  batchId?: string;
  strict?: boolean;
}

export interface OutputSummary {
  totalRecords: number;
  normalRecords: number;
  abnormalRecords: number;
  pendingRecords: number;
  missingFieldCount: number;
  ruleConflictCount: number;
  duplicateCount: number;
  processingTime: string;
  batchId: string;
}
