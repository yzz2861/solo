export type PetSize = 'small' | 'medium' | 'large'
export type PetPersonality = 'calm' | 'nervous' | 'active' | 'aggressive'
export type AppointmentStatus = 'pending' | 'in-progress' | 'completed' | 'no-show' | 'cancelled'
export type ServiceType = 'wash' | 'shave' | 'nail' | 'pickup'
export type AlertSeverity = 'high' | 'medium' | 'low'

export interface Pet {
  id: string
  name: string
  breed: string
  size: PetSize
  weight: number
  vaccinated: boolean
  personality: PetPersonality
  allergyNote: string
  biteWarning: boolean
  ownerId: string
}

export interface Owner {
  id: string
  name: string
  phone: string
  address: string
}

export interface Groomer {
  id: string
  name: string
  avatar: string
  specialties: ServiceType[]
}

export interface Assistant {
  id: string
  name: string
}

export interface ServiceItem {
  id: string
  appointmentId: string
  type: ServiceType
  duration: number
  price: number
}

export interface AppointmentAssistant {
  appointmentId: string
  assistantId: string
}

export interface Appointment {
  id: string
  petId: string
  groomerId: string
  date: string
  startTime: string
  endTime: string
  estimatedDuration: number
  status: AppointmentStatus
  pickupTime: string
  pickupAddress: string
  needsPickup: boolean
  notes: string
  ownerId: string
  createdAt: string
  services: ServiceItem[]
  assistants: string[]
  earlyArrival: boolean
  arrivedAt?: string
}

export interface Alert {
  id: string
  type: 'duration' | 'overlap' | 'vaccine' | 'early-arrival'
  severity: AlertSeverity
  message: string
  appointmentId?: string
  details?: string
}

export interface ServiceCatalogItem {
  type: ServiceType
  label: string
  smallDuration: number
  mediumDuration: number
  largeDuration: number
  price: number
}

export interface WorkloadData {
  groomerId: string
  groomerName: string
  totalAppointments: number
  totalDuration: number
  completedCount: number
  noShowCount: number
}

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  { type: 'wash', label: '洗护', smallDuration: 40, mediumDuration: 60, largeDuration: 90, price: 80 },
  { type: 'shave', label: '剃毛', smallDuration: 30, mediumDuration: 45, largeDuration: 60, price: 100 },
  { type: 'nail', label: '剪指甲', smallDuration: 10, mediumDuration: 15, largeDuration: 20, price: 30 },
  { type: 'pickup', label: '接送', smallDuration: 30, mediumDuration: 30, largeDuration: 30, price: 50 },
]

export const PERSONALITY_LABELS: Record<PetPersonality, string> = {
  calm: '温顺',
  nervous: '紧张',
  active: '活泼',
  aggressive: '有攻击性',
}

export const SIZE_LABELS: Record<PetSize, string> = {
  small: '小型犬',
  medium: '中型犬',
  large: '大型犬',
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: '待服务',
  'in-progress': '服务中',
  completed: '已完成',
  'no-show': '爽约',
  cancelled: '已取消',
}
