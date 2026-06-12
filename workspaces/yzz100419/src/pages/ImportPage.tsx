import { useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import {
  Upload,
  FileText,
  ClipboardList,
  AlertTriangle,
  Play,
  CheckCircle2,
  Merge,
  Tag,
  Plus,
  X,
  Sparkles,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import {
  generateDemoData,
  computeChurnAnalysis,
  classifyConsumptions,
  autoMarkComplaintPause,
} from '@/utils/analysis'
import { cn } from '@/lib/utils'

interface UploadCardConfig {
  key: string
  title: string
  icon: React.ElementType
  tint: string
  borderHover: string
  bgActive: string
}

const uploadCards: UploadCardConfig[] = [
  {
    key: 'consumption',
    title: '会员消费表',
    icon: FileText,
    tint: 'text-rose-500',
    borderHover: 'hover:border-rose-300',
    bgActive: 'bg-rose-50',
  },
  {
    key: 'appointment',
    title: '预约表',
    icon: FileText,
    tint: 'text-blue-500',
    borderHover: 'hover:border-blue-300',
    bgActive: 'bg-blue-50',
  },
  {
    key: 'followUp',
    title: '顾问跟进备注',
    icon: ClipboardList,
    tint: 'text-amber-500',
    borderHover: 'hover:border-amber-300',
    bgActive: 'bg-amber-50',
  },
  {
    key: 'complaint',
    title: '投诉记录',
    icon: AlertTriangle,
    tint: 'text-red-500',
    borderHover: 'hover:border-red-300',
    bgActive: 'bg-red-50',
  },
]

interface UploadState {
  fileName: string
  rowCount: number
  uploaded: boolean
}

const initialUploads: Record<string, UploadState> = {
  consumption: { fileName: '', rowCount: 0, uploaded: false },
  appointment: { fileName: '', rowCount: 0, uploaded: false },
  followUp: { fileName: '', rowCount: 0, uploaded: false },
  complaint: { fileName: '', rowCount: 0, uploaded: false },
}

const typeLabels: Record<string, string> = {
  trial: '体验',
  regular: '正价',
}

const typeColors: Record<string, string> = {
  trial: 'bg-amber-100 text-amber-700 border-amber-200',
  regular: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function ImportPage() {
  const [uploads, setUploads] = useState(initialUploads)
  const [demoLoaded, setDemoLoaded] = useState(false)
  const [analysisDone, setAnalysisDone] = useState(false)
  const [churnSummary, setChurnSummary] = useState<{
    high: number
    medium: number
    low: number
    safe: number
  } | null>(null)
  const [pauseCount, setPauseCount] = useState(0)
  const [newKeyword, setNewKeyword] = useState('')
  const [newType, setNewType] = useState<'trial' | 'regular'>('trial')

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const {
    setCustomers,
    setConsumptions,
    setAppointments,
    setFollowUpNotes,
    setComplaints,
    setChurnAnalyses,
    projectTypeRules,
    addProjectTypeRule,
    removeProjectTypeRule,
    customers,
    consumptions,
    appointments,
    followUpNotes,
    complaints,
  } = useAppStore()

  const handleFileSelect = useCallback(
    (key: string, file: File) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setUploads((prev) => ({
            ...prev,
            [key]: {
              fileName: file.name,
              rowCount: results.data.length,
              uploaded: true,
            },
          }))
        },
      })
    },
    []
  )

  const handleDrop = useCallback(
    (key: string, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(key, file)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleLoadDemo = useCallback(() => {
    const data = generateDemoData()
    setCustomers(data.customers)
    setConsumptions(
      classifyConsumptions(data.consumptions, projectTypeRules)
    )
    setAppointments(data.appointments)
    setFollowUpNotes(data.followUpNotes)
    setComplaints(data.complaints)

    setUploads({
      consumption: { fileName: 'demo_consumption.csv', rowCount: data.consumptions.length, uploaded: true },
      appointment: { fileName: 'demo_appointment.csv', rowCount: data.appointments.length, uploaded: true },
      followUp: { fileName: 'demo_followup.csv', rowCount: data.followUpNotes.length, uploaded: true },
      complaint: { fileName: 'demo_complaint.csv', rowCount: data.complaints.length, uploaded: true },
    })

    setDemoLoaded(true)
    setAnalysisDone(false)
    setChurnSummary(null)
    setPauseCount(0)
  }, [projectTypeRules, setCustomers, setConsumptions, setAppointments, setFollowUpNotes, setComplaints])

  const handleStartAnalysis = useCallback(() => {
    const classified = classifyConsumptions(consumptions, projectTypeRules)
    setConsumptions(classified)

    const analyses = computeChurnAnalysis(
      customers,
      classified,
      appointments,
      followUpNotes,
      complaints
    )

    const { updatedCustomers, pauseCount: pc } = autoMarkComplaintPause(
      complaints,
      customers
    )
    setCustomers(updatedCustomers)
    setPauseCount(pc)

    const updatedAnalyses = analyses.map((a) => {
      const cust = updatedCustomers.find((c) => c.id === a.customerId)
      return cust?.isExcluded ? { ...a, isExcluded: true, excludeReason: cust.excludeReason } : a
    })
    setChurnAnalyses(updatedAnalyses)

    setChurnSummary({
      high: updatedAnalyses.filter((a) => a.riskLevel === 'high' && !a.isExcluded).length,
      medium: updatedAnalyses.filter((a) => a.riskLevel === 'medium' && !a.isExcluded).length,
      low: updatedAnalyses.filter((a) => a.riskLevel === 'low' && !a.isExcluded).length,
      safe: updatedAnalyses.filter((a) => a.riskLevel === 'safe' && !a.isExcluded).length,
    })

    setAnalysisDone(true)
  }, [customers, consumptions, appointments, followUpNotes, complaints, projectTypeRules, setConsumptions, setChurnAnalyses, setCustomers])

  const handleAddRule = useCallback(() => {
    if (!newKeyword.trim()) return
    addProjectTypeRule({ keyword: newKeyword.trim(), type: newType })
    setNewKeyword('')
  }, [newKeyword, newType, addProjectTypeRule])

  const multiPhoneCustomers = customers.filter(
    (c) => c.phoneHistory.length > 1
  ).length
  const multiMemberCustomers = customers.filter(
    (c) => c.memberIds.length > 1
  ).length

  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{ backgroundColor: '#F5F0EB' }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">数据导入</h1>
          <p className="mt-1 text-sm text-gray-500">
            上传CSV文件或加载演示数据，开始客户流失分析
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {uploadCards.map((card) => {
            const Icon = card.icon
            const state = uploads[card.key]
            return (
              <div
                key={card.key}
                className={cn(
                  'rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 transition-all duration-200',
                  card.borderHover,
                  state.uploaded && 'border-solid border-green-300'
                )}
                onDrop={(e) => handleDrop(card.key, e)}
                onDragOver={handleDragOver}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      card.bgActive
                    )}
                  >
                    <Icon className={cn('h-5 w-5', card.tint)} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {card.title}
                    </h3>
                  </div>
                </div>

                {state.uploaded ? (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      {state.fileName}
                    </span>
                    <span className="ml-auto text-xs font-medium text-green-600">
                      {state.rowCount} 行
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[card.key]?.click()}
                    className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-gray-200 py-6 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">拖拽CSV文件到此处或点击上传</span>
                  </button>
                )}

                <input
                  ref={(el) => {
                    fileInputRefs.current[card.key] = el
                  }}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(card.key, file)
                  }}
                />
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleLoadDemo}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#B76E79' }}
          >
            <Sparkles className="h-4 w-4" />
            加载演示数据
          </button>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!demoLoaded && customers.length === 0}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
              demoLoaded || customers.length > 0
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            )}
          >
            <Play className="h-4 w-4" />
            开始分析
          </button>
        </div>

        {demoLoaded && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  演示数据加载成功
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-green-700">
                <span className="rounded-full bg-green-100 px-3 py-0.5">
                  {customers.length} 客户
                </span>
                <span className="rounded-full bg-green-100 px-3 py-0.5">
                  {consumptions.length} 消费记录
                </span>
                <span className="rounded-full bg-green-100 px-3 py-0.5">
                  {appointments.length} 预约记录
                </span>
                <span className="rounded-full bg-green-100 px-3 py-0.5">
                  {followUpNotes.length} 跟进备注
                </span>
                <span className="rounded-full bg-green-100 px-3 py-0.5">
                  {complaints.length} 投诉记录
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5" style={{ color: '#B76E79' }} />
                <h2 className="text-lg font-semibold text-gray-800">
                  项目类型规则
                </h2>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {projectTypeRules.map((rule) => (
                  <span
                    key={rule.keyword}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                      typeColors[rule.type]
                    )}
                  >
                    {rule.keyword}
                    <span className="text-[10px] opacity-70">→</span>
                    {typeLabels[rule.type]}
                    <button
                      type="button"
                      onClick={() => removeProjectTypeRule(rule.keyword)}
                      className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="关键词"
                  className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition-colors focus:border-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddRule()
                  }}
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'trial' | 'regular')}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition-colors focus:border-gray-400"
                >
                  <option value="trial">体验</option>
                  <option value="regular">正价</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddRule}
                  disabled={!newKeyword.trim()}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors',
                    newKeyword.trim()
                      ? 'hover:opacity-90'
                      : 'cursor-not-allowed opacity-50'
                  )}
                  style={{ backgroundColor: '#B76E79' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Merge className="h-5 w-5" style={{ color: '#B76E79' }} />
                <h2 className="text-lg font-semibold text-gray-800">
                  客户身份合并
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {customers.length}
                  </div>
                  <div className="text-xs text-gray-500">总客户数</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">
                    {multiPhoneCustomers}
                  </div>
                  <div className="text-xs text-amber-600">多号码客户</div>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {multiMemberCustomers}
                  </div>
                  <div className="text-xs text-blue-600">多会员ID客户</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {analysisDone && churnSummary && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  分析完成
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-0.5 font-medium text-red-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  高风险 {churnSummary.high}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 font-medium text-amber-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  中风险 {churnSummary.medium}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-0.5 font-medium text-yellow-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                  低风险 {churnSummary.low}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-0.5 font-medium text-green-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  安全 {churnSummary.safe}
                </span>
              </div>
              {pauseCount > 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  <AlertTriangle className="mr-1 inline h-4 w-4" />
                  投诉暂缓：{pauseCount} 位客户因投诉未处理已标记暂缓联系
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
