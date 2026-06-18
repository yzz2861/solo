import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import AlertBanner from '@/components/alerts/AlertBanner'
import DayView from '@/components/calendar/DayView'
import WeekView from '@/components/calendar/WeekView'

type ViewMode = 'day' | 'week'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

function formatDateChinese(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const initSeed = useStore((s) => s.initSeed)
  const getAllAlertsForDate = useStore((s) => s.getAllAlertsForDate)

  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(() => toDateStr(new Date()))

  useEffect(() => {
    initSeed()
  }, [initSeed])

  const alerts = useMemo(() => getAllAlertsForDate(currentDate), [currentDate, getAllAlertsForDate])

  const weekStartDate = useMemo(() => {
    const monday = getMonday(new Date(currentDate + 'T00:00:00'))
    return toDateStr(monday)
  }, [currentDate])

  function goPrev() {
    const d = new Date(currentDate + 'T00:00:00')
    d.setDate(d.getDate() - (viewMode === 'day' ? 1 : 7))
    setCurrentDate(toDateStr(d))
  }

  function goNext() {
    const d = new Date(currentDate + 'T00:00:00')
    d.setDate(d.getDate() + (viewMode === 'day' ? 1 : 7))
    setCurrentDate(toDateStr(d))
  }

  function goToday() {
    setCurrentDate(toDateStr(new Date()))
  }

  function handleSlotClick(groomerId: string, date: string, time: string) {
    navigate(`/booking/new?groomerId=${groomerId}&date=${date}&time=${time}`)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 min-w-[140px] text-center">
            {viewMode === 'day'
              ? formatDateChinese(currentDate)
              : formatDateChinese(weekStartDate) + ' ~'}
          </h2>
          <button
            onClick={goNext}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            今天
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'day'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              日
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'week'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              周
            </button>
          </div>
          <button
            onClick={() => navigate('/booking/new')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建预约
          </button>
        </div>
      </div>

      {alerts.length > 0 && <AlertBanner alerts={alerts} />}

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 p-4 overflow-hidden">
        {viewMode === 'day' ? (
          <DayView date={currentDate} onSlotClick={handleSlotClick} />
        ) : (
          <WeekView startDate={weekStartDate} />
        )}
      </div>
    </div>
  )
}
