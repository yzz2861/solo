export interface Customer {
  id: string
  canonicalName: string
  canonicalPhone: string
  memberIds: string[]
  phoneHistory: string[]
  assignedConsultant: string
  riskLevel: 'high' | 'medium' | 'low' | 'safe'
  isExcluded: boolean
  excludeReason?: string
  excludeDate?: string
}

export interface Consumption {
  id: string
  customerId: string
  projectName: string
  projectType: 'trial' | 'regular' | 'package'
  amount: number
  consumeDate: string
  consultant: string
}

export interface Appointment {
  id: string
  customerId: string
  appointmentDate: string
  status: 'completed' | 'no_show' | 'cancelled'
  projectName: string
  consultant: string
}

export interface FollowUpNote {
  id: string
  customerId: string
  consultant: string
  followUpDate: string
  method: 'phone' | 'wechat' | 'in_person' | 'other'
  content: string
  isSensitive: boolean
}

export interface Complaint {
  id: string
  customerId: string
  complaintDate: string
  content: string
  status: 'pending' | 'processing' | 'resolved'
  triggerContactPause: boolean
  pauseUntil?: string
}

export interface ChurnAnalysis {
  customerId: string
  customerName: string
  customerPhone: string
  lastVisitDate: string
  avgVisitInterval: number
  currentInterval: number
  intervalDeviation: number
  repurchaseRate: number
  trialRepurchaseRate: number
  regularRepurchaseRate: number
  noShowRate: number
  followUpFrequency: number
  hasActiveComplaint: boolean
  riskScore: number
  riskLevel: 'high' | 'medium' | 'low' | 'safe'
  assignedConsultant: string
  isExcluded: boolean
  excludeReason?: string
}

export interface FollowUpTask {
  id: string
  customerId: string
  consultantId: string
  dueDate: string
  status: 'pending' | 'completed' | 'overdue'
  notes?: string
  createdAt: string
}

export type UserRole = 'boss' | 'manager' | 'consultant'

export interface ProjectTypeRule {
  keyword: string
  type: 'trial' | 'regular'
}

export interface FieldMapping {
  sourceField: string
  targetField: string
}

export interface ImportState {
  consumptionFile: File | null
  appointmentFile: File | null
  followUpFile: File | null
  complaintFile: File | null
  consumptionMappings: FieldMapping[]
  appointmentMappings: FieldMapping[]
  followUpMappings: FieldMapping[]
  complaintMappings: FieldMapping[]
  step: 'upload' | 'mapping' | 'merge' | 'complete'
}
