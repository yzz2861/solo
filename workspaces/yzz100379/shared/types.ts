export type WorkOrderStatus = 'pending' | 'assigned' | 'processing' | 'completed'
export type UrgencyLevel = 'low' | 'medium' | 'high'
export type StaffRole = 'cs' | 'tech' | 'admin'
export type SuspicionType = 'unclear' | 'multiple' | 'nickname' | 'date_ambiguous'

export interface Staff {
  id: string
  name: string
  role: StaffRole
  phone: string
}

export interface SuspicionTag {
  id: string
  type: SuspicionType
  description: string
  sourceText: string
  resolved: boolean
  resolverNote: string | null
}

export interface EvidenceSentence {
  id: string
  original: string
  corrected: string | null
  field: string
}

export interface VersionEntry {
  id: string
  timestamp: string
  editorId: string
  editorName: string
  changes: Record<string, { old: any; new: any }>
  note: string | null
}

export interface WorkOrder {
  id: string
  sourceText: string
  community: string | null
  building: string | null
  roomNumber: string | null
  problemType: string | null
  urgency: UrgencyLevel | null
  callbackSentence: string | null
  suspicionTags: SuspicionTag[]
  isConfirmed: boolean
  status: WorkOrderStatus
  assigneeId: string | null
  assigneeName?: string
  assigneePhone?: string
  dispatcherId: string | null
  dispatcherName?: string
  shortMessage: string | null
  evidenceSentences: EvidenceSentence[]
  versionHistory: VersionEntry[]
  createdAt: string
  updatedAt: string
}

export interface CreateTicketRequest {
  sourceText: string
}

export interface UpdateTicketRequest {
  community?: string | null
  building?: string | null
  roomNumber?: string | null
  problemType?: string | null
  urgency?: UrgencyLevel | null
  callbackSentence?: string | null
  suspicionTags?: SuspicionTag[]
  isConfirmed?: boolean
  editorId: string
  editorName: string
  note?: string
}

export interface AssignTicketRequest {
  assigneeId: string
  shortMessage: string
  dispatcherId: string
  dispatcherName: string
}

export interface LoginRequest {
  staffId: string
}

export interface LoginResponse {
  staff: Staff
}

export const PROBLEM_TYPES = [
  '水管漏水',
  '水管堵塞',
  '水龙头损坏',
  '热水器故障',
  '电路跳闸',
  '灯具损坏',
  '门禁故障',
  '电梯故障',
  '墙体开裂',
  '窗户损坏',
  '门锁损坏',
  '下水道堵塞',
  '其他维修',
] as const

export const SUSPICION_TYPE_LABELS: Record<SuspicionType, string> = {
  unclear: '听不清/疑似错字',
  multiple: '同一通话多问题',
  nickname: '住户只说外号',
  date_ambiguous: '门牌/日期歧义',
}

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: '普通',
  medium: '较急',
  high: '紧急',
}

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: '待派发',
  assigned: '已派发',
  processing: '处理中',
  completed: '已完成',
}
