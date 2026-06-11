import { useState, useEffect } from 'react'
import {
  Search,
  Eye,
  FileDown,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Truck,
  Wrench,
  X,
  FileText,
  History,
  Quote,
  AlertCircle,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { useTicketStore } from '@/store/ticketStore'
import { api } from '@/api/client'
import {
  STATUS_LABELS,
  URGENCY_LABELS,
  SUSPICION_TYPE_LABELS,
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

const FIELD_LABELS: Record<string, string> = {
  community: '小区',
  building: '楼栋',
  roomNumber: '房号',
  problemType: '问题类型',
  urgency: '紧急程度',
  callbackSentence: '回访句子',
  suspicionTags: '疑点标记',
  isConfirmed: '确认状态',
  assigneeId: '指派师傅',
  shortMessage: '派单语',
  status: '状态',
}

export default function ExportCenter() {
  const { tickets, loading, fetchTickets } = useTicketStore()
  const [activeTab, setActiveTab] = useState<'all' | WorkOrderStatus>('all')
  const [searchText, setSearchText] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<WorkOrder | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loadingTicket, setLoadingTicket] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchTickets(activeTab === 'all' ? undefined : activeTab)
  }, [activeTab, fetchTickets])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

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

  const handleViewFull = async (ticketId: string) => {
    setLoadingTicket(true)
    try {
      const data = await api.getTicket(ticketId)
      setSelectedTicket(data)
      setShowModal(true)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '加载工单详情失败')
    } finally {
      setLoadingTicket(false)
    }
  }

  const handleExport = async (ticketId: string) => {
    setExporting(ticketId)
    try {
      const ticketDetail = await api.getTicket(ticketId)
      const exportData = {
        ...ticketDetail,
        exportedAt: new Date().toISOString(),
        exportedBy: 'admin',
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ticket-${ticketId}-${format(new Date(), 'yyyyMMdd-HHmm')}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast('success', '导出成功')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '导出失败')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl animate-pulse ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileDown className="w-5 h-5 text-indigo-600" />
                导出中心
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                查看完整工单数据，导出包含证据句和完整版本历史的 JSON 文件
              </p>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索小区 / 楼栋 / 房号 / 状态..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
              />
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
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key
                    ? 'bg-indigo-100 text-indigo-700'
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
                    className="hover:bg-indigo-50/30 transition-colors"
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewFull(ticket.id)}
                          disabled={loadingTicket && exporting === ticket.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          查看完整
                        </button>
                        <button
                          onClick={() => handleExport(ticket.id)}
                          disabled={exporting === ticket.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-slate-300 disabled:to-slate-300 rounded-lg transition-all shadow-sm hover:shadow"
                        >
                          {exporting === ticket.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          导出
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  完整工单详情
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  #{selectedTicket.id}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedTicket(null)
                }}
                className="p-2 hover:bg-white/60 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              <section className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">基本信息</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">小区</span>
                    <span className="text-slate-900 font-medium">
                      {selectedTicket.community || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">楼栋</span>
                    <span className="text-slate-900 font-medium">
                      {selectedTicket.building || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">房号</span>
                    <span className="text-slate-900 font-medium">
                      {selectedTicket.roomNumber || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">问题类型</span>
                    <span className="text-slate-900 font-medium">
                      {selectedTicket.problemType || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">紧急程度</span>
                    <span className="text-slate-900 font-medium">
                      {selectedTicket.urgency
                        ? URGENCY_LABELS[selectedTicket.urgency]
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">状态</span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded border text-xs font-medium ${
                        statusColorMap[selectedTicket.status]
                      }`}
                    >
                      {STATUS_LABELS[selectedTicket.status]}
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> 原文记录
                </h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.sourceText}
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> 疑点标记
                </h3>
                {selectedTicket.suspicionTags?.length === 0 ? (
                  <p className="text-sm text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center">
                    无
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedTicket.suspicionTags?.map((tag) => (
                      <div
                        key={tag.id}
                        className={`p-3 rounded-xl border ${
                          tag.resolved
                            ? 'bg-green-50 border-green-200'
                            : 'bg-amber-50/50 border-amber-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-slate-700 text-white text-xs rounded-md font-medium">
                            {SUSPICION_TYPE_LABELS[tag.type]}
                          </span>
                          {tag.resolved ? (
                            <span className="text-xs text-green-600 font-medium">
                              ✓ 已确认
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium">
                              ⚠️ 待确认
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          原文：<code>{tag.sourceText}</code>
                        </p>
                        <p className="text-xs text-slate-600 mt-1">{tag.description}</p>
                        {tag.resolverNote && (
                          <p className="text-xs text-green-700 mt-1">
                            备注：{tag.resolverNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Quote className="w-4 h-4" /> 证据句
                </h3>
                {selectedTicket.evidenceSentences?.length === 0 ? (
                  <p className="text-sm text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center">
                    无
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedTicket.evidenceSentences?.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <p className="text-xs text-slate-500 mb-1">
                          字段：{FIELD_LABELS[ev.field] || ev.field}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block mb-1">原文</span>
                            <span className="text-slate-500 line-through block bg-white px-2 py-1 rounded border border-slate-200">
                              {ev.original}
                            </span>
                          </div>
                          <div>
                            <span className="text-green-600 block mb-1">修正后</span>
                            <span className="text-slate-900 block bg-green-50 px-2 py-1 rounded border border-green-200">
                              {ev.corrected || '（无）'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" /> 版本历史（
                  {selectedTicket.versionHistory?.length || 0}）
                </h3>
                {selectedTicket.versionHistory?.length === 0 ? (
                  <p className="text-sm text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center">
                    无变更记录
                  </p>
                ) : (
                  <ol className="relative border-l-2 border-slate-100 ml-3 space-y-3">
                    {selectedTicket.versionHistory?.map((entry) => (
                      <li key={entry.id} className="ml-5">
                        <div className="absolute -left-[6px] w-3 h-3 rounded-full bg-indigo-500 border-3 border-white shadow" />
                        <div className="p-3 bg-white rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-900">
                              {entry.editorName}
                            </span>
                            <span className="text-xs text-slate-400">
                              {format(
                                new Date(entry.timestamp),
                                'yyyy-MM-dd HH:mm:ss'
                              )}
                            </span>
                          </div>
                          {Object.entries(entry.changes).map(([field, change]) => (
                            <div key={field} className="text-xs flex gap-2 mb-1">
                              <span className="text-slate-500 min-w-[70px]">
                                {FIELD_LABELS[field] || field}:
                              </span>
                              <span className="text-slate-500 line-through">
                                {JSON.stringify(change.old)}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="text-green-600 font-medium">
                                {JSON.stringify(change.new)}
                              </span>
                            </div>
                          ))}
                          {entry.note && (
                            <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-50">
                              备注：{entry.note}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                导出的 JSON 文件将包含上述所有完整数据
              </p>
              <button
                onClick={() => handleExport(selectedTicket.id)}
                disabled={exporting === selectedTicket.id}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-slate-300 disabled:to-slate-300 rounded-xl transition-all shadow-sm hover:shadow font-medium"
              >
                {exporting === selectedTicket.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                导出 JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
