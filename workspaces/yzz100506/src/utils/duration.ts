import { SERVICE_CATALOG, type PetSize, type ServiceType } from '@/types'

export function getServiceDuration(type: ServiceType, size: PetSize): number {
  const item = SERVICE_CATALOG.find(s => s.type === type)
  if (!item) return 0
  switch (size) {
    case 'small': return item.smallDuration
    case 'medium': return item.mediumDuration
    case 'large': return item.largeDuration
  }
}

export function calculateTotalDuration(services: ServiceType[], size: PetSize): number {
  return services.reduce((sum, type) => sum + getServiceDuration(type, size), 0)
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = h * 60 + m + minutes
  const newH = Math.floor(totalMinutes / 60) % 24
  const newM = totalMinutes % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}
