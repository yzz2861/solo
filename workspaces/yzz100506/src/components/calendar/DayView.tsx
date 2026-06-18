import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { timeToMinutes } from '@/utils/duration'
import AppointmentCard from './AppointmentCard'

const START_HOUR = 8
const END_HOUR = 18
const SLOT_MINUTES = 30
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES

interface DayViewProps {
  date: string
  onSlotClick?: (groomerId: string, date: string, time: string) => void
}

export default function DayView({ date, onSlotClick }: DayViewProps) {
  const groomers = useStore((s) => s.groomers)
  const getAppointmentsByGroomer = useStore((s) => s.getAppointmentsByGroomer)

  const groomerAppointments = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getAppointmentsByGroomer>>()
    for (const g of groomers) {
      map.set(g.id, getAppointmentsByGroomer(g.id, date))
    }
    return map
  }, [groomers, date, getAppointmentsByGroomer])

  const timeSlots = useMemo(() => {
    const slots: string[] = []
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const mins = START_HOUR * 60 + i * SLOT_MINUTES
      const h = Math.floor(mins / 60)
      const m = mins % 60
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
    return slots
  }, [])

  function getSlotIndex(time: string): number {
    const mins = timeToMinutes(time)
    return (mins - START_HOUR * 60) / SLOT_MINUTES
  }

  function getSpanSlots(duration: number): number {
    return Math.ceil(duration / SLOT_MINUTES)
  }

  function isHalfHour(time: string): boolean {
    return time.endsWith(':30')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="w-16 shrink-0" />
        {groomers.map((groomer) => (
          <div
            key={groomer.id}
            className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2 border-l border-gray-100"
          >
            <span className="text-lg">{groomer.avatar}</span>
            <span className="text-sm font-medium text-gray-700">{groomer.name}</span>
          </div>
        ))}
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${TOTAL_SLOTS}, 2rem)`,
          gridTemplateColumns: `4rem repeat(${groomers.length}, minmax(180px, 1fr))`,
        }}
      >
        {timeSlots.map((time, slotIdx) => (
          <div
            key={`time-${time}`}
            className="flex items-start justify-end pr-2 text-[11px] text-gray-400 border-b border-gray-50"
            style={{ gridRow: slotIdx + 1, gridColumn: 1 }}
          >
            {!isHalfHour(time) && <span className="translate-y-[-6px]">{time}</span>}
          </div>
        ))}

        {groomers.map((groomer, groomerIdx) => {
          const apts = groomerAppointments.get(groomer.id) ?? []
          const occupiedSlots = new Set<number>()

          return timeSlots.map((time, slotIdx) => {
            if (occupiedSlots.has(slotIdx)) return null

            const apt = apts.find((a) => {
              const startSlot = getSlotIndex(a.startTime)
              return startSlot === slotIdx
            })

            if (apt) {
              const span = getSpanSlots(apt.estimatedDuration)
              for (let i = 0; i < span; i++) {
                occupiedSlots.add(slotIdx + i)
              }

              return (
                <div
                  key={`${groomer.id}-${time}`}
                  className="px-1 py-0.5 border-b border-gray-50 border-l border-gray-100"
                  style={{
                    gridRow: `${slotIdx + 1} / span ${span}`,
                    gridColumn: groomerIdx + 2,
                  }}
                >
                  <AppointmentCard appointment={apt} />
                </div>
              )
            }

            return (
              <div
                key={`${groomer.id}-${time}`}
                className="border-b border-gray-50 border-l border-gray-100 cursor-pointer hover:bg-brand-50/50 transition-colors"
                style={{
                  gridRow: slotIdx + 1,
                  gridColumn: groomerIdx + 2,
                }}
                onClick={() => onSlotClick?.(groomer.id, date, time)}
              />
            )
          })
        })}
      </div>
    </div>
  )
}
