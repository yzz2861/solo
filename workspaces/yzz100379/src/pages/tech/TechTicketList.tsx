import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Inbox } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import {
  formatAddress,
  formatShortMessage,
  formatDateTime,
  getUrgencyColor,
} from '@/utils/formatters'
import type { WorkOrder, WorkOrderStatus, UrgencyLevel } from '../../../shared/types'
import { URGENCY_LABELS, STATUS_LABELS } from '../../../shared/types'

type StatusFilter = 'all' | 'assigned' | 'processing' | 'completed'

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'assigned', label: '待处理' },
  { key: 'processing', label: '处理中' },
  { key: 'completed', label: '已完成' },
]

const MOCK_TICKETS: WorkOrder[] = [
  {
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
  },
  {
    id: 'ticket-002',
    sourceText: '客厅的灯坏了，开不亮',
    community: '翠湖小区',
    building: '12栋',
    roomNumber: '1506室',
    problemType: '灯具损坏',
    urgency: 'medium',
    callbackSentence: null,
    suspicionTags: [],
    isConfirmed: true,
    status: 'processing',
    assigneeId: 'tech-001',
    assigneeName: '张师傅',
    dispatcherId: 'cs-002',
    dispatcherName: '王客服',
    shortMessage: '客厅灯具损坏不亮',
    evidenceSentences: [],
    versionHistory: [],
    createdAt: '2024-01-15T08:15:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'ticket-003',
    sourceText: '家里门锁坏了，开不开门',
    community: '江南华府',
    building: '3栋',
    roomNumber: '801室',
    problemType: '门锁损坏',
    urgency: 'high',
    callbackSentence: '住户在门外等待，请火速前往',
    suspicionTags: [],
    isConfirmed: true,
    status: 'assigned',
    assigneeId: 'tech-001',
    assigneeName: '张师傅',
    dispatcherId: 'cs-001',
    dispatcherName: '李客服',
    shortMessage: '【紧急】门锁损坏，住户在门外',
    evidenceSentences: [],
    versionHistory: [],
    createdAt: '2024-01-15T10:20:00Z',
    updatedAt: '2024-01-15T10:22:00Z',
  },
  {
    id: 'ticket-004',
    sourceText: '马桶堵了，水下不去',
    community: '阳光花园',
    building: '7栋',
    roomNumber: '203室',
    problemType: '下水道堵塞',
    urgency: 'low',
    callbackSentence: null,
    suspicionTags: [],
    isConfirmed: true,
    status: 'completed',
    assigneeId: 'tech-001',
    assigneeName: '张师傅',
    dispatcherId: 'cs-003',
    dispatcherName: '赵客服',
    shortMessage: '马桶堵塞疏通',
    evidenceSentences: [],
    versionHistory: [],
    createdAt: '2024-01-14T14:00:00Z',
    updatedAt: '2024-01-14T16:30:00Z',
  },
  {
    id: 'ticket-005',
    sourceText: '热水器出不了热水',
    community: '翠湖小区',
    building: '8栋',
    roomNumber: '605室',
    problemType: '热水器故障',
    urgency: 'medium',
    callbackSentence: '老人在家，请温柔沟通',
    suspicionTags: [],
    isConfirmed: true,
    status: 'completed',
    assigneeId: 'tech-001',
    assigneeName: '张师傅',
    dispatcherId: 'cs-001',
    dispatcherName: '李客服',
    shortMessage: '热水器不出热水',
    evidenceSentences: [],
    versionHistory: [],
    createdAt: '2024-01-13T11:00:00Z',
    updatedAt: '2024-01-13T14:00:00Z',
  },
]

export default function TechTicketList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlFilter = searchParams.get('filter')
  const bottomTabActive = urlFilter === 'completed' ? 'completed' : 'pending'

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    if (urlFilter === 'completed') return 'completed'
    return 'all'
  })
  const [tickets, setTickets] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  const staff = useAuthStore((s) => s.staff)

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true)
      try {
        if (staff) {
          const data = await api.getTechTickets(staff.id)
          if (Array.isArray(data) && data.length > 0) {
            setTickets(data)
          } else {
            setTickets(MOCK_TICKETS)
          }
        } else {
          setTickets(MOCK_TICKETS)
        }
      } catch {
        setTickets(MOCK_TICKETS)
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [staff])

  useEffect(() => {
    if (urlFilter === 'completed') {
      setStatusFilter('completed')
    }
  }, [urlFilter])

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'all') return t.status !== 'pending'
    return t.status === statusFilter
  })

  const handleTicketClick = (id: string) => {
    navigate(`/tech/my-tickets/${id}`)
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => {
          const active = statusFilter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'flex-shrink-0 h-10 px-4 rounded-full text-sm font-medium transition-all',
                active
                  ? 'bg-[#1e40af] text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 active:bg-gray-50'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="pt-2 pb-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500 text-base">加载中...</div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Inbox className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-base font-medium">暂无派单</p>
            <p className="text-gray-400 text-sm mt-1">有新工单时会在这里显示</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => handleTicketClick(ticket.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TicketCard({
  ticket,
  onClick,
}: {
  ticket: WorkOrder
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl shadow-sm active:bg-gray-50 active:scale-[0.99] transition-all overflow-hidden border border-gray-100"
      style={{ minHeight: '128px' }}
    >
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold',
                getUrgencyColor(ticket.urgency)
              )}
            >
              {ticket.urgency ? URGENCY_LABELS[ticket.urgency] : '普通'}
            </span>
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium',
                getStatusBadgeColor(ticket.status)
              )}
            >
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
        </div>

        <div className="mb-3 flex-1">
          <h3 className="text-[18px] font-bold text-gray-900 leading-snug line-clamp-2">
            {formatShortMessage(ticket)}
          </h3>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm text-gray-500 line-clamp-1">
            📍 {formatAddress(ticket)}
          </p>
          <p className="text-xs text-gray-400">
            ⏰ {formatDateTime(ticket.createdAt)}
          </p>
        </div>
      </div>
    </button>
  )
}

function getStatusBadgeColor(status: WorkOrderStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-600'
    case 'assigned':
      return 'bg-orange-50 text-orange-600 border border-orange-200'
    case 'processing':
      return 'bg-blue-50 text-blue-600 border border-blue-200'
    case 'completed':
      return 'bg-green-50 text-green-600 border border-green-200'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}
