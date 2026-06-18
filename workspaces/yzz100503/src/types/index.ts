export type TapeStatus = 'pending' | 'transcribing' | 'interrupted' | 'transcribed' | 'repairing' | 'completed'

export type DeliveryMedium = 'usb' | 'dvd' | 'cloud' | 'hard_drive' | 'other'

export type OutputFormat = 'mp4' | 'mov' | 'avi' | 'mkv' | 'custom'

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface DamageSpot {
  id: string
  timeStart: string
  timeEnd: string
  description: string
  severity: 'mild' | 'moderate' | 'severe'
}

export interface VideoSegment {
  id: string
  name: string
  description?: string
  timeStart: string
  timeEnd: string
  starred: boolean
  status: 'pending' | 'processing' | 'done'
  category?: string
  orderIndex: number
}

export interface RepairRequest {
  id: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'done'
  createdAt: string
}

export interface Tape {
  id: string
  tapeNumber: string
  customerId: string
  title: string
  videoFilePath: string
  outputFormat: OutputFormat
  formatConfirmed: boolean
  status: TapeStatus
  tapeType?: string
  duration?: string
  damageSpots: DamageSpot[]
  segments: VideoSegment[]
  repairRequests: RepairRequest[]
  deliveryMedium: DeliveryMedium
  deliveryNotes?: string
  delivered: boolean
  deliveredAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
  transcriptionProgress: number
}

export interface Alert {
  id: string
  type: 'path_invalid' | 'duplicate_tape' | 'transcription_interrupted' | 'unconfirmed_format' | 'general'
  level: 'warning' | 'error' | 'info'
  title: string
  message: string
  tapeId?: string
  customerId?: string
  read: boolean
  createdAt: string
}

export interface AppData {
  customers: Customer[]
  tapes: Tape[]
  alerts: Alert[]
  lastUpdated: string
  version: string
}

export type RoleView = 'reception' | 'editor' | 'customer'
