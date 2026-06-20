export type RiskCategory =
  | 'treatment_effect'
  | 'dosage'
  | 'population'
  | 'contraindication'
  | 'data_source';

export type ExpressionType =
  | 'guideline'
  | 'patient_story'
  | 'advertising'
  | 'vague_suggestion';

export type RiskLevel = 'high' | 'medium' | 'low';

export type EditorStatus = 'pending' | 'confirmed' | 'ignored' | 'handled';

export type DoctorDecision = 'pending' | 'approved' | 'needs_rewrite' | 'delete';

export type ArticleStage =
  | 'imported'
  | 'annotated'
  | 'confirmed'
  | 'sent_to_doctor'
  | 'doctor_reviewed'
  | 'completed';

export type UserRole = 'editor' | 'doctor';

export interface Annotation {
  id: string;
  originalText: string;
  paragraphIndex: number;
  startChar: number;
  endChar: number;
  lineNumber?: number;
  category: RiskCategory;
  expressionType: ExpressionType;
  riskLevel: RiskLevel;
  suggestion: string;
  editorStatus: EditorStatus;
  editorNote?: string;
  editorRevisedText?: string;
  editorHandledAt?: string;
  doctorDecision: DoctorDecision;
  doctorAdvice?: string;
  doctorName?: string;
  doctorReviewedAt?: string;
}

export interface Article {
  id: string;
  title: string;
  author?: string;
  source?: string;
  content: string;
  paragraphs: string[];
  createdAt: string;
  updatedAt: string;
  annotations: Annotation[];
  stage: ArticleStage;
}

export interface RevisionManifest {
  schemaVersion: '1.0';
  exportedAt: string;
  article: {
    id: string;
    title: string;
    author?: string;
    source?: string;
    paragraphCount: number;
    content?: string;
    paragraphs?: string[];
  };
  annotations: Array<
    Pick<
      Annotation,
      | 'id'
      | 'originalText'
      | 'paragraphIndex'
      | 'startChar'
      | 'endChar'
      | 'lineNumber'
      | 'category'
      | 'expressionType'
      | 'riskLevel'
      | 'suggestion'
      | 'editorStatus'
      | 'editorNote'
      | 'editorRevisedText'
      | 'editorHandledAt'
    >
  >;
}

export interface ReviewReport {
  schemaVersion: '1.0';
  reportedAt: string;
  doctorName: string;
  articleId: string;
  articleTitle: string;
  reviewedAnnotations: Annotation[];
  summary: {
    total: number;
    approved: number;
    needsRewrite: number;
    deleted: number;
  };
}

export const CATEGORY_META: Record<
  RiskCategory,
  { label: string; color: string; bg: string; border: string; text: string }
> = {
  treatment_effect: {
    label: '治疗效果',
    color: '#e74c3c',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
  },
  dosage: {
    label: '用药剂量',
    color: '#f39c12',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
  },
  population: {
    label: '适用人群',
    color: '#3498db',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },
  contraindication: {
    label: '禁忌',
    color: '#9b59b6',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
  },
  data_source: {
    label: '数据来源',
    color: '#1abc9c',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
  },
};

export const EXPRESSION_META: Record<ExpressionType, { label: string; icon: string }> = {
  guideline: { label: '引用指南', icon: 'book-open' },
  patient_story: { label: '患者故事', icon: 'user' },
  advertising: { label: '广告化表达', icon: 'megaphone' },
  vague_suggestion: { label: '模糊建议', icon: 'cloud' },
};

export const RISK_LEVEL_META: Record<RiskLevel, { label: string; dot: string }> = {
  high: { label: '高风险', dot: 'bg-red-500' },
  medium: { label: '中风险', dot: 'bg-amber-500' },
  low: { label: '低风险', dot: 'bg-green-500' },
};

export const EDITOR_STATUS_META: Record<EditorStatus, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'bg-slate-100 text-slate-600' },
  confirmed: { label: '已确认', cls: 'bg-sky-100 text-sky-700' },
  ignored: { label: '已忽略', cls: 'bg-slate-100 text-slate-500' },
  handled: { label: '已处理', cls: 'bg-emerald-100 text-emerald-700' },
};

export const DOCTOR_DECISION_META: Record<
  DoctorDecision,
  { label: string; cls: string }
> = {
  pending: { label: '待审核', cls: 'bg-slate-100 text-slate-600' },
  approved: { label: '通过', cls: 'bg-emerald-100 text-emerald-700' },
  needs_rewrite: { label: '需改写', cls: 'bg-amber-100 text-amber-700' },
  delete: { label: '删除', cls: 'bg-rose-100 text-rose-700' },
};

export const STAGE_META: Record<ArticleStage, { label: string; cls: string }> = {
  imported: { label: '已导入', cls: 'bg-slate-100 text-slate-600' },
  annotated: { label: '待确认', cls: 'bg-indigo-100 text-indigo-700' },
  confirmed: { label: '编辑确认', cls: 'bg-sky-100 text-sky-700' },
  sent_to_doctor: { label: '待医生审核', cls: 'bg-amber-100 text-amber-700' },
  doctor_reviewed: { label: '医生已审核', cls: 'bg-violet-100 text-violet-700' },
  completed: { label: '已完成', cls: 'bg-emerald-100 text-emerald-700' },
};
