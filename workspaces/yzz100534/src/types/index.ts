export type EvidenceType = 'chat_screenshot' | 'logistics_photo' | 'inspection_report' | 'customer_statement';

export type DetectionType = 
  | 'cropped_screenshot' 
  | 'duplicate_file' 
  | 'contradictory_statement' 
  | 'missing_signature' 
  | 'missing_evidence';

export type Severity = 'high' | 'medium' | 'low';

export type CaseStatus = 'draft' | 'reviewing' | 'confirmed' | 'exported';

export type TimelineNodeType = 'event' | 'evidence' | 'note';

export interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description?: string;
}

export interface Evidence {
  id: string;
  caseId: string;
  type: EvidenceType;
  title: string;
  description: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
  uploadTime: Date;
  evidenceTime?: Date;
  sourceRef?: string;
  annotations: Annotation[];
  isDuplicate: boolean;
  hasIssues: boolean;
  textContent?: string;
}

export interface DetectionResult {
  id: string;
  evidenceId?: string;
  type: DetectionType;
  severity: Severity;
  description: string;
  suggestion: string;
  resolved: boolean;
}

export interface SupplementItem {
  id: string;
  caseId: string;
  title: string;
  description: string;
  priority: Severity;
  questionToCustomer: string;
  internalNote: string;
  isSensitive: boolean;
  deadline?: Date;
  completed: boolean;
}

export interface TimelineNode {
  id: string;
  caseId: string;
  time: Date;
  title: string;
  description: string;
  evidenceIds: string[];
  type: TimelineNodeType;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  customerName: string;
  status: CaseStatus;
  createdAt: Date;
  updatedAt: Date;
  internalNotes: string;
  supplementDeadline?: Date;
  evidences: Evidence[];
  detections: DetectionResult[];
  supplements: SupplementItem[];
  timeline: TimelineNode[];
}

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  chat_screenshot: '聊天截图',
  logistics_photo: '物流照片',
  inspection_report: '检测单',
  customer_statement: '客户说明',
};

export const DETECTION_TYPE_LABELS: Record<DetectionType, string> = {
  cropped_screenshot: '截图不完整',
  duplicate_file: '重复附件',
  contradictory_statement: '说法矛盾',
  missing_signature: '缺少签名',
  missing_evidence: '证据缺失',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  high: '高',
  medium: '中',
  low: '低',
};
