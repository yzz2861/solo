import { useState, useMemo, useCallback, Fragment } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { ChurnAnalysis, FollowUpTask } from '@/types'
import { cn } from '@/lib/utils'
import {
  UserX, Filter, Download, Eye, EyeOff, Shield, Phone,
  MessageSquare, CalendarPlus, Ban, RotateCcw, ChevronDown,
  ChevronUp, Search, AlertTriangle, X, Check,
} from 'lucide-react'

type RiskFilter = '全部' | '高风险' | '中风险' | '低风险' | '安全'

const RISK_MAP: Record<RiskFilter, ChurnAnalysis['riskLevel'] | null> = {
  '全部': null, '高风险': 'high', '中风险': 'medium', '低风险': 'low', '安全': 'safe',
}

const RISK_BADGE: Record<string, { cls: string; label: string }> = {
  high: { cls: 'bg-red-100 text-red-700', label: '高风险' },
  medium: { cls: 'bg-amber-100 text-amber-700', label: '中风险' },
  low: { cls: 'bg-yellow-100 text-yellow-700', label: '低风险' },
  safe: { cls: 'bg-green-100 text-green-700', label: '安全' },
}

const RISK_BAR_COLOR: Record<string, string> = {
  high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-yellow-500', safe: 'bg-green-500',
}

const EXCLUDE_REASONS = ['投诉未处理', '客户要求暂不打扰', '其他']

