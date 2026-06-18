import { useNavigate } from 'react-router-dom'
import { Printer, ChevronLeft, Dog, Scissors, Clock, Truck, AlertTriangle, User, Phone } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { SIZE_LABELS, PERSONALITY_LABELS, SERVICE_CATALOG } from '@/types'
import { formatDuration } from '@/utils/duration'

interface HandoverCardProps {
  appointmentId: string
}

export default function HandoverCard({ appointmentId }: HandoverCardProps) {
  const navigate = useNavigate()
  const getPetById = useStore(s => s.getPetById)
  const getOwnerById = useStore(s => s.getOwnerById)
  const getGroomerById = useStore(s => s.getGroomerById)
  const appointments = useStore(s => s.appointments)

  const appointment = appointments.find(a => a.id === appointmentId)
  const pet = appointment ? getPetById(appointment.petId) : undefined
  const owner = appointment?.ownerId ? getOwnerById(appointment.ownerId) : undefined
  const groomer = appointment ? getGroomerById(appointment.groomerId) : undefined

  if (!appointment || !pet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-brand-600">
        <p className="text-lg">未找到预约信息</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">
          返回
        </button>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }

  const hasWarnings = pet.biteWarning || !pet.vaccinated || pet.allergyNote || pet.personality === 'aggressive' || pet.personality === 'nervous'

  return (
    <div>
      <div className="no-print flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-paw-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-brand-700" />
        </button>
        <h1 className="text-xl font-semibold text-brand-800 font-serif">交接卡</h1>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="btn-primary flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          打印
        </button>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          返回
        </button>
      </div>

      <div className="print-card bg-white p-6">
        <div className="text-center border-b-2 border-brand-400 pb-4 mb-4">
          <h2 className="text-2xl font-bold text-brand-700 font-serif">宠物美容洗护中心</h2>
          <p className="text-sm text-brand-500 mt-1">{formatDate(appointment.date)}</p>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-bold text-brand-600 border-b border-paw-200 pb-1 mb-2 flex items-center gap-1.5">
            <Dog className="w-4 h-4" />
            宠物信息
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div><span className="text-paw-400">名字：</span><span className="font-medium text-brand-800">{pet.name}</span></div>
            <div><span className="text-paw-400">品种：</span><span className="font-medium text-brand-800">{pet.breed}</span></div>
            <div><span className="text-paw-400">体型：</span><span className="font-medium text-brand-800">{SIZE_LABELS[pet.size]}</span></div>
            <div><span className="text-paw-400">体重：</span><span className="font-medium text-brand-800">{pet.weight}kg</span></div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-bold text-brand-600 border-b border-paw-200 pb-1 mb-2 flex items-center gap-1.5">
            <User className="w-4 h-4" />
            主人信息
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div><span className="text-paw-400">姓名：</span><span className="font-medium text-brand-800">{owner?.name ?? '-'}</span></div>
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-paw-400" />
              <span className="font-medium text-brand-800">{owner?.phone ?? '-'}</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-bold text-brand-600 border-b border-paw-200 pb-1 mb-2 flex items-center gap-1.5">
            <Scissors className="w-4 h-4" />
            服务项目
          </h3>
          <div className="space-y-1.5">
            {appointment.services.map(svc => {
              const catalog = SERVICE_CATALOG.find(c => c.type === svc.type)
              return (
                <div key={svc.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-brand-800">{catalog?.label ?? svc.type}</span>
                  <span className="text-brand-600">{formatDuration(svc.duration)}</span>
                </div>
              )
            })}
            <div className="flex items-center justify-between text-sm border-t border-paw-200 pt-1.5 mt-1.5">
              <span className="font-bold text-brand-700">总计</span>
              <span className="font-bold text-brand-700">{formatDuration(appointment.estimatedDuration)}</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-bold text-brand-600 border-b border-paw-200 pb-1 mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            时间安排
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div><span className="text-paw-400">造型师：</span><span className="font-medium text-brand-800">{groomer?.avatar} {groomer?.name ?? '-'}</span></div>
            <div><span className="text-paw-400">时间段：</span><span className="font-medium text-brand-800">{appointment.startTime} - {appointment.endTime}</span></div>
          </div>
        </div>

        {hasWarnings && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-coral-500 border-b border-coral-200 pb-1 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              特别注意
            </h3>
            <div className="space-y-1.5 text-sm">
              {pet.biteWarning && (
                <p className="text-coral-600 font-medium">* 有咬人记录，请做好防护</p>
              )}
              {!pet.vaccinated && (
                <p className="text-amber-600 font-medium">* 未接种疫苗</p>
              )}
              {pet.allergyNote && (
                <p className="text-amber-600 font-medium">* 过敏：{pet.allergyNote}</p>
              )}
              {(pet.personality === 'aggressive' || pet.personality === 'nervous') && (
                <p className="text-amber-600 font-medium">* 性格：{PERSONALITY_LABELS[pet.personality]}</p>
              )}
            </div>
          </div>
        )}

        {appointment.needsPickup && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-brand-600 border-b border-paw-200 pb-1 mb-2 flex items-center gap-1.5">
              <Truck className="w-4 h-4" />
              接送信息
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {appointment.pickupTime && (
                <div><span className="text-paw-400">接送时间：</span><span className="font-medium text-brand-800">{appointment.pickupTime}</span></div>
              )}
              {appointment.pickupAddress && (
                <div><span className="text-paw-400">接送地址：</span><span className="font-medium text-brand-800">{appointment.pickupAddress}</span></div>
              )}
            </div>
          </div>
        )}

        {appointment.notes && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-brand-600 border-b border-paw-200 pb-1 mb-2">
              备注
            </h3>
            <p className="text-sm text-brand-700">{appointment.notes}</p>
          </div>
        )}

        <div className="border-t-2 border-paw-200 pt-4 mt-6">
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <span className="text-paw-400">主人签字：</span>
              <div className="border-b border-brand-300 h-8 mt-1" />
            </div>
            <div>
              <span className="text-paw-400">造型师签字：</span>
              <div className="border-b border-brand-300 h-8 mt-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
