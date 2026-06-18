import type { Appointment, Pet, Alert } from '@/types'
import { findConflicts } from './conflicts'

export function getAlertsForAppointment(
  appointment: Appointment,
  pet: Pet | undefined,
  allAppointments: Appointment[]
): Alert[] {
  const alerts: Alert[] = []

  if (appointment.earlyArrival && appointment.status !== 'completed' && appointment.status !== 'in-progress') {
    alerts.push({
      id: `early-${appointment.id}`,
      type: 'early-arrival',
      severity: 'low',
      message: '主人已提前到店等待',
      details: `预约时间 ${appointment.startTime}，到店时间 ${appointment.arrivedAt ?? '未知'}，请尽快安排服务`,
      appointmentId: appointment.id,
    })
  }

  if (pet && pet.size === 'large' && appointment.estimatedDuration < 90) {
    alerts.push({
      id: `duration-${appointment.id}`,
      type: 'duration',
      severity: 'high',
      message: '大型犬服务时长不足',
      details: `当前时长 ${appointment.estimatedDuration} 分钟，建议至少 90 分钟`,
      appointmentId: appointment.id,
    })
  }

  const conflicts = findConflicts(
    appointment.groomerId,
    appointment.date,
    appointment.startTime,
    appointment.endTime,
    allAppointments,
    appointment.id
  )
  if (conflicts.length > 0) {
    alerts.push({
      id: `overlap-${appointment.id}`,
      type: 'overlap',
      severity: 'high',
      message: '造型师时间重叠',
      details: `与 ${conflicts.length} 个预约时间冲突`,
      appointmentId: appointment.id,
    })
  }

  if (pet && !pet.vaccinated) {
    alerts.push({
      id: `vaccine-${appointment.id}`,
      type: 'vaccine',
      severity: 'medium',
      message: '宠物未接种疫苗',
      details: `${pet.name} 尚未接种疫苗，请注意安全`,
      appointmentId: appointment.id,
    })
  }

  if (pet && pet.biteWarning) {
    alerts.push({
      id: `bite-${appointment.id}`,
      type: 'vaccine',
      severity: 'high',
      message: '咬人警告',
      details: `${pet.name} 有咬人记录，请做好防护`,
      appointmentId: appointment.id,
    })
  }

  return alerts
}

export function getCurrentHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
