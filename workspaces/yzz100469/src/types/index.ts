export type AnnotationType = 'evidence' | 'no_evidence' | 'bias' | 'follow_up';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface Annotation {
  id: string;
  type: AnnotationType;
  text: string;
  start: number;
  end: number;
  paragraphIndex: number;
  reason?: string;
  suggestion?: string;
  isManual: boolean;
  createdAt: number;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  relatedAnnotationId?: string;
  isCustom: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface RevisionRecord {
  id: string;
  action: 'add' | 'modify' | 'delete';
  annotationId: string;
  oldValue?: Partial<Annotation>;
  newValue?: Partial<Annotation>;
  timestamp: number;
  operator: 'system' | 'user';
}

export interface InterviewRecord {
  id: string;
  candidateName: string;
  position: string;
  round: number;
  interviewerAlias: string;
  interviewDate: string;
  content: string;
  paragraphs: string[];
  annotations: Annotation[];
  followUpQuestions: FollowUpQuestion[];
  revisions: RevisionRecord[];
  riskScore: number;
  status: 'draft' | 'analyzed' | 'confirmed' | 'exported';
  createdAt: number;
  updatedAt: number;
}

export interface AnalysisResult {
  annotations: Annotation[];
  followUpQuestions: FollowUpQuestion[];
  riskScore: number;
  biasTypes: string[];
}

export const ANNOTATION_TYPE_LABELS: Record<AnnotationType, string> = {
  evidence: '有证据判断',
  no_evidence: '缺证据结论',
  bias: '偏见表述',
  follow_up: '追问建议',
};

export const ANNOTATION_TYPE_COLORS: Record<AnnotationType, { bg: string; text: string; border: string; light: string }> = {
  evidence: { bg: 'bg-evidence', text: 'text-evidence-dark', border: 'border-evidence', light: 'bg-evidence-light' },
  no_evidence: { bg: 'bg-noevidence', text: 'text-noevidence-dark', border: 'border-noevidence', light: 'bg-noevidence-light' },
  bias: { bg: 'bg-bias', text: 'text-bias-dark', border: 'border-bias', light: 'bg-bias-light' },
  follow_up: { bg: 'bg-followup', text: 'text-followup-dark', border: 'border-followup', light: 'bg-followup-light' },
};
