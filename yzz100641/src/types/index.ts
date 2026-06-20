export type GradingLevel = 'emergency' | 'psychology' | 'headteacher' | 'general' | 'review';

export type RequestStatus = 'pending' | 'grading' | 'graded' | 'confirmed' | 'referred' | 'closed';

export type ReferralType = 'psychology' | 'headteacher' | 'other';

export type ReferralStatus = 'pending' | 'accepted' | 'completed' | 'rejected';

export interface TriggeredSentence {
  text: string;
  startIndex: number;
  endIndex: number;
  ruleId: string;
  ruleName: string;
}

export interface GradingResult {
  level: GradingLevel;
  confidence: number;
  triggeredSentences: TriggeredSentence[];
  triggeredRules: string[];
  gradedAt: string;
  gradingEngine: string;
}

export interface HelpRequest {
  id: string;
  content: string;
  submitTime: string;
  source: 'manual' | 'batch' | 'file';
  status: RequestStatus;
  gradingResult?: GradingResult;
  confirmedLevel?: GradingLevel;
  confirmedBy?: string;
  confirmedAt?: string;
  processRemark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralRecord {
  id: string;
  requestId: string;
  fromRole: string;
  toRole: string;
  referralType: ReferralType;
  reason: string;
  status: ReferralStatus;
  createdAt: string;
  updatedAt: string;
  handledBy?: string;
  handledAt?: string;
  handleRemark?: string;
}

export interface ProcessLog {
  id: string;
  requestId: string;
  action: string;
  operator: string;
  remark?: string;
  createdAt: string;
}

export interface GradingRule {
  id: string;
  name: string;
  level: GradingLevel;
  keywords: string[];
  patterns: string[];
  weight: number;
  enabled: boolean;
}

export interface ExportConfig {
  dateRange: {
    start: string;
    end: string;
  };
  levels: GradingLevel[];
  statuses: RequestStatus[];
  maskSensitive: boolean;
  includeReferrals: boolean;
  format: 'xlsx' | 'csv';
}

export const GRADING_LEVEL_LABELS: Record<GradingLevel, string> = {
  emergency: '紧急联系',
  psychology: '需要心理老师关注',
  headteacher: '需要班主任跟进',
  general: '普通咨询',
  review: '人工复核',
};

export const GRADING_LEVEL_COLORS: Record<GradingLevel, string> = {
  emergency: 'bg-red-500',
  psychology: 'bg-orange-500',
  headteacher: 'bg-yellow-500',
  general: 'bg-green-500',
  review: 'bg-gray-500',
};

export const GRADING_LEVEL_TEXT_COLORS: Record<GradingLevel, string> = {
  emergency: 'text-red-700',
  psychology: 'text-orange-700',
  headteacher: 'text-yellow-700',
  general: 'text-green-700',
  review: 'text-gray-700',
};

export const GRADING_LEVEL_BG_COLORS: Record<GradingLevel, string> = {
  emergency: 'bg-red-50',
  psychology: 'bg-orange-50',
  headteacher: 'bg-yellow-50',
  general: 'bg-green-50',
  review: 'bg-gray-50',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: '待分级',
  grading: '分级中',
  graded: '已分级待确认',
  confirmed: '已确认',
  referred: '已转介',
  closed: '已处理',
};

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: '待处理',
  accepted: '已接收',
  completed: '已完成',
  rejected: '已退回',
};

export const REFERRAL_TYPE_LABELS: Record<ReferralType, string> = {
  psychology: '转介心理老师',
  headteacher: '转介班主任',
  other: '其他转介',
};
