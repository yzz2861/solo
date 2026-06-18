export type ViolationType =
  | 'FORBIDDEN_EFFECT'
  | 'ABSOLUTE_WORD'
  | 'PRICE_PROMISE'
  | 'MEDICAL_IMPLICATION'
  | 'UNCLEAR_LOTTERY'
  | 'EXAGGERATION'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type SessionStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'PENDING_CORRECTION'
  | 'COMPLETED'

export type ExemptionReason = 'JOKE' | 'USER_REVIEW' | 'BRAND_COPY' | 'SLIP_OF_TONGUE'

export interface ProductLine {
  id: string
  name: string
  keywords: string[]
  color: string
}

export interface Anchor {
  id: string
  name: string
  avatar: string
}

export interface Violation {
  id: string
  sessionId: string
  type: ViolationType
  severity: Severity
  originalText: string
  matchedKeyword: string
  startOffset: number
  endOffset: number
  lineNumber: number
  ruleBasis: string
  suggestion: string
  exemption?: Exemption
  correction?: Correction
  reviewed: boolean
}

export interface Exemption {
  id: string
  reason: ExemptionReason
  note: string
  reviewer: string
  createdAt: string
}

export interface Correction {
  id: string
  correctedText: string
  reviewerNote: string
  isDone: boolean
  updatedAt: string
}

export interface Session {
  id: string
  title: string
  productLineId: string
  anchorId: string
  liveDate: string
  transcript: string
  status: SessionStatus
  violations: Violation[]
  reviewedBy?: string
  createdAt: string
  updatedAt: string
  recheckPassed?: boolean
}

export interface DetectionMatch {
  type: ViolationType
  severity: Severity
  matchedKeyword: string
  startOffset: number
  endOffset: number
  lineNumber: number
  originalText: string
  ruleBasis: string
  suggestion: string
  contextScore: number
}

export const VIOLATION_META: Record<ViolationType, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
}> = {
  FORBIDDEN_EFFECT: {
    label: '禁用功效宣称',
    color: '#EF4444',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-700',
  },
  ABSOLUTE_WORD: {
    label: '绝对化用语',
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-700',
  },
  PRICE_PROMISE: {
    label: '最低价/价格承诺',
    color: '#F97316',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
  },
  MEDICAL_IMPLICATION: {
    label: '医疗暗示/治疗效果',
    color: '#DC2626',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-700',
  },
  UNCLEAR_LOTTERY: {
    label: '抽奖规则不清',
    color: '#8B5CF6',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    textColor: 'text-violet-700',
  },
  EXAGGERATION: {
    label: '夸大宣传',
    color: '#EAB308',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-700',
  },
}

export const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  CRITICAL: { label: '极高', color: 'bg-rose-600 text-white' },
  HIGH: { label: '高', color: 'bg-red-500 text-white' },
  MEDIUM: { label: '中', color: 'bg-amber-500 text-white' },
  LOW: { label: '低', color: 'bg-yellow-400 text-slate-800' },
}

export const STATUS_META: Record<SessionStatus, {
  label: string
  color: string
  barColor: string
}> = {
  PENDING: { label: '待审查', color: 'badge bg-slate-100 text-slate-700', barColor: 'bg-slate-400' },
  REVIEWING: { label: '审查中', color: 'badge bg-blue-100 text-blue-700', barColor: 'bg-blue-500' },
  PENDING_CORRECTION: { label: '待整改', color: 'badge bg-amber-100 text-amber-700', barColor: 'bg-amber-500' },
  COMPLETED: { label: '已完成', color: 'badge bg-emerald-100 text-emerald-700', barColor: 'bg-emerald-500' },
}

export const EXEMPTION_META: Record<ExemptionReason, {
  label: string
  hint: string
  icon: string
}> = {
  JOKE: { label: '玩笑话', hint: '明显是调节气氛的玩笑，不构成违规', icon: '😄' },
  USER_REVIEW: { label: '引用用户评价', hint: '引用消费者的真实反馈，非主播承诺', icon: '💬' },
  BRAND_COPY: { label: '品牌官方文案', hint: '品牌方官方提供的宣传用语，需进一步核实', icon: '🏷️' },
  SLIP_OF_TONGUE: { label: '口误', hint: '明显的脱口失误，上下文中有自我纠正', icon: '🙊' },
}
