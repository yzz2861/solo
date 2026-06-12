export type IssueType = 'MISSING_PRICE' | 'WRONG_PRICE' | 'INSUFFICIENT_SHELF' | 'COMPETITOR_MIX' | 'DISPLAY_BLOCKED'

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export type AnnotationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'MODIFIED'

export type RectificationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'

export type UserRole = 'supervisor' | 'manager' | 'store_manager'

export type PhotoQuality = 'GOOD' | 'BLURRY' | 'GLARE' | 'OCCLUDED' | 'MULTI_ANGLE'

export interface StoreInfo {
  id: string
  name: string
  region: string
  address: string
}

export interface InspectionBatch {
  id: string
  storeId: string
  date: string
  supervisorId: string
  supervisorName: string
  status: 'processing' | 'completed' | 'reviewed'
  totalPhotos: number
  issueCount: number
}

export interface Photo {
  id: string
  batchId: string
  storeId: string
  url: string
  thumbnailUrl: string
  quality: PhotoQuality
  blurScore: number
  glareScore: number
  takenAt: string
  hasIssues: boolean
  issueTypes: IssueType[]
  minConfidence: number
}

export interface Annotation {
  id: string
  photoId: string
  type: IssueType
  x: number
  y: number
  width: number
  height: number
  confidence: number
  confidenceLevel: ConfidenceLevel
  status: AnnotationStatus
  note: string
  label: string
}

export interface AnnotationHistory {
  id: string
  annotationId: string
  action: 'created' | 'confirmed' | 'rejected' | 'modified_type' | 'modified_position' | 'added_note'
  previousValue: string
  newValue: string
  operatorId: string
  operatorName: string
  timestamp: string
}

export interface RectificationItem {
  id: string
  storeId: string
  annotationId: string
  photoId: string
  batchId: string
  description: string
  issueType: IssueType
  status: RectificationStatus
  deadline: string
  createdAt: string
  completedAt: string | null
  photoUrl: string
  storeName: string
}

export interface Report {
  id: string
  batchId: string
  storeId: string
  storeName: string
  generatedAt: string
  supervisorName: string
  totalPhotos: number
  totalIssues: number
  confirmedIssues: number
  rejectedIssues: number
  pendingIssues: number
  issueBreakdown: Record<IssueType, number>
  date: string
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  MISSING_PRICE: '缺价签',
  WRONG_PRICE: '错价签',
  INSUFFICIENT_SHELF: '排面不足',
  COMPETITOR_MIX: '竞品混放',
  DISPLAY_BLOCKED: '堆头遮挡',
}

export const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  MISSING_PRICE: '#ef4444',
  WRONG_PRICE: '#f97316',
  INSUFFICIENT_SHELF: '#eab308',
  COMPETITOR_MIX: '#8b5cf6',
  DISPLAY_BLOCKED: '#06b6d4',
}

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  HIGH: '#10b981',
  MEDIUM: '#eab308',
  LOW: '#ef4444',
}

export const RECTIFICATION_STATUS_LABELS: Record<RectificationStatus, string> = {
  PENDING: '待整改',
  IN_PROGRESS: '整改中',
  COMPLETED: '已完成',
  REJECTED: '退回整改',
}

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'HIGH'
  if (confidence >= 0.5) return 'MEDIUM'
  return 'LOW'
}
