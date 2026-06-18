import { useState, useMemo, useEffect } from 'react'
import { Calendar, Download, BarChart3, ClipboardList, UserX } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatDuration } from '@/utils/duration'
import { calculateWorkload, getNoShowRecords, exportToCSV } from '@/utils/export'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: toDateStr(monday), end: toDateStr(sunday) }
}

export default function ManagerPage() {
  const initSeed = useStore((s) => s.initSeed)
  const appointments = useStore((s) => s.appointments)
  const groomers = useStore((s) => s.groomers)
  const getPetById = useStore((s) => s.getPetById)
  const getOwnerById = useStore((s) => s.getOwnerById)
  const getGroomerById = useStore((s) => s.getGroomerById)

  const weekRange = useMemo(() => getWeekRange(), [])
  const [startDate, setStartDate] = useState(weekRange.start)
  const [endDate, setEndDate] = useState(weekRange.end)

  useEffect(() => {
    initSeed()
  }, [initSeed])

  const workloadData = useMemo(
    () => calculateWorkload(appointments, groomers, startDate, endDate),
    [appointments, groomers, startDate, endDate]
  )

  const noShowRecords = useMemo(
    () => getNoShowRecords(appointments, startDate, endDate),
    [appointments, startDate, endDate]
  )

  const summaryStats = useMemo(() => {
    const filtered = appointments.filter(
      (apt) => apt.date >= startDate && apt.date <= endDate && apt.status !== 'cancelled'
    )
    return {
      total: filtered.length,
      completed: filtered.filter((a) => a.status === 'completed').length,
      noShows: filtered.filter((a) => a.status === 'no-show').length,
    }
  }, [appointments, startDate, endDate])

  const maxDuration = useMemo(
    () => Math.max(...workloadData.map((w) => w.totalDuration), 1),
    [workloadData]
  )

  function handleExportWorkload() {
    const data = workloadData.map((w) => ({
      造型师: w.groomerName,
      总预约数: w.totalAppointments,
      总时长: formatDuration(w.totalDuration),
      已完成: w.completedCount,
      爽约: w.noShowCount,
    }))
    exportToCSV(data, `造型师工作量_${startDate}_${endDate}`)
  }

  function handleExportNoShows() {
    const data = noShowRecords.map((apt) => {
      const pet = getPetById(apt.petId)
      const owner = getOwnerById(apt.ownerId)
      const groomer = getGroomerById(apt.groomerId)
      return {
        日期: apt.date,
        宠物名: pet?.name ?? '',
        主人: owner?.name ?? '',
        电话: owner?.phone ?? '',
        造型师: groomer?.name ?? '',
        预约时间: apt.startTime,
      }
    })
    exportToCSV(data, `爽约记录_${startDate}_${endDate}`)
  }

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-500" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <span className="text-gray-400 text-sm">至</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-brand-500" />
            </div>
            <span className="text-sm text-gray-500">总预约数</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{summaryStats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-mint-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-mint-500" />
            </div>
            <span className="text-sm text-gray-500">已完成</span>
          </div>
          <p className="text-3xl font-bold text-mint-600">{summaryStats.completed}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-coral-50 flex items-center justify-center">
              <UserX className="w-5 h-5 text-coral-500" />
            </div>
            <span className="text-sm text-gray-500">爽约</span>
          </div>
          <p className="text-3xl font-bold text-coral-500">{summaryStats.noShows}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">造型师工作量</h3>
          <button
            onClick={handleExportWorkload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            导出工作量
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">造型师</th>
                <th className="text-center py-2 px-3 text-gray-500 font-medium">总预约数</th>
                <th className="text-center py-2 px-3 text-gray-500 font-medium">总时长</th>
                <th className="text-center py-2 px-3 text-gray-500 font-medium">已完成</th>
                <th className="text-center py-2 px-3 text-gray-500 font-medium">爽约</th>
              </tr>
            </thead>
            <tbody>
              {workloadData.map((w) => (
                <tr key={w.groomerId} className="border-b border-gray-50 hover:bg-paw-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{w.groomerName}</td>
                  <td className="py-2.5 px-3 text-center text-gray-700">{w.totalAppointments}</td>
                  <td className="py-2.5 px-3 text-center text-gray-700">{formatDuration(w.totalDuration)}</td>
                  <td className="py-2.5 px-3 text-center text-mint-600">{w.completedCount}</td>
                  <td className="py-2.5 px-3 text-center text-coral-500">{w.noShowCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <h4 className="text-xs font-medium text-gray-500 mb-3">工作时长对比</h4>
          <div className="flex flex-col gap-2.5">
            {workloadData.map((w) => {
              const pct = Math.round((w.totalDuration / maxDuration) * 100)
              return (
                <div key={w.groomerId} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-12 shrink-0 text-right">{w.groomerName}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-20 shrink-0">{formatDuration(w.totalDuration)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">爽约记录</h3>
          <button
            onClick={handleExportNoShows}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-coral-200 bg-coral-50 text-coral-600 hover:bg-coral-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            导出爽约记录
          </button>
        </div>

        {noShowRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">该时段暂无爽约记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">日期</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">宠物名</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">主人</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">电话</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">造型师</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">预约时间</th>
                </tr>
              </thead>
              <tbody>
                {noShowRecords.map((apt) => {
                  const pet = getPetById(apt.petId)
                  const owner = getOwnerById(apt.ownerId)
                  const groomer = getGroomerById(apt.groomerId)
                  return (
                    <tr key={apt.id} className="border-b border-gray-50 hover:bg-paw-50 transition-colors">
                      <td className="py-2.5 px-3 text-gray-700">{apt.date}</td>
                      <td className="py-2.5 px-3 text-gray-700">{pet?.name ?? '-'}</td>
                      <td className="py-2.5 px-3 text-gray-700">{owner?.name ?? '-'}</td>
                      <td className="py-2.5 px-3 text-gray-700">{owner?.phone ?? '-'}</td>
                      <td className="py-2.5 px-3 text-gray-700">{groomer?.name ?? '-'}</td>
                      <td className="py-2.5 px-3 text-gray-700">{apt.startTime}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
