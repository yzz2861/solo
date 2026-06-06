export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  UNDETERMINED = 'undetermined'
}

export enum RuleType {
  OWNERSHIP = 'ownership',
  TIME_WINDOW = 'time_window',
  MATERIAL_COMPLETENESS = 'material_completeness',
  IDENTITY_VERIFICATION = 'identity_verification',
  PROPERTY_AREA = 'property_area',
  ARREARS = 'arrears'
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
}

export interface Rule {
  id: string;
  version: string;
  name: string;
  description: string;
  type: RuleType;
  conditions: RuleCondition[];
  riskLevel: RiskLevel;
  riskTags: string[];
  passMessage?: string;
  failMessage?: string;
  requireReview?: boolean;
  isActive: boolean;
  createdAt: Date;
  effectiveDate: Date;
  expiryDate?: Date;
}

export interface RuleSet {
  id: string;
  version: string;
  name: string;
  description: string;
  rules: Rule[];
  isActive: boolean;
  createdAt: Date;
}
