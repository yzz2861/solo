import type { Appointment } from '@/types'
import { timeToMinutes } from './duration'

export function hasTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)
  return s1 < e2 && s2 < e1
}

export function findConflicts(
  groomerId: string,
  date: string,
  startTime: string,
  endTime: string,
  appointments: Appointment[],
  excludeId?: string
): Appointment[] {
  return appointments.filter(apt => {
    if (apt.groomerId !== groomerId) return false
    if (apt.date !== date) return false
    if (apt.status === 'cancelled') return false
    if (excludeId && apt.id === excludeId) return false
    return hasTimeOverlap(startTime, endTime, apt.startTime, apt.endTime)
  })
}
