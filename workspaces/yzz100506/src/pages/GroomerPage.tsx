import { useState, useMemo, useEffect } from 'react'
import {
  Calendar,
  ChevronDown,
  Clock,
  Dog,
  ShieldAlert,
  AlertTriangle,
  UserPlus,
  UserMinus,
  UserCheck,
  CheckCircle2,
  XCircle,
  Play,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import AlertBanner from '@/components/alerts/AlertBanner'
import StatusBadge from '@/components/shared/StatusBadge'
import { SERVICE_CATALOG, PERSONALITY_LABELS, SIZE_LABELS, STATUS_LABELS } from '@/types'
import type { PetPersonality, AppointmentStatus } from '@/types'
import { formatDuration, timeToMinutes } from '@/utils/duration'
import { getAlertsForAppointment } from '@/utils/alerts'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PERSONALITY_BADGE: Record<PetPersonality, { label: string; cls: string }> = {
  nervous: { label: PERSONALITY_LABELS.nervous, cls: 'bg-orange-100 text-orange-700 border-orange-300' },
  aggressive: { label: PERSONALITY_LABELS.aggressive, cls: 'bg-red-100 text-red-700 border-red-300' },
  active: { label: PERSONALITY_LABELS.active, cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  calm: { label: PERSONALITY_LABELS.calm, cls: 'bg-green-100 text-green-700 border-green-300' },
}

function getNextStatuses(current: AppointmentStatus): AppointmentStatus[] {
  switch (current) {
    case 'pending':
      return ['in-progress', 'no-show']
    case 'in-progress':
      return ['completed']
    default:
      return []
  }
}

export default function GroomerPage() {
  const initSeed = useStore((s) => s.initSeed)
  const groomers = useStore((s) => s.groomers)
  const assistants = useStore((s) => s.assistants)
  const getAppointmentsByGroomer = useStore((s) => s.getAppointmentsByGroomer)
  const getPetById = useStore((s) => s.getPetById)
  const getGroomerById = useStore((s) => s.getGroomerById)
  const updateAppointment = useStore((s) => s.updateAppointment)
  const appointments = useStore((s) => s.appointments)

  const [selectedGroomerId, setSelectedGroomerId] = useState(groomers[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [groomerDropdownOpen, setGroomerDropdownOpen] = useState(false)

  useEffect(() => {
    initSeed()
  }, [initSeed])

  const groomerAppointments = useMemo(
    () =>
      getAppointmentsByGroomer(selectedGroomerId, selectedDate).sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      ),
    [getAppointmentsByGroomer, selectedGroomerId, selectedDate]
  )

  const selectedGroomer = groomers.find((g) => g.id === selectedGroomerId)

  const appointmentAlerts = useMemo(
    () => groomerAppointments.flatMap((apt) => getAlertsForAppointment(apt, getPetById(apt.petId), appointments)),
    [groomerAppointments, getPetById, appointments]
  )

  function handleStatusChange(aptId: string, newStatus: AppointmentStatus) {
    updateAppointment(aptId, { status: newStatus })
  }

  function handleAddAssistant(aptId: string, assistantId: string) {
    const apt = groomerAppointments.find((a) => a.id === aptId)
    if (!apt || apt.assistants.includes(assistantId)) return
    updateAppointment(aptId, { assistants: [...apt.assistants, assistantId] })
  }

  function handleRemoveAssistant(aptId: string, assistantId: string) {
    const apt = groomerAppointments.find((a) => a.id === aptId)
    if (!apt) return
    updateAppointment(aptId, { assistants: apt.assistants.filter((id) => id !== assistantId) })
  }

  const assistantAssignments = useMemo(() => {
    const allAptsForDate = appointments.filter(
      (apt) => apt.date === selectedDate && apt.status !== 'cancelled'
    )
    return assistants.map((asst) => {
      const assigned = allAptsForDate.filter((apt) => apt.assistants.includes(asst.id))
      return { assistant: asst, appointments: assigned }
    })
  }, [assistants, appointments, selectedDate])

  function hasAdjacentNervousWarning(asstId: string): boolean {
    const asstEntry = assistantAssignments.find((a) => a.assistant.id === asstId)
    if (!asstEntry || asstEntry.appointments.length < 2) return false
    const sorted = [...asstEntry.appointments].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    )
    for (let i = 0; i < sorted.length - 1; i++) {
      const pet = getPetById(sorted[i].petId)
      const gap =
        timeToMinutes(sorted[i + 1].startTime) - timeToMinutes(sorted[i].endTime)
      if ((pet?.personality === 'nervous' || pet?.personality === 'aggressive') && gap <= 15) {
        return true
      }
    }
    return false
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setGroomerDropdownOpen(!groomerDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm"
          >
            <span className="text-lg">{selectedGroomer?.avatar}</span>
            <span className="font-medium text-gray-700">{selectedGroomer?.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {groomerDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
              {groomers.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGroomerId(g.id)
                    setGroomerDropdownOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-brand-50 transition-colors ${
                    g.id === selectedGroomerId ? 'bg-brand-50 font-medium' : ''
                  }`}
                >
                  <span className="text-lg">{g.avatar}</span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      </div>

      {appointmentAlerts.length > 0 && <AlertBanner alerts={appointmentAlerts} />}

      <div className="flex-1 min-h-0 flex gap-4">
        <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-y-auto pr-1">
          {groomerAppointments.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Dog className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>今日暂无预约</p>
              </div>
            </div>
          )}

          {groomerAppointments.map((apt) => {
            const pet = getPetById(apt.petId)
            const personalityBadge = pet ? PERSONALITY_BADGE[pet.personality] : null
            const nextStatuses = getNextStatuses(apt.status)
            const assignedAssistants = apt.assistants
              .map((id) => assistants.find((a) => a.id === id))
              .filter(Boolean)
            const needsExperienced =
              pet?.personality === 'nervous' || pet?.personality === 'aggressive'

            return (
              <div
                key={apt.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-brand-500" />
                      <span className="text-sm font-semibold text-gray-800">
                        {apt.startTime} - {apt.endTime}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({formatDuration(apt.estimatedDuration)})
                      </span>
                      <StatusBadge status={apt.status} />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-medium text-gray-800">{pet?.name}</span>
                      <span className="text-xs text-gray-500">{pet?.breed}</span>
                      {pet && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-paw-100 text-paw-400">
                          {SIZE_LABELS[pet.size]}
                        </span>
                      )}
                    </div>

                    {personalityBadge &&
                      pet?.personality !== 'calm' && (
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${personalityBadge.cls}`}
                          >
                            {personalityBadge.label}
                          </span>
                        </div>
                      )}

                    {pet?.biteWarning && (
                      <div className="flex items-center gap-1.5 mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-bold text-red-600">会咬人</span>
                      </div>
                    )}

                    {pet?.allergyNote && (
                      <div className="flex items-center gap-1.5 mb-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="text-xs text-orange-700">过敏: {pet.allergyNote}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {apt.services.map((svc) => {
                        const catalog = SERVICE_CATALOG.find((c) => c.type === svc.type)
                        return (
                          <span
                            key={svc.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700"
                          >
                            {catalog?.label ?? svc.type}
                          </span>
                        )
                      })}
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-gray-500 mb-2">{apt.notes}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">助理:</span>
                      {assignedAssistants.map((a) =>
                        a ? (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-mint-50 text-mint-600 border border-mint-200"
                          >
                            {a.name}
                            <button
                              onClick={() => handleRemoveAssistant(apt.id, a.id)}
                              className="hover:text-red-500 transition-colors"
                            >
                              <UserMinus className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null
                      )}
                      {assistants
                        .filter((a) => !apt.assistants.includes(a.id))
                        .map((a) => (
                          <button
                            key={a.id}
                            onClick={() => handleAddAssistant(apt.id, a.id)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors"
                          >
                            <UserPlus className="w-3 h-3" />
                            {a.name}
                          </button>
                        ))}
                      {needsExperienced && (
                        <span className="text-xs text-orange-600 font-medium ml-1">
                          建议安排有经验的助理
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    {nextStatuses.map((ns) => {
                      const icon =
                        ns === 'in-progress' ? (
                          <Play className="w-3.5 h-3.5" />
                        ) : ns === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )
                      const btnCls =
                        ns === 'in-progress'
                          ? 'bg-mint-50 text-mint-600 hover:bg-mint-100 border-mint-200'
                          : ns === 'completed'
                          ? 'bg-brand-50 text-brand-700 hover:bg-brand-100 border-brand-200'
                          : 'bg-coral-50 text-coral-500 hover:bg-coral-100 border-coral-200'
                      return (
                        <button
                          key={ns}
                          onClick={() => handleStatusChange(apt.id, ns)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${btnCls}`}
                        >
                          {icon}
                          {STATUS_LABELS[ns]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-500" />
            助理安排
          </h3>
          <div className="flex flex-col gap-3">
            {assistantAssignments.map(({ assistant, appointments: asstApts }) => {
              const hasWarning = hasAdjacentNervousWarning(assistant.id)
              return (
                <div key={assistant.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">{assistant.name}</span>
                    <span className="text-xs text-gray-400">
                      {asstApts.length} 个预约
                    </span>
                  </div>
                  {hasWarning && (
                    <div className="flex items-center gap-1 mb-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      <AlertTriangle className="w-3 h-3" />
                      相邻时段有紧张/攻击性宠物
                    </div>
                  )}
                  {asstApts.length === 0 ? (
                    <p className="text-xs text-gray-400">暂无安排</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {asstApts
                        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                        .map((apt) => {
                          const pet = getPetById(apt.petId)
                          const groomer = getGroomerById(apt.groomerId)
                          return (
                            <div
                              key={apt.id}
                              className="flex items-center gap-2 text-xs text-gray-600"
                            >
                              <span className="text-gray-400">
                                {apt.startTime}-{apt.endTime}
                              </span>
                              <span>{pet?.name}</span>
                              <span className="text-gray-400">({groomer?.name})</span>
                              {pet?.personality === 'nervous' && (
                                <span className="px-1 py-0.5 rounded bg-orange-100 text-orange-600 text-[10px]">
                                  紧张
                                </span>
                              )}
                              {pet?.personality === 'aggressive' && (
                                <span className="px-1 py-0.5 rounded bg-red-100 text-red-600 text-[10px]">
                                  攻击性
                                </span>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
