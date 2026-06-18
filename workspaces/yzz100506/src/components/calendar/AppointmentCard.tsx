import { useNavigate } from 'react-router-dom'
import { Clock, Dog, Scissors, Truck, AlertTriangle, Printer, UserCheck, X } from 'lucide-react'
import type { Appointment } from '@/types'
import { SIZE_LABELS, PERSONALITY_LABELS, STATUS_LABELS } from '@/types'
import { useStore } from '@/store/useStore'
import { formatDuration } from '@/utils/duration'

const sizeStyles: Record<string, string> = {
  small: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  large: 'bg-red-100 text-red-700',
}

const statusBorder: Record<string, string> = {
  pending: 'border-l-brand-400',
  'in-progress': 'border-l-mint-400',
  completed: 'border-l-mint-300',
  'no-show': 'border-l-coral-400',
  cancelled: 'border-l-gray-400',
}

const serviceIcon: Record<string, typeof Scissors> = {
  wash: Dog,
  shave: Scissors,
  nail: Scissors,
  pickup: Truck,
}

interface AppointmentCardProps {
  appointment: Appointment
  compact?: boolean
}

export default function AppointmentCard({ appointment, compact = false }: AppointmentCardProps) {
  const navigate = useNavigate()
  const getPetById = useStore((s) => s.getPetById)
  const getGroomerById = useStore((s) => s.getGroomerById)
  const markEarlyArrival = useStore((s) => s.markEarlyArrival)
  const cancelEarlyArrival = useStore((s) => s.cancelEarlyArrival)

  const pet = getPetById(appointment.petId)
  const groomer = getGroomerById(appointment.groomerId)
  const isEarlyArrival = appointment.earlyArrival
  const canMarkArrival = appointment.status === 'pending'
  const arrivalRing = isEarlyArrival ? 'ring-2 ring-yellow-400 ring-offset-1 bg-yellow-50/40' : ''

  const p = compact ? 'px-2 py-1.5' : 'px-3 py-2.5'
  const textSize = compact ? 'text-xs' : 'text-sm'
  const nameSize = compact ? 'text-xs font-semibold' : 'text-sm font-semibold'

  return (
    <div
      className={`bg-white border border-gray-200 border-l-4 rounded-md ${statusBorder[appointment.status] ?? ''} ${p} shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative ${arrivalRing}`}
      onClick={() => navigate(`/booking/${appointment.id}`)}
    >
      {isEarlyArrival && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-2 -left-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900 text-[10px] font-bold shadow-sm animate-pulse"
          title={`${pet?.name ?? ''} 的主人已提前到店（${appointment.arrivedAt ?? ''}）`}
        >
          <UserCheck className="w-3 h-3" />
          等待中 {appointment.arrivedAt}
        </div>
      )}

      <div className="flex items-start justify-between gap-1 mt-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`${nameSize} truncate`}>{pet?.name ?? '未知'}</span>
          {pet && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${sizeStyles[pet.size]}`}>
              {SIZE_LABELS[pet.size]}
            </span>
          )}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-paw-100 text-brand-700">
            {STATUS_LABELS[appointment.status]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/handover/${appointment.id}`)
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-brand-50 transition-all"
            title="打印交接卡"
          >
            <Printer className="w-3.5 h-3.5 text-brand-500" />
          </button>
          {canMarkArrival && !isEarlyArrival && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                markEarlyArrival(appointment.id)
              }}
              className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-[10px] font-medium transition-all"
              title="标记主人已提前到店"
            >
              <UserCheck className="w-3 h-3" />
              到店
            </button>
          )}
          {isEarlyArrival && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                cancelEarlyArrival(appointment.id)
              }}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white hover:bg-gray-100 text-gray-500 text-[10px] font-medium border border-gray-200 transition-all"
              title="取消到店标记"
            >
              <X className="w-3 h-3" />
              取消
            </button>
          )}
          {pet?.biteWarning && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-medium shrink-0">
              <AlertTriangle className="w-3 h-3" />
              咬人
            </span>
          )}
        </div>
      </div>

      {!compact && pet?.breed && (
        <p className="text-xs text-gray-500 mt-0.5">{pet.breed}</p>
      )}

      <div className="flex items-center flex-wrap gap-1 mt-1">
        {appointment.services.map((svc) => {
          const Icon = serviceIcon[svc.type] ?? Scissors
          return <Icon key={svc.id} className="w-3.5 h-3.5 text-gray-400" />
        })}
        <span className={`flex items-center gap-0.5 text-gray-500 ${textSize}`}>
          <Clock className="w-3 h-3" />
          {appointment.startTime}-{appointment.endTime}
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-1 mt-1">
        {groomer && (
          <span className={`flex items-center gap-1 text-gray-600 ${textSize}`}>
            <span className="text-sm">{groomer.avatar}</span>
            {groomer.name}
          </span>
        )}

        {pet?.allergyNote && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-medium">
            <AlertTriangle className="w-3 h-3" />
            过敏
          </span>
        )}

        {pet && (pet.personality === 'nervous' || pet.personality === 'aggressive') && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-medium">
            <AlertTriangle className="w-3 h-3" />
            {PERSONALITY_LABELS[pet.personality]}
          </span>
        )}

        {appointment.needsPickup && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-medium">
            <Truck className="w-3 h-3" />
            接送
          </span>
        )}
      </div>

      {!compact && (
        <p className="text-[10px] text-gray-400 mt-1">
          {formatDuration(appointment.estimatedDuration)}
        </p>
      )}
    </div>
  )
}
