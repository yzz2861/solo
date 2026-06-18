import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { timeToMinutes } from '@/utils/duration'
import AppointmentCard from './AppointmentCard'

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

interface WeekViewProps {
  startDate: string
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_NAMES[d.getDay()]
}

export default function WeekView({ startDate }: WeekViewProps) {
  const getAppointmentsByDate = useStore((s) => s.getAppointmentsByDate)

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startDate, i)),
    [startDate]
  )

  const dayData = useMemo(() => {
    return days.map((day) => {
      const apts = getAppointmentsByDate(day)
      const sorted = [...apts].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      )
      return { date: day, appointments: sorted }
    })
  }, [days, getAppointmentsByDate])

  return (
    <div className="grid grid-cols-7 gap-2 h-full">
      {dayData.map(({ date, appointments }) => (
        <div key={date} className="flex flex-col min-h-0">
          <div className="text-center py-2 border-b border-gray-200 shrink-0">
            <p className="text-xs text-gray-500">{getDayName(date)}</p>
            <p className="text-sm font-semibold text-gray-800">{formatDay(date)}</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pt-1">
            {appointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} compact />
            ))}
            {appointments.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">无预约</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
