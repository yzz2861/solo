import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  ArrowRight,
  Loader2,
  FileText,
  Lightbulb,
} from 'lucide-react'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import {
  PROBLEM_TYPES,
  SUSPICION_TYPE_LABELS,
  URGENCY_LABELS,
  type WorkOrder,
  type Staff,
  type UrgencyLevel,
  type SuspicionTag,
} from '@/shared/types'

const SAMPLE_TEXTS = [
  '喂，物业吗？我是幸福小区3栋2单元1502室的老王啊，家里厨房水管漏水漏得厉害，你们赶紧派人来修一下嘛，急死人了！',
  '你好，我住阳光花园B区5栋8楼803，我家客厅的灯不亮了，还有那个门禁也打不开，麻烦师傅过来看看。我姓陈。',
  '师傅啊，我是锦绣家园12栋101的张阿姨，厕所下水道堵起了，臭得遭不住，快点来哈！',
]

export default function Workbench() {
  const navigate = useNavigate()
  const staff = useAuthStore((s) => s.staff)

  const [sourceText, setSourceText] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [ticket, setTicket] = useState<WorkOrder | null>(null)
  const [techs, setTechs] = useState<Staff[]>([])
  const [selectedTechId, setSelectedTechId] = useState('')
  const [shortMessage, setShortMessage] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [suspicionNotes, setSuspicionNotes] = useState<Record<string, string>>({})
  const [suspicionChecked, setSuspicionChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    api.getTechs().then(setTechs).catch(() => {})
  }, [])

  useEffect(() => {
    if (ticket) {
      const parts: string[] = []
      if (ticket.urgency) {
        const urgencyLabel = URGENCY_LABELS[ticket.urgency]
        if (ticket.urgency !== 'low') {
          parts.push(`【${urgencyLabel}】`)
        }
      }
      const addr = [ticket.community, ticket.building, ticket.roomNumber]
        .filter(Boolean)
        .join(' ')
      if (addr) parts.push(addr)
      if (ticket.problemType) parts.push(ticket.problemType)
      setShortMessage(parts.join(' - '))
    }
  }, [ticket])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleExtract = async () => {
    if (!sourceText.trim()) {
      showToast('error', '请输入报修内容')
      return
    }
    setIsExtracting(true)
    try {
      const data = await api.createTicket(sourceText.trim())
      setTicket(data)
      const notes: Record<string, string> = {}
      const checked: Record<string, boolean> = {}
      data.suspicionTags?.forEach((tag) => {
        notes[tag.id] = ''
        checked[tag.id] = false
      })
      setSuspicionNotes(notes)
      setSuspicionChecked(checked)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '智能提取失败')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleUpdateField = async (updates: Partial<WorkOrder>) => {
    if (!ticket || !staff) return
    try {
      const updated = await api.updateTicket(ticket.id, {
        ...updates,
        editorId: staff.id,
        editorName: staff.name,
      })
      setTicket(updated)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '更新失败')
    }
  }

  const handleConfirmAll = async () => {
    if (!ticket || !staff) return
    const unresolvedTags = ticket.suspicionTags
      .filter((tag) => !tag.resolved)
      .map((tag) => {
        const note = suspicionNotes[tag.id]?.trim()
        const checked = suspicionChecked[tag.id]
        return {
          ...tag,
          resolved: checked || note ? true : tag.resolved,
          resolverNote: note || tag.resolverNote,
        }
      })
    try {
      const updated = await api.updateTicket(ticket.id, {
        suspicionTags: unresolvedTags,
        isConfirmed: true,
        editorId: staff.id,
        editorName: staff.name,
        note: '客服核对疑点完毕',
      })
      setTicket(updated)
      showToast('success', '已确认所有疑点')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '确认失败')
    }
  }

  const handleAssign = async () => {
    if (!ticket || !staff) return
    if (!selectedTechId) {
      showToast('error', '请选择维修师傅')
      return
    }
    if (!shortMessage.trim()) {
      showToast('error', '请输入派单语')
      return
    }
    setIsAssigning(true)
    try {
      const updated = await api.assignTicket(ticket.id, {
        assigneeId: selectedTechId,
        shortMessage: shortMessage.trim(),
        dispatcherId: staff.id,
        dispatcherName: staff.name,
      })
      setTicket(updated)
      showToast('success', '派单成功！')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '派单失败')
    } finally {
      setIsAssigning(false)
    }
  }

  const urgencyButtons: { value: UrgencyLevel; label: string; activeClass: string; hoverClass: string }[] = [
    { value: 'low', label: '普通', activeClass: 'bg-slate-500 text-white border-slate-500', hoverClass: 'hover:bg-slate-100 hover:border-slate-300' },
    { value: 'medium', label: '较急', activeClass: 'bg-amber-500 text-white border-amber-500', hoverClass: 'hover:bg-amber-50 hover:border-amber-300' },
    { value: 'high', label: '紧急', activeClass: 'bg-red-500 text-white border-red-500', hoverClass: 'hover:bg-red-50 hover:border-red-300' },
  ]

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

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                📋 报修录入
              </h2>
              <span className="text-xs text-slate-400">
                支持粘贴转写文本
              </span>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="粘贴录音转写文本，或输入人工记录的摘要..."
                rows={10}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm leading-relaxed placeholder-slate-400"
              />
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>快捷示例：</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_TEXTS.map((text, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSourceText(text)}
                      className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg transition-all truncate max-w-[200px]"
                      title={text}
                    >
                      示例 {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleExtract}
                disabled={isExtracting || !sourceText.trim()}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 flex items-center justify-center gap-2 text-base"
              >
                {isExtracting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {isExtracting ? '智能提取中...' : '✨ 智能提取'}
              </button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-blue-100/80 bg-blue-50/60">
              <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                智能提取结果
              </h2>
            </div>
            <div className="p-6">
              {!ticket ? (
                <div className="py-16 text-center text-slate-400">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p className="text-sm">请先在左侧录入报修内容并点击智能提取</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      小区
                    </label>
                    <input
                      type="text"
                      value={ticket.community || ''}
                      onChange={(e) =>
                        setTicket({ ...ticket, community: e.target.value || null })
                      }
                      onBlur={(e) =>
                        handleUpdateField({
                          community: e.target.value || null,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        楼栋
                      </label>
                      <input
                        type="text"
                        value={ticket.building || ''}
                        onChange={(e) =>
                          setTicket({ ...ticket, building: e.target.value || null })
                        }
                        onBlur={(e) =>
                          handleUpdateField({
                            building: e.target.value || null,
                          })
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        房号
                      </label>
                      <input
                        type="text"
                        value={ticket.roomNumber || ''}
                        onChange={(e) =>
                          setTicket({ ...ticket, roomNumber: e.target.value || null })
                        }
                        onBlur={(e) =>
                          handleUpdateField({
                            roomNumber: e.target.value || null,
                          })
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      问题类型
                    </label>
                    <select
                      value={ticket.problemType || ''}
                      onChange={(e) =>
                        handleUpdateField({
                          problemType: e.target.value || null,
                        })
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                    >
                      <option value="">请选择问题类型</option>
                      {PROBLEM_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      紧急程度
                    </label>
                    <div className="flex gap-2">
                      {urgencyButtons.map((btn) => (
                        <button
                          key={btn.value}
                          onClick={() => handleUpdateField({ urgency: btn.value })}
                          className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg border transition-all duration-200 ${
                            ticket.urgency === btn.value
                              ? btn.activeClass
                              : `bg-white text-slate-600 border-slate-200 ${btn.hoverClass}`
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                      placeholder="提取到的用户回访语句..."
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-amber-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/70">
              <h2 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                疑点标记区
                {ticket?.suspicionTags?.some((t) => !t.resolved) && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full font-normal">
                    待确认 {ticket.suspicionTags.filter((t) => !t.resolved).length}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {!ticket ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  暂无疑点数据
                </div>
              ) : ticket.suspicionTags.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-60" />
                  <p className="text-sm text-slate-500">太棒了！本次提取没有发现疑点 🎉</p>
                </div>
              ) : (
                <>
                  {ticket.suspicionTags.map((tag: SuspicionTag) => (
                    <div
                      key={tag.id}
                      className={`p-4 rounded-lg border transition-all ${
                        tag.resolved
                          ? 'bg-green-50 border-green-200'
                          : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-slate-700 text-white text-xs rounded-md font-medium">
                              {SUSPICION_TYPE_LABELS[tag.type]}
                            </span>
                            {!tag.resolved && (
                              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                ⚠️ 待确认
                              </span>
                            )}
                            {tag.resolved && (
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                已确认
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 mb-2">
                            原文片段：
                            <span className="text-slate-700 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
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
                      {!tag.resolved && (
                        <div className="space-y-2 pl-0">
                          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={suspicionChecked[tag.id] || false}
                              onChange={(e) =>
                                setSuspicionChecked({
                                  ...suspicionChecked,
                                  [tag.id]: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span>已回听确认</span>
                          </label>
                          <input
                            type="text"
                            value={suspicionNotes[tag.id] || ''}
                            onChange={(e) =>
                              setSuspicionNotes({
                                ...suspicionNotes,
                                [tag.id]: e.target.value,
                              })
                            }
                            placeholder="输入确认备注（如：已回听确认是3栋1502室）"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {ticket.suspicionTags.some((t) => !t.resolved) && (
                    <button
                      onClick={handleConfirmAll}
                      disabled={ticket.isConfirmed}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      ✅ 已核对无误
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-green-100/80 bg-green-50/60 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            工单派发
          </h2>
          <button
            onClick={() => navigate('/cs/tickets')}
            className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1 transition-colors"
          >
            查看工单列表
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          {!ticket ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              请先完成智能提取后再派单
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  维修师傅
                </label>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white"
                >
                  <option value="">请选择维修师傅</option>
                  {techs.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} ({tech.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  派单短信（自动生成，可编辑）
                </label>
                <input
                  type="text"
                  value={shortMessage}
                  onChange={(e) => setShortMessage(e.target.value)}
                  placeholder="派单语..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent font-mono"
                />
              </div>
              <div className="md:col-span-3 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  工单ID：<span className="font-mono text-slate-700">{ticket.id}</span>
                  <span className="mx-3">|</span>
                  状态：
                  <span
                    className={`font-medium ${
                      ticket.status === 'pending'
                        ? 'text-amber-600'
                        : ticket.status === 'assigned'
                        ? 'text-blue-600'
                        : ticket.status === 'processing'
                        ? 'text-purple-600'
                        : 'text-green-600'
                    }`}
                  >
                    {ticket.status === 'pending'
                      ? '待派发'
                      : ticket.status === 'assigned'
                      ? '已派发'
                      : ticket.status === 'processing'
                      ? '处理中'
                      : '已完成'}
                  </span>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={isAssigning || !selectedTechId || ticket.status !== 'pending'}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isAssigning ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {isAssigning ? '派发中...' : '提交派发'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
