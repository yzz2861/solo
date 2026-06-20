export interface Project {
  id: string;
  name: string;
  createdAt: number;
  responseCount: number;
  riskCount: number;
}

export interface Response {
  id: string;
  projectId: string;
  content: string;
  respondentId?: string;
  respondedAt?: string;
  rawRow: Record<string, string>;
}

export type RiskCategory = 'safety' | 'privacy' | 'compliance' | 'payment' | 'vulnerable';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type DownweightReason = 'joke' | 'news_quote' | 'copy_paste' | 'irrelevant';
export type RiskStatus = 'pending' | 'confirmed' | 'rejected' | 'in_progress' | 'closed';
export type MemberRole = 'researcher' | 'pm' | 'compliance';

export interface Risk {
  id: string;
  projectId: string;
  responseId: string;
  originalQuote: string;
  riskCategory: RiskCategory;
  severity: Severity;
  impactScope: string;
  isDownweighted: boolean;
  downweightReason?: DownweightReason;
  status: RiskStatus;
  handlingSuggestion?: string;
  assignee?: string;
  confirmedAt?: number;
  confirmedBy?: string;
  createdAt: number;
}

export interface TeamMember {
  id: string;
  projectId: string;
  name: string;
  role: MemberRole;
  avatar?: string;
}

export interface FieldMapping {
  content: string;
  respondentId: string;
  respondedAt: string;
}

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  safety: '安全风险',
  privacy: '隐私风险',
  compliance: '合规风险',
  payment: '付款风险',
  vulnerable: '弱势群体',
};

export const RISK_CATEGORY_COLORS: Record<RiskCategory, string> = {
  safety: '#EF4444',
  privacy: '#8B5CF6',
  compliance: '#F59E0B',
  payment: '#F97316',
  vulnerable: '#EC4899',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#6B7280',
};

export const STATUS_LABELS: Record<RiskStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  rejected: '已驳回',
  in_progress: '处理中',
  closed: '已关闭',
};

export const STATUS_COLORS: Record<RiskStatus, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  rejected: '#6B7280',
  in_progress: '#8B5CF6',
  closed: '#10B981',
};

export const DOWNWEIGHT_LABELS: Record<DownweightReason, string> = {
  joke: '玩笑',
  news_quote: '引用新闻',
  copy_paste: '复制粘贴',
  irrelevant: '无关吐槽',
};
