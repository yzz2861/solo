import type { Appointment, Groomer, WorkloadData } from '@/types'

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]
        const str = String(val ?? '')
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
      }).join(',')
    ),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export function calculateWorkload(
  appointments: Appointment[],
  groomers: Groomer[],
  startDate: string,
  endDate: string
): WorkloadData[] {
  const filtered = appointments.filter(apt => {
    if (apt.date < startDate || apt.date > endDate) return false
    return apt.status !== 'cancelled'
  })

  return groomers.map(groomer => {
    const groomerApts = filtered.filter(apt => apt.groomerId === groomer.id)
    return {
      groomerId: groomer.id,
      groomerName: groomer.name,
      totalAppointments: groomerApts.length,
      totalDuration: groomerApts.reduce((sum, apt) => sum + apt.estimatedDuration, 0),
      completedCount: groomerApts.filter(apt => apt.status === 'completed').length,
      noShowCount: groomerApts.filter(apt => apt.status === 'no-show').length,
    }
  })
}

export function getNoShowRecords(
  appointments: Appointment[],
  startDate: string,
  endDate: string
): Appointment[] {
  return appointments.filter(apt => {
    if (apt.status !== 'no-show') return false
    return apt.date >= startDate && apt.date <= endDate
  })
}
