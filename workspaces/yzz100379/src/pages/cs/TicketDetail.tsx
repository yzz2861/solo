import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Edit3,
  Clock,
  UserCheck,
  Send,
  AlertTriangle,
  CheckCircle2,
  FileText,
  History,
  Quote,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import {
  PROBLEM_TYPES,
  SUSPICION_TYPE_LABELS,
  URGENCY_LABELS,
  STATUS_LABELS,
  type WorkOrder,
  type Staff,
  type UrgencyLevel,
  type WorkOrderStatus,
} from '@/shared/types'

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

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const staff = useAuthStore((s) => s.staff)

  const [ticket, setTicket] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [techs, setTechs] = useState<Staff[]>([])
  const [selectedTechId, setSelectedTechId] = useState('')
  const [shortMessage, setShortMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([api.getTicket(id), api.getTechs().catch(() => [])])
      .then(([data, techList]) => {
        setTicket(data)
        setTechs(techList)
        if (data.assigneeId) setSelectedTechId(data.assigneeId)
        if (data.shortMessage) setShortMessage(data.shortMessage)
      })
      .catch((err) => {
        showToast('error', err instanceof Error ? err.message : '加载失败')
      })
      .finally(() => setLoading(false))
  }, [id])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUpdateField = async (updates: Partial<WorkOrder>) => {
    if (!ticket || !staff || !id) return
    setSaving(true)
    try {
      const updated = await api.updateTicket(id, {
        ...updates,
        editorId: staff.id,
        editorName: staff.name,
      })
      setTicket(updated)
      showToast('success', '更新成功')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async () => {
    if (!id || !staff) return
    if (!selectedTechId) {
      showToast('error', '请选择维修师傅')
      return
    }
    if (!shortMessage.trim()) {
      showToast('error', '请输入派单语')
      return
    }
    setAssigning(true)
    try {
      const updated = await api.assignTicket(id, {
        assigneeId: selectedTechId,
        shortMessage: shortMessage.trim(),
        dispatcherId: staff.id,
        dispatcherName: staff.name,
      })
      setTicket(updated)
      showToast('success', '派单成功')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '派单失败')
    } finally {
      setAssigning(false)
    }
  }

  const handleUpdateStatus = async (newStatus: WorkOrderStatus) => {
    if (!id || !staff) return
    setStatusSaving(true)
    try {
      const updated = await api.updateTicketStatus(
        id,
        newStatus,
        staff.id,
        staff.name
      )
      setTicket(updated)
      showToast('success', '状态更新成功')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '状态更新失败')
    } finally {
      setStatusSaving(false)
    }
  }

  const urgencyButtons: { value: UrgencyLevel; label: string; activeClass: string }[] = [
    { value: 'low', label: '普通', activeClass: 'bg-slate-500 text-white border-slate-500' },
    { value: 'medium', label: '较急', activeClass: 'bg-amber-500 text-white border-amber-500' },
    { value: 'high', label: '紧急', activeClass: 'bg-red-500 text-white border-red-500' },
  ]

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载工单详情...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <AlertCircle className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm">工单不存在</p>
      </div>
    )
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

      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">返回列表</span>
        </button>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            保存中...
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900">工单详情</h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-lg border text-sm font-medium ${
                  statusColorMap[ticket.status]
                }`}
              >
                {STATUS_LABELS[ticket.status]}
              </span>
              {ticket.urgency && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-lg border text-sm font-medium ${
                    urgencyColorMap[ticket.urgency]
                  }`}
                >
                  {ticket.urgency === 'high' && (
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  )}
                  {URGENCY_LABELS[ticket.urgency]}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              <span className="font-mono mr-3">#{ticket.id}</span>
              创建于 {format(new Date(ticket.createdAt), 'yyyy-MM-dd HH:mm')}
              {ticket.updatedAt !== ticket.createdAt && (
                <span className="ml-3">
                  · 更新于 {format(new Date(ticket.updatedAt), 'yyyy-MM-dd HH:mm')}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              基本信息（可编辑）
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  小区
                </label>
                <input
                  type="text"
                  value={ticket.community || ''}
                  onChange={(e) =>
                    setTicket({ ...ticket, community: e.target.value || null })
                  }
                  onBlur={(e) =>
                    handleUpdateField({ community: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  楼栋
                </label>
                <input
                  type="text"
                  value={ticket.building || ''}
                  onChange={(e) =>
                    setTicket({ ...ticket, building: e.target.value || null })
                  }
                  onBlur={(e) =>
                    handleUpdateField({ building: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  房号
                </label>
                <input
                  type="text"
                  value={ticket.roomNumber || ''}
                  onChange={(e) =>
                    setTicket({ ...ticket, roomNumber: e.target.value || null })
                  }
                  onBlur={(e) =>
                    handleUpdateField({ roomNumber: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  问题类型
                </label>
                <select
                  value={ticket.problemType || ''}
                  onChange={(e) =>
                    handleUpdateField({ problemType: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="">请选择</option>
                  {PROBLEM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  紧急程度
                </label>
                <div className="flex gap-1.5">
                  {urgencyButtons.map((btn) => (
                    <button
                      key={btn.value}
                      onClick={() => handleUpdateField({ urgency: btn.value })}
                      className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg border transition-all ${
                        ticket.urgency === btn.value
                          ? btn.activeClass
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  回访句子
                </label>
                <input
                  type="text"
                  value={ticket.callbackSentence || ''}
                  onChange={(e) =>
                    setTicket({
                      ...ticket,
                      callbackSentence: e.target.value || null,
                    })
                  }
                  onBlur={(e) =>
                    handleUpdateField({
                      callbackSentence: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              原文记录
            </h2>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {ticket.sourceText}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              疑点标记
              {ticket.suspicionTags?.some((t) => !t.resolved) && (
                <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full font-normal">
                  {ticket.suspicionTags.filter((t) => !t.resolved).length} 待确认
                </span>
              )}
            </h2>
            {ticket.suspicionTags?.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                本次提取未发现疑点
              </div>
            ) : (
              <div className="space-y-3">
                {ticket.suspicionTags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`p-4 rounded-lg border ${
                      tag.resolved
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-slate-700 text-white text-xs rounded-md font-medium">
                            {SUSPICION_TYPE_LABELS[tag.type]}
                          </span>
                          {tag.resolved ? (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> 已确认
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                              ⚠️ 待确认
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mb-1">
                          原文片段：
                          <span className="text-slate-700 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {tag.sourceText}
                          </span>
                        </p>
                        <p className="text-sm text-slate-600">{tag.description}</p>
                        {tag.resolverNote && (
                          <p className="text-xs text-green-700 mt-2 bg-green-100 px-2 py-1 rounded inline-block">
                            备注：{tag.resolverNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Quote className="w-4 h-4" />
              证据句
            </h2>
            {ticket.evidenceSentences?.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                暂无证据句
              </div>
            ) : (
              <div className="space-y-3">
                {ticket.evidenceSentences?.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="text-xs text-slate-500 mb-2">
                      字段：
                      <span className="font-medium text-slate-700">
                        {FIELD_LABELS[ev.field] || ev.field}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">原文</p>
                        <p className="text-sm text-slate-600 bg-white px-3 py-2 rounded border border-slate-200 line-through">
                          {ev.original}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 mb-1">修正后</p>
                        <p className="text-sm text-slate-900 bg-green-50 px-3 py-2 rounded border border-green-200 font-medium">
                          {ev.corrected || '（无需修正）'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <History className="w-4 h-4" />
              版本历史
            </h2>
            {ticket.versionHistory?.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                暂无变更记录
              </div>
            ) : (
              <ol className="relative border-l-2 border-slate-100 ml-3 space-y-5">
                {ticket.versionHistory?.map((entry) => (
                  <li key={entry.id} className="ml-6">
                    <div className="absolute -left-[7px] w-3.5 h-3.5 rounded-full bg-blue-500 border-4 border-white shadow" />
                    <div className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {entry.editorName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {entry.editorId}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(entry.changes).map(([field, change]) => (
                          <div
                            key={field}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span className="text-slate-500 min-w-[80px] flex-shrink-0">
                              {FIELD_LABELS[field] || field}:
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs line-through">
                                {JSON.stringify(change.old)}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                {JSON.stringify(change.new)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {entry.note && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs text-slate-500">
                            备注：
                            <span className="text-slate-700">{entry.note}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              派单与状态
            </h2>
            <div className="p-5 bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    指派维修师傅
                  </label>
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                    disabled={ticket.status !== 'pending'}
                  >
                    <option value="">请选择师傅</option>
                    {techs.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} ({tech.phone})
                      </option>
                    ))}
                  </select>
                  {ticket.assigneeName && (
                    <p className="text-xs text-green-600 mt-1.5">
                      当前：{ticket.assigneeName}
                      {ticket.assigneePhone && ` (${ticket.assigneePhone})`}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    派单短信
                  </label>
                  <input
                    type="text"
                    value={shortMessage}
                    onChange={(e) => setShortMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-mono"
                    disabled={ticket.status !== 'pending'}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  {ticket.dispatcherName && (
                    <p className="text-xs text-slate-500">
                      派发人：{ticket.dispatcherName}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ticket.status === 'pending' && (
                    <button
                      onClick={handleAssign}
                      disabled={assigning}
                      className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all text-sm"
                    >
                      {assigning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {assigning ? '派发中...' : '提交派发'}
                    </button>
                  )}
                  {ticket.status === 'assigned' && (
                    <button
                      onClick={() => handleUpdateStatus('processing')}
                      disabled={statusSaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-all text-sm"
                    >
                      {statusSaving && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      标记为处理中
                    </button>
                  )}
                  {ticket.status === 'processing' && (
                    <button
                      onClick={() => handleUpdateStatus('completed')}
                      disabled={statusSaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      标记为已完成
                    </button>
                  )}
                  {ticket.status === 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus('processing')}
                      disabled={statusSaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-500 hover:bg-slate-600 text-white font-medium rounded-xl transition-all text-sm"
                    >
                      重新打开
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
