import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/api/client'
import {
  MapPin,
  Phone,
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
  PlayCircle,
  MessageCircle,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatAddress,
  formatShortMessage,
  formatDateTime,
  getUrgencyBgColor,
  getUrgencyColor,
} from '@/utils/formatters'
import type { WorkOrder, WorkOrderStatus } from '../../../shared/types'
import { URGENCY_LABELS, STATUS_LABELS } from '../../../shared/types'

const MOCK_TICKET: WorkOrder = {
  id: 'ticket-001',
  sourceText: '我们家厨房水管漏水很严重，赶紧派人来修一下',
  community: '阳光花园',
  building: '5栋',
  roomNumber: '302室',
  problemType: '水管漏水',
  urgency: 'high',
  callbackSentence: '请上门前先打电话联系，家中白天有人',
  suspicionTags: [],
  isConfirmed: true,
  status: 'assigned',
  assigneeId: 'tech-001',
  assigneeName: '张师傅',
  dispatcherId: 'cs-001',
  dispatcherName: '李客服',
  shortMessage: '厨房水管漏水严重，请尽快处理',
  evidenceSentences: [],
  versionHistory: [],
  createdAt: '2024-01-15T09:30:00Z',
  updatedAt: '2024-01-15T09:35:00Z',
}

export default function TechTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchTicket = async () => {
      if (!id) return
      setLoading(true)
      try {
        const data = await api.getTicket(id)
        setTicket(data)
      } catch {
        setTicket(MOCK_TICKET)
      } finally {
        setLoading(false)
      }
    }
    fetchTicket()
  }, [id])

  const staff = useAuthStore((s) => s.staff)

  const updateStatus = async (newStatus: WorkOrderStatus) => {
    if (!ticket || actionLoading || !staff) return
    setActionLoading(true)
    try {
      const updated = await api.updateTicketStatus(
        ticket.id,
        newStatus,
        staff.id,
        staff.name
      )
      setTicket(updated)
    } catch {
      setTicket({ ...ticket, status: newStatus })
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartProcessing = () => {
    updateStatus('processing')
  }

  const handleComplete = () => {
    updateStatus('completed')
  }

  const handleContactCS = () => {
    alert('正在联系客服...')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 text-base">加载中...</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 text-base font-medium">工单不存在</p>
        <button
          onClick={() => navigate('/tech/my-tickets')}
          className="mt-6 h-11 px-6 rounded-lg bg-[#1e40af] text-white text-base font-medium active:bg-[#1e3a8a]"
        >
          返回列表
        </button>
      </div>
    )
  }

  const urgency = ticket.urgency || 'low'

  return (
    <>
      <div className="pb-[140px]">
        <div
          className={cn(
            'mx-4 mt-4 p-4 rounded-xl border-2 flex items-center gap-3',
            getUrgencyBgColor(urgency)
          )}
        >
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              getUrgencyColor(urgency)
            )}
          >
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-70 font-medium">紧急程度</p>
            <p className="text-lg font-bold">
              {URGENCY_LABELS[urgency]}
              <span
                className={cn(
                  'ml-2 text-xs px-2 py-0.5 rounded-md',
                  getUrgencyColor(urgency)
                )}
              >
                {ticket.problemType || '维修'}
              </span>
            </p>
          </div>
        </div>

        <div className="mx-4 mt-5 p-5 bg-white rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-[24px] font-bold text-gray-900 leading-tight text-center">
            {formatShortMessage(ticket)}
          </h2>
          <div className="mt-4 flex items-center justify-center">
            <span
              className={cn(
                'inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold',
                getStatusBadgeStyle(ticket.status)
              )}
            >
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>
        </div>

        <div className="mx-4 mt-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#1e40af]" />
            <h3 className="text-base font-bold text-gray-900">地址信息</h3>
          </div>
          <div className="p-4 space-y-3">
            <InfoRow label="小区" value={ticket.community || '—'} />
            <InfoRow label="楼栋" value={ticket.building || '—'} />
            <InfoRow label="房号" value={ticket.roomNumber || '—'} last />
          </div>
        </div>

        {ticket.callbackSentence && (
          <div className="mx-4 mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800 mb-1">
                  💡 客服提示
                </p>
                <p className="text-[15px] text-amber-900 leading-relaxed">
                  {ticket.callbackSentence}
                </p>
              </div>
            </div>
          </div>
        )}

        {ticket.sourceText && ticket.sourceText !== ticket.shortMessage && (
          <div className="mx-4 mt-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <h3 className="text-base font-bold text-gray-900">补充说明</h3>
            </div>
            <div className="p-4">
              <p className="text-[15px] text-gray-700 leading-relaxed">
                {ticket.sourceText}
              </p>
            </div>
          </div>
        )}

        <div className="mx-4 mt-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <User className="w-5 h-5 text-[#1e40af]" />
            <h3 className="text-base font-bold text-gray-900">派发信息</h3>
          </div>
          <div className="p-4 space-y-3">
            <InfoRow
              label="派单人"
              value={ticket.dispatcherName || '系统自动'}
            />
            <InfoRow
              label="派发时间"
              value={formatDateTime(ticket.createdAt)}
              last
            />
          </div>
        </div>

        <div className="mx-4 mt-4 mb-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <h3 className="text-base font-bold text-gray-900">时间线</h3>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">工单创建</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateTime(ticket.createdAt)}
                </p>
              </div>
            </div>
            {ticket.status !== 'pending' && (
              <div className="flex items-start gap-3 mt-4">
                <div className="w-3 h-3 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    已派单给 {ticket.assigneeName || '维修师傅'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDateTime(ticket.updatedAt)}
                  </p>
                </div>
              </div>
            )}
            {ticket.status === 'processing' && (
              <div className="flex items-start gap-3 mt-4">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    正在处理中
                  </p>
                </div>
              </div>
            )}
            {ticket.status === 'completed' && (
              <div className="flex items-start gap-3 mt-4">
                <div className="w-3 h-3 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">已完成</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDateTime(ticket.updatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 px-4 py-3 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {ticket.status === 'assigned' && (
          <button
            onClick={handleStartProcessing}
            disabled={actionLoading}
            className={cn(
              'w-full h-14 rounded-xl text-white text-lg font-bold shadow-lg transition-all active:scale-[0.98]',
              actionLoading
                ? 'bg-green-400'
                : 'bg-[#16a34a] active:bg-[#15803d]'
            )}
          >
            {actionLoading ? (
              '处理中...'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <PlayCircle className="w-6 h-6" />
                开始处理
              </span>
            )}
          </button>
        )}

        {ticket.status === 'processing' && (
          <div className="flex gap-3">
            <button
              onClick={handleContactCS}
              className="flex-shrink-0 w-16 h-14 rounded-xl bg-gray-100 text-gray-700 font-semibold flex flex-col items-center justify-center gap-0.5 active:bg-gray-200 transition-all"
            >
              <Phone className="w-5 h-5" />
              <span className="text-[11px]">客服</span>
            </button>
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className={cn(
                'flex-1 h-14 rounded-xl text-white text-lg font-bold shadow-lg transition-all active:scale-[0.98]',
                actionLoading
                  ? 'bg-blue-400'
                  : 'bg-[#3b82f6] active:bg-[#2563eb]'
              )}
            >
              {actionLoading ? (
                '提交中...'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  已完成
                </span>
              )}
            </button>
          </div>
        )}

        {ticket.status === 'completed' && (
          <div className="w-full h-14 rounded-xl bg-gray-200 text-gray-500 text-lg font-bold flex items-center justify-center cursor-not-allowed">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              ✓ 已完成
            </span>
          </div>
        )}

        {ticket.status === 'pending' && (
          <button
            onClick={() => navigate('/tech/my-tickets')}
            className="w-full h-14 rounded-xl bg-[#1e40af] text-white text-lg font-bold shadow-lg active:bg-[#1e3a8a] transition-all active:scale-[0.98]"
          >
            返回列表
          </button>
        )}
      </div>
    </>
  )
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4',
        !last && 'pb-3 border-b border-gray-50'
      )}
    >
      <span className="text-sm text-gray-500 flex-shrink-0 w-16 pt-0.5">
        {label}
      </span>
      <span className="text-base font-semibold text-gray-900 text-right flex-1 break-all">
        {value}
      </span>
    </div>
  )
}

function getStatusBadgeStyle(status: WorkOrderStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-700'
    case 'assigned':
      return 'bg-orange-100 text-orange-700'
    case 'processing':
      return 'bg-blue-100 text-blue-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
