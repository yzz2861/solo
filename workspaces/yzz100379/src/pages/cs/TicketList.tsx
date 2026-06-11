import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Eye,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Truck,
  Wrench,
} from 'lucide-react'
import { format } from 'date-fns'
import { useTicketStore } from '@/store/ticketStore'
import {
  STATUS_LABELS,
  URGENCY_LABELS,
  type WorkOrder,
  type WorkOrderStatus,
} from '@/shared/types'

const TABS: { key: 'all' | WorkOrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: '全部', icon: <Search className="w-4 h-4" /> },
  { key: 'pending', label: '待派发', icon: <Clock className="w-4 h-4" /> },
  { key: 'assigned', label: '已派发', icon: <Truck className="w-4 h-4" /> },
  { key: 'processing', label: '处理中', icon: <Wrench className="w-4 h-4" /> },
  { key: 'completed', label: '已完成', icon: <CheckCircle2 className="w-4 h-4" /> },
]

const statusColorMap: Record<WorkOrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  processing: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
}

const urgencyColorMap: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-orange-100 text-orange-700 border-orange-200',
  high: 'bg-red-100 text-red-700 border-red-200',
}

export default function TicketList() {
  const navigate = useNavigate()
  const { tickets, loading, fetchTickets } = useTicketStore()
  const [activeTab, setActiveTab] = useState<'all' | WorkOrderStatus>('all')
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    fetchTickets(activeTab === 'all' ? undefined : activeTab)
  }, [activeTab, fetchTickets])

  const filteredTickets = tickets.filter((t) => {
    if (!searchText.trim()) return true
    const q = searchText.trim().toLowerCase()
    const addr = [t.community, t.building, t.roomNumber].filter(Boolean).join(' ').toLowerCase()
    const status = STATUS_LABELS[t.status].toLowerCase()
    return (
      t.id.toLowerCase().includes(q) ||
      addr.includes(q) ||
      (t.problemType || '').toLowerCase().includes(q) ||
      status.includes(q) ||
      (t.assigneeName || '').toLowerCase().includes(q)
    )
  })

  const tabCounts = {
    all: tickets.length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    assigned: tickets.filter((t) => t.status === 'assigned').length,
    processing: tickets.filter((t) => t.status === 'processing').length,
    completed: tickets.filter((t) => t.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索小区 / 楼栋 / 房号 / 状态..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-slate-500">
              共 <span className="font-semibold text-slate-900">{filteredTickets.length}</span> 条工单
            </div>
          </div>
        </div>

        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Search className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">暂无工单数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    工单ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    地址
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    问题
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    紧急程度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    指派师傅
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((ticket: WorkOrder) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/cs/tickets/${ticket.id}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        #{ticket.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">
                        {ticket.community || '-'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {ticket.building ? `${ticket.building}栋` : ''}
                        {ticket.roomNumber ? ` ${ticket.roomNumber}室` : ''}
                        {!ticket.building && !ticket.roomNumber ? '-' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 max-w-[180px] truncate">
                      {ticket.problemType || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ticket.urgency ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium ${
                            urgencyColorMap[ticket.urgency]
                          }`}
                        >
                          {ticket.urgency === 'high' && (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {URGENCY_LABELS[ticket.urgency]}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium ${
                          statusColorMap[ticket.status]
                        }`}
                      >
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {ticket.assigneeName || (
                        <span className="text-slate-400">未指派</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {format(new Date(ticket.createdAt), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/cs/tickets/${ticket.id}`)
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
