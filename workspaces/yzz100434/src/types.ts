export type FileStatus = 'existing' | 'missing' | 'expired' | 'needs_update'

export type AlertType = 'expiring_soon' | 'missing_month' | 'multiple_versions' | 'missing_pages'

export type AuditCategory = 'license' | 'training' | 'fire_safety' | 'employee' | 'rectification'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface ScannedFile {
  name: string
  path: string
  size: number
  lastModified: number
  type: string
}

export interface Alert {
  id: string
  type: AlertType
  message: string
  severity: AlertSeverity
}

export interface AuditChecklistItem {
  id: string
  category: AuditCategory
  name: string
  description: string
  requiredFiles: string[]
  starred: boolean
  status: FileStatus
  matchedFiles: ScannedFile[]
  alerts: Alert[]
  expiryDate?: string
  expectedPages?: number
  actualPages?: number
}

export interface AuditSession {
  id: string
  name: string
  auditDate: string
  checklist: AuditChecklistItem[]
  scannedFiles: ScannedFile[]
  createdAt: number
  updatedAt: number
  auditDayMode: boolean
}

export interface ExportReport {
  completionRate: number
  totalItems: number
  existingCount: number
  missingCount: number
  expiredCount: number
  needsUpdateCount: number
  criticalAlerts: Alert[]
  starredItems: AuditChecklistItem[]
  todaySupplementList: AuditChecklistItem[]
}

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  license: '证照类',
  training: '培训类',
  fire_safety: '消防类',
  employee: '人事类',
  rectification: '整改类',
}

export const CATEGORY_ICONS: Record<AuditCategory, string> = {
  license: 'FileCheck',
  training: 'GraduationCap',
  fire_safety: 'Flame',
  employee: 'Users',
  rectification: 'Wrench',
}

export const STATUS_LABELS: Record<FileStatus, string> = {
  existing: '已有',
  missing: '缺失',
  expired: '过期',
  needs_update: '需更新',
}

export const STATUS_COLORS: Record<FileStatus, string> = {
  existing: '#10B981',
  missing: '#EF4444',
  expired: '#F59E0B',
  needs_update: '#3B82F6',
}

export const CATEGORY_ORDER: AuditCategory[] = [
  'license',
  'training',
  'fire_safety',
  'employee',
  'rectification',
]

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  expiring_soon: '即将过期',
  missing_month: '缺少月份',
  multiple_versions: '多版本冲突',
  missing_pages: '缺页',
}
