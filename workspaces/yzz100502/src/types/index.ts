export type CategoryType =
  | 'symptom_change'
  | 'medication_issue'
  | 'adverse_reaction'
  | 'need_visit'
  | 'observation_only';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export type ReviewStatus = 'pending' | 'confirmed' | 'modified' | 'rejected';

export type SenderType = 'patient' | 'family';

export type UserRole = 'nurse' | 'doctor';

export type DoctorActionType = 'reviewed' | 'callback' | 'schedule_visit' | 'medication_adjust';

export type TrendType = 'improving' | 'worsening' | 'stable' | 'unknown';

export interface SmsRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientNameMasked: string;
  phone: string;
  phoneMasked: string;
  content: string;
  sendTime: Date;
  sender: SenderType;
  senderRelation?: string;
  nurseNote?: string;
  importTime: Date;
  importedBy: string;
}

export interface AnalysisResult {
  id: string;
  smsId: string;
  category: CategoryType;
  severity: SeverityLevel;
  confidence: number;
  summary: string;
  evidence: string[];
  keywords: string[];
  isAmbiguous: boolean;
  ambiguousReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewStatus: ReviewStatus;
  reviewNote?: string;
}

export interface PatientTimelineRecord {
  date: Date;
  smsIds: string[];
  category: CategoryType;
  severity: SeverityLevel;
  summary: string;
  trend: TrendType;
}

export interface PatientTimeline {
  patientId: string;
  patientName: string;
  patientNameMasked: string;
  records: PatientTimelineRecord[];
}

export interface DoctorAction {
  id: string;
  resultId: string;
  doctorId: string;
  actionTime: Date;
  action: DoctorActionType;
  note: string;
  status: 'pending' | 'completed';
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  department: string;
}

export interface ExportOptions {
  includeOriginal: boolean;
  includeEvidence: boolean;
  format: 'excel' | 'pdf';
  maskPrivacy: boolean;
}

export interface CategoryConfig {
  key: CategoryType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export interface SeverityConfig {
  key: SeverityLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  priority: number;
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    key: 'symptom_change',
    label: '症状变化',
    color: '#1976D2',
    bgColor: '#E3F2FD',
    borderColor: '#90CAF9',
    icon: 'Activity',
  },
  {
    key: 'medication_issue',
    label: '用药问题',
    color: '#FB8C00',
    bgColor: '#FFF3E0',
    borderColor: '#FFCC80',
    icon: 'Pill',
  },
  {
    key: 'adverse_reaction',
    label: '不良反应',
    color: '#E53935',
    bgColor: '#FFEBEE',
    borderColor: '#EF9A9A',
    icon: 'AlertTriangle',
  },
  {
    key: 'need_visit',
    label: '需回诊',
    color: '#8E24AA',
    bgColor: '#F3E5F5',
    borderColor: '#CE93D8',
    icon: 'Calendar',
  },
  {
    key: 'observation_only',
    label: '只需观察',
    color: '#43A047',
    bgColor: '#E8F5E9',
    borderColor: '#A5D6A7',
    icon: 'Eye',
  },
];

export const SEVERITY_CONFIGS: SeverityConfig[] = [
  {
    key: 'critical',
    label: '危急',
    color: '#D32F2F',
    bgColor: '#FFCDD2',
    borderColor: '#E57373',
    priority: 5,
  },
  {
    key: 'high',
    label: '高',
    color: '#F57C00',
    bgColor: '#FFE0B2',
    borderColor: '#FFB74D',
    priority: 4,
  },
  {
    key: 'medium',
    label: '中',
    color: '#FBC02D',
    bgColor: '#FFF9C4',
    borderColor: '#FFF176',
    priority: 3,
  },
  {
    key: 'low',
    label: '低',
    color: '#388E3C',
    bgColor: '#C8E6C9',
    borderColor: '#81C784',
    priority: 2,
  },
  {
    key: 'unknown',
    label: '待评估',
    color: '#757575',
    bgColor: '#F5F5F5',
    borderColor: '#BDBDBD',
    priority: 1,
  },
];