function maskPhone(phone: string) {
  if (phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

export default function ChurnListPage() {
  const {
    churnAnalyses, customers, followUpNotes: allNotes,
    complaints, consumptions, appointments, role,
    excludeCustomer, restoreCustomer, addFollowUpTask,
  } = useAppStore()

  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('全部')
  const [consultantFilter, setConsultantFilter] = useState('')
  const [showExcluded, setShowExcluded] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [excludeDropdownId, setExcludeDropdownId] = useState<string | null>(null)
  const [followUpId, setFollowUpId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [noteInput, setNoteInput] = useState('')

  const consultants = useMemo(() => [...new Set(churnAnalyses.map((a) => a.assignedConsultant))], [churnAnalyses])

  const filtered = useMemo(() => {
    return churnAnalyses.filter((a) => {
      if (!showExcluded && a.isExcluded) return false
      if (riskFilter !== '全部' && a.riskLevel !== RISK_MAP[riskFilter]) return false
      if (consultantFilter && a.assignedConsultant !== consultantFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return a.customerName.toLowerCase().includes(q) || a.customerPhone.includes(q)
      }
      return true
    })
  }, [churnAnalyses, search, riskFilter, consultantFilter, showExcluded])

  const handleExport = useCallback(() => {
    const headers = ['风险等级', '客户姓名', '手机号', '顾问', '最近到店', '间隔偏离度', '复购率', '爽约率', '风险分', '排除状态']
    const rows = filtered.map((a) => [
      RISK_BADGE[a.riskLevel].label,
      a.customerName,
      role === 'boss' ? maskPhone(a.customerPhone) : a.customerPhone,
      a.assignedConsultant,
      a.lastVisitDate,
      a.intervalDeviation.toFixed(2),
      a.repurchaseRate.toFixed(2),
      a.noShowRate.toFixed(2),
      a.riskScore.toFixed(1),
      a.isExcluded ? '已排除' : '',
    ])
    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `流失回访清单_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [filtered, role])

  const handleExclude = (id: string, reason: string) => {
    excludeCustomer(id, reason)
    setExcludeDropdownId(null)
  }

  const handleFollowUp = (customerId: string) => {
    if (!dueDate) return
    const task: FollowUpTask = {
      id: crypto.randomUUID(),
      customerId,
      consultantId: customers.find((c) => c.id === customerId)?.assignedConsultant ?? '',
      dueDate,
      status: 'pending',
      notes: noteInput || undefined,
      createdAt: new Date().toISOString(),
    }
    addFollowUpTask(task)
    setFollowUpId(null)
    setDueDate('')
    setNoteInput('')
  }

  const renderPhone = (phone: string) => role === 'boss' ? maskPhone(phone) : phone

  const renderNoteContent = (content: string) => {
    if (role === 'boss') return '[需权限查看]'
    if (role === 'consultant') return '****'
    return content
  }

  if (churnAnalyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 gap-3">
        <UserX className="w-12 h-12" />
        <p className="text-lg">请先导入数据</p>
      </div>
    )
  }

  return (
    <div className="bg-stone-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <UserX className="w-5 h-5 text-rose-600" />流失客户清单
          </h1>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-gray-50 transition">
            <Download className="w-4 h-4" />导出
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-4 border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索姓名或手机号" className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-500" />
            {(['全部', '高风险', '中风险', '低风险', '安全'] as RiskFilter[]).map((r) => (
              <button key={r} onClick={() => setRiskFilter(r)} className={cn('px-3 py-1.5 text-xs rounded-full transition', riskFilter === r ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {r}
              </button>
            ))}
          </div>
          <select value={consultantFilter} onChange={(e) => setConsultantFilter(e.target.value)} className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300">
            <option value="">全部顾问</option>
            {consultants.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setShowExcluded(!showExcluded)} className={cn('flex items-center gap-1 px-3 py-1.5 text-xs rounded-full transition', showExcluded ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {showExcluded ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}已排除
          </button>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="px-4 py-3 text-left font-medium">风险等级</th>
                <th className="px-4 py-3 text-left font-medium">客户姓名</th>
                <th className="px-4 py-3 text-left font-medium">手机号</th>
                <th className="px-4 py-3 text-left font-medium">顾问</th>
                <th className="px-4 py-3 text-left font-medium">最近到店</th>
                <th className="px-4 py-3 text-left font-medium">间隔偏离度</th>
                <th className="px-4 py-3 text-left font-medium">复购率</th>
                <th className="px-4 py-3 text-left font-medium">爽约率</th>
                <th className="px-4 py-3 text-left font-medium">风险分</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const isExpanded = expandedId === a.customerId
                const custComplaints = complaints.filter((c) => c.customerId === a.customerId)
                const custNotes = allNotes.filter((n) => n.customerId === a.customerId).slice(-3).reverse()
                const custConsumptions = consumptions.filter((c) => c.customerId === a.customerId).slice(-5).reverse()
                const custAppts = appointments.filter((ap) => ap.customerId === a.customerId)
                const apStats = {
                  completed: custAppts.filter((ap) => ap.status === 'completed').length,
                  no_show: custAppts.filter((ap) => ap.status === 'no_show').length,
                  cancelled: custAppts.filter((ap) => ap.status === 'cancelled').length,
                }

                return (
                  <Fragment key={a.customerId}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : a.customerId)}
                      className={cn('cursor-pointer border-t transition-colors hover:bg-gray-50', a.isExcluded && 'bg-red-50/60')}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', RISK_BADGE[a.riskLevel].cls)}>{RISK_BADGE[a.riskLevel].label}</span>
                          {a.isExcluded && <span className="px-1.5 py-0.5 rounded bg-red-200 text-red-800 text-[10px]">已排除</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{a.customerName}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{renderPhone(a.customerPhone)}</td>
                      <td className="px-4 py-3 text-gray-600">{a.assignedConsultant}</td>
                      <td className="px-4 py-3 text-gray-600">{a.lastVisitDate}</td>
                      <td className="px-4 py-3 text-gray-600">{a.intervalDeviation.toFixed(1)}</td>
                      <td className="px-4 py-3 text-gray-600">{(a.repurchaseRate * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-gray-600">{(a.noShowRate * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', RISK_BAR_COLOR[a.riskLevel])} style={{ width: `${a.riskScore}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{a.riskScore.toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setExpandedId(isExpanded ? null : a.customerId)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {!a.isExcluded ? (
                            <div className="relative">
                              <button onClick={() => setExcludeDropdownId(excludeDropdownId === a.customerId ? null : a.customerId)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                                <Ban className="w-4 h-4" />
                              </button>
                              {excludeDropdownId === a.customerId && (
                                <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                                  {EXCLUDE_REASONS.map((reason) => (
                                    <button key={reason} onClick={() => handleExclude(a.customerId, reason)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50">{reason}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button onClick={() => restoreCustomer(a.customerId)} className="p-1.5 rounded hover:bg-gray-100 text-green-500" title="恢复">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => { setFollowUpId(followUpId === a.customerId ? null : a.customerId); setDueDate(''); setNoteInput('') }} className="p-1.5 rounded hover:bg-gray-100 text-rose-500">
                            <CalendarPlus className="w-4 h-4" />
                          </button>
                        </div>
                        {followUpId === a.customerId && (
                          <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-300" />
                            <input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="跟进备注" className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-300" />
                            <button onClick={() => handleFollowUp(a.customerId)} disabled={!dueDate} className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setFollowUpId(null)} className="p-1 rounded hover:bg-gray-200 text-gray-400">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="px-6 py-4 bg-gray-50/50 border-t">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><Shield className="w-3 h-3" />消费轨迹</h4>
                              {custConsumptions.length === 0 ? <p className="text-xs text-gray-400">暂无</p> : (
                                <div className="space-y-1">
                                  {custConsumptions.map((c) => (
                                    <div key={c.id} className="flex items-center gap-2 text-xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                      <span className="text-gray-500">{c.consumeDate}</span>
                                      <span className="text-gray-700 truncate">{c.projectName}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><Phone className="w-3 h-3" />预约状态</h4>
                              <div className="flex gap-3 text-xs">
                                <span className="text-green-600">完成 {apStats.completed}</span>
                                <span className="text-red-500">爽约 {apStats.no_show}</span>
                                <span className="text-gray-500">取消 {apStats.cancelled}</span>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><MessageSquare className="w-3 h-3" />顾问跟进</h4>
                              {custNotes.length === 0 ? <p className="text-xs text-gray-400">暂无</p> : (
                                <div className="space-y-1">
                                  {custNotes.map((n) => (
                                    <div key={n.id} className="text-xs">
                                      <span className="text-gray-500">{n.followUpDate} {n.consultant}:</span>{' '}
                                      <span className="text-gray-700">{renderNoteContent(n.content)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />投诉记录</h4>
                              {custComplaints.length === 0 ? <p className="text-xs text-gray-400">无投诉</p> : (
                                <div className="space-y-1">
                                  {custComplaints.map((c) => (
                                    <div key={c.id} className="text-xs">
                                      <span className={cn('px-1 py-0.5 rounded text-[10px]', c.status === 'pending' ? 'bg-red-100 text-red-600' : c.status === 'processing' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600')}>
                                        {c.status === 'pending' ? '待处理' : c.status === 'processing' ? '处理中' : '已解决'}
                                      </span>{' '}
                                      <span className="text-gray-500">{c.complaintDate}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400 text-sm">无匹配数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
