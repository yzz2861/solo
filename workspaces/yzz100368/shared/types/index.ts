export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type FieldType = 'chief_complaint' | 'diagnosis' | 'medication' | 'allergy' | 'followup';

export type RecordStatus = 'uploaded' | 'extracted' | 'confirmed' | 'archived';

export type SourceType = 'image' | 'text';

export interface Patient {
  id: string;
  name: string;
  idCardMasked: string;
  phoneMasked: string;
  gender: '男' | '女';
  age: number;
}

export interface EvidenceSpan {
  type: 'text' | 'image';
  text?: string;
  startIndex?: number;
  endIndex?: number;
  bbox?: { x: number; y: number; w: number; h: number };
}

export interface ExtractedField {
  id: string;
  fieldType: FieldType;
  value: string;
  confidence: ConfidenceLevel;
  evidence: EvidenceSpan;
  warnings: string[];
  originalRaw?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  patient?: Patient;
  visitDate: string;
  sourceType: SourceType;
  sourceContent: string;
  status: RecordStatus;
  extractions: ExtractedField[];
  createdAt: string;
  updatedAt: string;
}

export interface RevisionHistory {
  id: string;
  recordId: string;
  fieldType: FieldType;
  oldValue: string;
  newValue: string;
  operator: string;
  operatedAt: string;
  reason?: string;
}

export interface QAReview {
  id: string;
  recordId: string;
  revisionId: string;
  reviewer: string;
  result: 'pass' | 'needs_recheck';
  comment?: string;
  reviewedAt: string;
}

export const FIELD_LABELS: Record<FieldType, string> = {
  chief_complaint: '主诉',
  diagnosis: '诊断',
  medication: '用药',
  allergy: '过敏提示',
  followup: '复诊时间',
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: '高把握',
  medium: '中把握',
  low: '低把握',
};

export const STATUS_LABELS: Record<RecordStatus, string> = {
  uploaded: '已上传',
  extracted: '已抽取',
  confirmed: '已确认',
  archived: '已归档',
};
