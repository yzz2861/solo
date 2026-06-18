export type FeedbackSource = 'student' | 'ta' | 'wrong_answer';
export type SeverityLevel = 'critical' | 'important' | 'normal' | 'rare-critical';
export type PriorityLevel = 'high' | 'medium' | 'low';
export type ImprovementStatus = 'todo' | 'doing' | 'done';

export interface Theme {
  id: string;
  name: string;
  color: string;
  description?: string;
  keywords: string[];
  weight: number;
  isCustom: boolean;
}

export interface Feedback {
  id: string;
  source: FeedbackSource;
  content: string;
  author?: string;
  homework?: string;
  createdAt: Date;
  tags: string[];
  severity: SeverityLevel;
  isSevere: boolean;
  note?: string;
}

export interface FeedbackThemeRelation {
  feedbackId: string;
  themeId: string;
  matchScore: number;
  matchedKeywords: string[];
  manuallyAdjusted: boolean;
}

export interface Improvement {
  id: string;
  title: string;
  description: string;
  representativeQuotes: string[];
  relatedThemeIds: string[];
  priority: PriorityLevel;
  status: ImprovementStatus;
  courseId?: string;
  owner?: string;
  deadline?: Date;
  estimatedMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  name: string;
  courseNumber: number;
  scheduledAt: Date;
  notes?: string;
}

export interface ThemeWithStats extends Theme {
  feedbackCount: number;
  criticalCount: number;
  representativeQuotes: string[];
  matchedKeywords: string[];
}

export interface ImportResult {
  success: number;
  failed: number;
  imported: Feedback[];
}

export const SOURCE_LABEL: Record<FeedbackSource, { label: string; icon: string; color: string }> = {
  student: { label: '学生反馈', icon: 'User', color: 'text-brand-600' },
  ta: { label: '助教批注', icon: 'UserCheck', color: 'text-emerald-600' },
  wrong_answer: { label: '错题说明', icon: 'XCircle', color: 'text-rose-600' },
};

export const SEVERITY_LABEL: Record<SeverityLevel, { label: string; badgeClass: string }> = {
  critical: { label: '🔴 严重', badgeClass: 'bg-red-100 text-red-700 border-red-200 animate-pulse-soft' },
  important: { label: '🟠 重要', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  normal: { label: '🟡 一般', badgeClass: 'bg-gray-100 text-gray-600 border-gray-200' },
  'rare-critical': { label: '⭐ 低频严重', badgeClass: 'bg-violet-100 text-violet-700 border-violet-200' },
};

export const PRIORITY_LABEL: Record<PriorityLevel, { label: string; color: string; dotClass: string }> = {
  high: { label: 'P0 高', color: '#ef4444', dotClass: 'bg-red-500' },
  medium: { label: 'P1 中', color: '#f59e0b', dotClass: 'bg-amber-500' },
  low: { label: 'P2 低', color: '#6b7280', dotClass: 'bg-gray-400' },
};

export const STATUS_LABEL: Record<ImprovementStatus, { label: string; color: string; bgClass: string }> = {
  todo: { label: '待办', color: 'text-gray-600', bgClass: 'bg-gray-100' },
  doing: { label: '进行中', color: 'text-blue-600', bgClass: 'bg-blue-100' },
  done: { label: '已完成', color: 'text-green-600', bgClass: 'bg-green-100' },
};
