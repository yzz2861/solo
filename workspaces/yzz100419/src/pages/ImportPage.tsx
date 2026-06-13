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
  Settings,
  Eye,
  Database,
  Download,
  Users,
  Phone,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import {
  generateDemoData,
  computeChurnAnalysis,
  classifyConsumptions,
  autoMarkComplaintPause,
} from '@/utils/analysis'
import {
  CONSUMPTION_SCHEMA,
  APPOINTMENT_SCHEMA,
  FOLLOWUP_SCHEMA,
  COMPLAINT_SCHEMA,
  ALL_SCHEMAS,
  autoMapFields,
  parseConsumptionCSV,
  parseAppointmentCSV,
  parseFollowUpCSV,
  parseComplaintCSV,
  mergeImportedData,
  parseFile,
  type TableSchema,
  type ParseResult,
} from '@/utils/csvParser'
import type {
  Consumption,
  Appointment,
  FollowUpNote,
  Complaint,
} from '@/types'
import FieldMappingModal from '@/components/FieldMappingModal'
import { cn } from '@/lib/utils'

interface UploadCardConfig {
  key: 'consumption' | 'appointment' | 'followUp' | 'complaint'
  title: string
  icon: React.ElementType
  tint: string
  tintBg: string
  borderHover: string
  bgActive: string
  schema: TableSchema
}

const uploadCards: UploadCardConfig[] = [
  {
    key: 'consumption',
    title: '会员消费表',
    icon: FileText,
    tint: 'text-rose-600',
    tintBg: 'bg-rose-50',
    borderHover: 'hover:border-rose-300',
    bgActive: 'bg-rose-50',
    schema: CONSUMPTION_SCHEMA,
  },
  {
    key: 'appointment',
    title: '预约表',
    icon: FileText,
    tint: 'text-blue-600',
    tintBg: 'bg-blue-50',
    borderHover: 'hover:border-blue-300',
    bgActive: 'bg-blue-50',
    schema: APPOINTMENT_SCHEMA,
  },
  {
    key: 'followUp',
    title: '顾问跟进备注',
    icon: ClipboardList,
    tint: 'text-amber-600',
    tintBg: 'bg-amber-50',
    borderHover: 'hover:border-amber-300',
    bgActive: 'bg-amber-50',
    schema: FOLLOWUP_SCHEMA,
  },
  {
    key: 'complaint',
    title: '投诉记录',
    icon: AlertTriangle,
    tint: 'text-red-600',
    tintBg: 'bg-red-50',
    borderHover: 'hover:border-red-300',
    bgActive: 'bg-red-50',
    schema: COMPLAINT_SCHEMA,
  },
]

type UploadKey = 'consumption' | 'appointment' | 'followUp' | 'complaint'

interface UploadState {
  fileName: string
  rowCount: number
  uploaded: boolean
  parsed: boolean
  errors: string[]
  headers: string[]
  mapping: Record<string, string>
  rawData: Papa.ParseResult<Record<string, unknown>> | null
  parsedRows: unknown[]
}

const initialUploadState = (): UploadState => ({
  fileName: '',
  rowCount: 0,
  uploaded: false,
  parsed: false,
  errors: [],
  headers: [],
  mapping: {},
  rawData: null,
  parsedRows: [],
})

const typeLabels: Record<string, string> = {
  trial: '体验',
  regular: '正价',
  package: '套餐',
}

const typeColors: Record<string, string> = {
  trial: 'bg-amber-100 text-amber-700 border-amber-200',
  regular: 'bg-blue-100 text-blue-700 border-blue-200',
  package: 'bg-purple-100 text-purple-700 border-purple-200',
}

function allRequiredFieldsMapped(
  mapping: Record<string, string>,
  schema: TableSchema
): boolean {
  const mappedTargets = new Set(Object.values(mapping))
  return schema.fields
    .filter((f) => f.required)
    .every((f) => mappedTargets.has(f.target))
}

function parseByKey(
  key: UploadKey,
  rawData: Papa.ParseResult<Record<string, unknown>>,
  mapping: Record<string, string>
): ParseResult<unknown> {
  switch (key) {
    case 'consumption':
      return parseConsumptionCSV(rawData, mapping) as ParseResult<unknown>
    case 'appointment':
      return parseAppointmentCSV(rawData, mapping) as ParseResult<unknown>
    case 'followUp':
      return parseFollowUpCSV(rawData, mapping) as ParseResult<unknown>
    case 'complaint':
      return parseComplaintCSV(rawData, mapping) as ParseResult<unknown>
  }
}

export default function ImportPage() {
  const [uploads, setUploads] = useState<Record<UploadKey, UploadState>>({
    consumption: initialUploadState(),
    appointment: initialUploadState(),
    followUp: initialUploadState(),
    complaint: initialUploadState(),
  })
  const [demoLoaded, setDemoLoaded] = useState(false)
  const [csvImported, setCsvImported] = useState(false)
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
  const [mappingModal, setMappingModal] = useState<{
    open: boolean
    schema: TableSchema | null
    uploadKey: UploadKey | null
  }>({ open: false, schema: null, uploadKey: null })
  const [importStats, setImportStats] = useState<{
    rawCustomerCount: number
    mergedCustomerCount: number
    consumptionCount: number
    appointmentCount: number
    followUpCount: number
    complaintCount: number
    mergeSuggestions: Array<{ ids: string[]; reason: string }>
  } | null>(null)

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

  const handleProcessAllCSV = useCallback((currentUploads: Record<UploadKey, UploadState>) => {
    const cons = currentUploads.consumption
    const apts = currentUploads.appointment
    const fn = currentUploads.followUp
    const comp = currentUploads.complaint

    if (!cons.parsed) return

    const cRows = cons.parsedRows as Array<{ memberId: string; name: string; phone: string; projectName: string; amount: number; consumeDate: string; consultant: string }>
    const aRows = apts.parsedRows as Array<{ memberId: string; name: string; phone: string; appointmentDate: string; status: 'completed' | 'no_show' | 'cancelled'; projectName: string; consultant: string }>
    const fRows = fn.parsedRows as Array<{ memberId: string; name: string; phone: string; consultant: string; followUpDate: string; method: 'phone' | 'wechat' | 'in_person' | 'other'; content: string; isSensitive: boolean }>
    const coRows = comp.parsedRows as Array<{ memberId: string; name: string; phone: string; complaintDate: string; content: string; status: 'pending' | 'processing' | 'resolved'; triggerContactPause: boolean; pauseUntil: string }>

    const merged = mergeImportedData(
      cRows,
      aRows,
      fRows,
      coRows,
      projectTypeRules
    )

    setCustomers(merged.customers)
    setConsumptions(merged.consumptions as Consumption[])
    setAppointments(merged.appointments as Appointment[])
    setFollowUpNotes(merged.followUpNotes as FollowUpNote[])
    setComplaints(merged.complaints as Complaint[])

    setImportStats({
      rawCustomerCount: merged.stats.rawCustomerCount,
      mergedCustomerCount: merged.stats.mergedCustomerCount,
      consumptionCount: merged.stats.consumptionCount,
      appointmentCount: merged.stats.appointmentCount,
      followUpCount: merged.stats.followUpCount,
      complaintCount: merged.stats.complaintCount,
      mergeSuggestions: merged.mergeSuggestions,
    })

    setCsvImported(true)
    setDemoLoaded(false)
    setAnalysisDone(false)
    setChurnSummary(null)
    setPauseCount(0)
  }, [projectTypeRules, setCustomers, setConsumptions, setAppointments, setFollowUpNotes, setComplaints])

  const handleFileSelect = useCallback(
    async (key: UploadKey, schema: TableSchema, file: File) => {
      try {
        const parsed = await parseFile(file)
        const headers = parsed.meta.fields || []
        const mapping = autoMapFields(headers, schema)

        let parsedRows: unknown[] = []
        let errors: string[] = []
        let isParsed = false

        if (allRequiredFieldsMapped(mapping, schema)) {
          const result = parseByKey(key, parsed, mapping)
          parsedRows = result.rows
          errors = result.errors
          isParsed = result.errors.length === 0
        }

        setUploads((prev) => {
          const next = {
            ...prev,
            [key]: {
              fileName: file.name,
              rowCount: parsed.data.length,
              uploaded: true,
              parsed: isParsed,
              errors,
              headers,
              mapping,
              rawData: parsed,
              parsedRows,
            },
          }
          if (key === 'consumption' && isParsed) {
            queueMicrotask(() => handleProcessAllCSV(next))
          }
          return next
        })
      } catch {
        setUploads((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            fileName: file.name,
            errors: ['CSV解析失败，请检查文件格式'],
          },
        }))
      }
    },
    [handleProcessAllCSV]
  )

  const handleDrop = useCallback(
    (key: UploadKey, schema: TableSchema, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files[0]
      if (file) void handleFileSelect(key, schema, file)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const openMappingModal = (key: UploadKey) => {
    const state = uploads[key]
    if (!state.uploaded || !state.rawData) return
    const card = uploadCards.find((c) => c.key === key)
    if (!card) return
    setMappingModal({ open: true, schema: card.schema, uploadKey: key })
  }

  const handleConfirmMapping = (mapping: Record<string, string>) => {
    const key = mappingModal.uploadKey
    if (!key) return
    const state = uploads[key]
    if (!state.rawData) return

    const result = parseByKey(key, state.rawData, mapping)
    const isParsed = result.errors.length === 0

    setUploads((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...prev[key],
          mapping,
          parsed: isParsed,
          errors: result.errors,
          parsedRows: result.rows,
        },
      }
      if (key === 'consumption' && isParsed) {
        queueMicrotask(() => handleProcessAllCSV(next))
      }
      return next
    })
    setMappingModal({ open: false, schema: null, uploadKey: null })
  }

  const handleLoadDemo = useCallback(() => {
    const data = generateDemoData()
    setCustomers(data.customers)
    setConsumptions(
      classifyConsumptions(data.consumptions, projectTypeRules)
    )
    setAppointments(data.appointments)
    setFollowUpNotes(data.followUpNotes)
    setComplaints(data.complaints)

    setDemoLoaded(true)
    setCsvImported(false)
    setAnalysisDone(false)
    setChurnSummary(null)
    setPauseCount(0)
    setImportStats({
      rawCustomerCount: 30,
      mergedCustomerCount: data.customers.length,
      consumptionCount: data.consumptions.length,
      appointmentCount: data.appointments.length,
      followUpCount: data.followUpNotes.length,
      complaintCount: data.complaints.length,
      mergeSuggestions: [],
    })
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

  const allParsed =
    uploads.consumption.parsed &&
    (uploads.appointment.parsed || !uploads.appointment.uploaded) &&
    (uploads.followUp.parsed || !uploads.followUp.uploaded) &&
    (uploads.complaint.parsed || !uploads.complaint.uploaded)

  const canProcessCsv = uploads.consumption.parsed
  const canAnalyze = customers.length > 0

  const multiPhoneCustomers = customers.filter(
    (c) => c.phoneHistory.length > 1
  ).length
  const multiMemberCustomers = customers.filter(
    (c) => c.memberIds.length > 1
  ).length

  const handleDownloadSample = () => {
    const samples = generateSampleCsvContent()
    samples.forEach(({ name, content }) => {
      const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{ backgroundColor: '#F5F0EB' }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">数据导入</h1>
            <p className="mt-1 text-sm text-gray-500">
              上传CSV文件或加载演示数据，开始客户流失分析
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            下载示例CSV
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {uploadCards.map((card) => {
            const Icon = card.icon
            const state = uploads[card.key]
            const hasErrors = state.errors.length > 0
            return (
              <div
                key={card.key}
                className={cn(
                  'rounded-xl border-2 border-dashed bg-white p-5 transition-all duration-200',
                  state.parsed
                    ? 'border-solid border-green-400'
                    : state.uploaded
                    ? 'border-solid border-amber-400'
                    : hasErrors
                    ? 'border-solid border-red-300'
                    : cn('border-gray-300', card.borderHover)
                )}
                onDrop={(e) => handleDrop(card.key, card.schema, e)}
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
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-800">
                      {card.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {card.schema.fields.filter((f) => f.required).length} 个必填字段
                    </p>
                  </div>
                  {state.uploaded && (
                    <button
                      type="button"
                      onClick={() => openMappingModal(card.key)}
                      className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                      title="配置字段映射"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {state.uploaded ? (
                  <div className="space-y-2">
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2',
                        state.parsed
                          ? 'bg-green-50'
                          : hasErrors
                          ? 'bg-red-50'
                          : 'bg-amber-50'
                      )}
                    >
                      {state.parsed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : hasErrors ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-amber-600" />
                      )}
                      <span
                        className={cn(
                          'truncate text-sm',
                          state.parsed
                            ? 'text-green-700'
                            : hasErrors
                            ? 'text-red-700'
                            : 'text-amber-700'
                        )}
                      >
                        {state.fileName}
                      </span>
                      <span
                        className={cn(
                          'ml-auto text-xs font-medium',
                          state.parsed
                            ? 'text-green-600'
                            : hasErrors
                            ? 'text-red-600'
                            : 'text-amber-600'
                        )}
                      >
                        {state.parsed ? `${state.rowCount} 行 ✓` : hasErrors ? `${state.errors.length} 个错误` : `${state.rowCount} 行 待映射`}
                      </span>
                    </div>

                    {!state.parsed && !hasErrors && (
                      <button
                        type="button"
                        onClick={() => openMappingModal(card.key)}
                        className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        <Settings className="mr-1 inline h-3 w-3" />
                        点击配置字段映射
                      </button>
                    )}

                    {hasErrors && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-2">
                        <p className="text-xs font-medium text-red-700">
                          解析错误：
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {state.errors.slice(0, 3).map((err, i) => (
                            <li key={i} className="text-[11px] text-red-600">
                              • {err}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[card.key]?.click()}
                    className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-gray-200 py-5 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">拖拽CSV文件到此处或点击上传</span>
                    <span className="text-[11px] text-gray-300">
                      支持 UTF-8 编码的 CSV 文件
                    </span>
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
                    if (file) void handleFileSelect(card.key, card.schema, file)
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
            onClick={() => handleProcessAllCSV(uploads)}
            disabled={!canProcessCsv}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
              canProcessCsv
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            )}
          >
            <Database className="h-4 w-4" />
            合并导入数据
            {allParsed && uploads.consumption.parsed && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                可处理
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!canAnalyze}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
              canAnalyze
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            )}
          >
            <Play className="h-4 w-4" />
            开始分析
            {customers.length > 0 && !analysisDone && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                {customers.length} 客户
              </span>
            )}
          </button>
        </div>

        {(demoLoaded || csvImported) && importStats && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  {demoLoaded ? '演示数据加载成功' : 'CSV数据导入成功'}
                </span>
                <span className="ml-auto text-xs text-green-600">
                  {importStats.rawCustomerCount} 原始记录 → {importStats.mergedCustomerCount} 客户
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 text-green-700">
                  <Users className="h-3 w-3" />
                  {customers.length} 客户
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 text-rose-700">
                  <FileText className="h-3 w-3" />
                  {consumptions.length} 消费记录
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 text-blue-700">
                  <FileText className="h-3 w-3" />
                  {appointments.length} 预约记录
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 text-amber-700">
                  <ClipboardList className="h-3 w-3" />
                  {followUpNotes.length} 跟进备注
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  {complaints.length} 投诉记录
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Merge className="h-5 w-5" style={{ color: '#B76E79' }} />
                <h2 className="text-lg font-semibold text-gray-800">
                  客户身份合并
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {customers.length}
                  </div>
                  <div className="text-xs text-gray-500">合并后客户数</div>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {importStats.rawCustomerCount - importStats.mergedCustomerCount}
                  </div>
                  <div className="text-xs text-green-600">自动合并数</div>
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

              {customers.filter((c) => c.phoneHistory.length > 1 || c.memberIds.length > 1).slice(0, 5).length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    合并详情（前5条）
                  </p>
                  <div className="space-y-2">
                    {customers.filter((c) => c.phoneHistory.length > 1 || c.memberIds.length > 1).slice(0, 5).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <span className="font-medium text-sm text-gray-800">
                          {c.canonicalName}
                        </span>
                        {c.phoneHistory.length > 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
                            <Phone className="h-3 w-3" />
                            {c.phoneHistory.length}个号
                          </span>
                        )}
                        {c.memberIds.length > 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700">
                            <Users className="h-3 w-3" />
                            {c.memberIds.length}个会员号
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5" style={{ color: '#B76E79' }} />
                <h2 className="text-lg font-semibold text-gray-800">
                  项目类型规则
                </h2>
                <span className="text-xs text-gray-400">
                  用于区分体验卡与正价项目，复购率计算权重不同
                </span>
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
                  placeholder="关键词，如「新客」"
                  className="flex-1 max-w-xs rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition-colors focus:border-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddRule()
                  }}
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'trial' | 'regular')}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition-colors focus:border-gray-400"
                >
                  <option value="trial">体验卡</option>
                  <option value="regular">正价项目</option>
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
                  投诉暂缓：{pauseCount} 位客户因投诉未处理已标记暂缓联系，将自动排除在群发名单之外
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <FieldMappingModal
        open={mappingModal.open}
        onClose={() => setMappingModal({ open: false, schema: null, uploadKey: null })}
        onConfirm={handleConfirmMapping}
        schema={mappingModal.schema}
        csvHeaders={
          mappingModal.uploadKey ? uploads[mappingModal.uploadKey].headers : []
        }
        initialMapping={
          mappingModal.uploadKey ? uploads[mappingModal.uploadKey].mapping : {}
        }
      />
    </div>
  )
}

function generateSampleCsvContent(): Array<{ name: string; content: string }> {
  const now = new Date()
  const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const daysAgo = (days: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    return fmtDate(d)
  }

  const consumptionCsv = [
    '会员号,姓名,手机号,项目名称,消费金额,消费日期,服务顾问',
    'VIP1001,刘芳,13810010001,面部护理-正价,398.00,' + daysAgo(8) + ',张美丽',
    'VIP1001,刘芳,13810010001,全身SPA-正价,698.00,' + daysAgo(35) + ',张美丽',
    'VIP1001,刘芳,13810010001,抗衰套餐,3998.00,' + daysAgo(68) + ',张美丽',
    'VIP1002,陈静,13810010002,面部护理-体验卡,68.00,' + daysAgo(45) + ',李晓雯',
    'VIP1002,陈静,13810010002,肩颈按摩-体验卡,58.00,' + daysAgo(90) + ',李晓雯',
    'VIP1003,杨丽,13810010003,美白护理-正价,498.00,' + daysAgo(12) + ',王雅琴',
    'VIP1003,杨丽,13810010003,面部护理-正价,398.00,' + daysAgo(42) + ',王雅琴',
    'VIP1003,杨丽,13810010003,精油SPA-体验卡,88.00,' + daysAgo(75) + ',王雅琴',
    'VIP1004,黄敏,13810010004,脱毛套餐,2998.00,' + daysAgo(120) + ',赵婉如',
    'VIP1005,周婷,13810010005,面部护理-正价,398.00,' + daysAgo(3) + ',张美丽',
    'VIP1005,周婷,13810010005,全身SPA-正价,698.00,' + daysAgo(30) + ',张美丽',
    'VIP1005,周婷,13810010005,面部护理-正价,398.00,' + daysAgo(55) + ',张美丽',
    'VIP1005,周婷,13810010005,美白护理-正价,498.00,' + daysAgo(85) + ',张美丽',
    'VIP1006,吴燕,13810010006,全身SPA-正价,698.00,' + daysAgo(55) + ',李晓雯',
    'VIP1006,吴燕,13810010006,面部护理-正价,398.00,' + daysAgo(95) + ',李晓雯',
    'VIP1007,郑慧,13920010007,面部护理-体验卡,68.00,' + daysAgo(70) + ',王雅琴',
    'VIP1008,孙琳,13810010008,肩颈按摩-体验卡,58.00,' + daysAgo(140) + ',赵婉如',
    'VIP1009,朱晓,13810010009,面部护理-正价,398.00,' + daysAgo(20) + ',张美丽',
    'VIP1009,朱晓,13810010009,全身SPA-正价,698.00,' + daysAgo(50) + ',张美丽',
    'VIP1010,马玲,13810010010,美白护理-正价,498.00,' + daysAgo(5) + ',李晓雯',
  ].join('\n')

  const appointmentCsv = [
    '会员号,姓名,手机号,预约日期,状态,预约项目,预约顾问',
    'VIP1001,刘芳,13810010001,' + daysAgo(8) + ',已完成,面部护理,张美丽',
    'VIP1001,刘芳,13810010001,' + daysAgo(35) + ',已完成,全身SPA,张美丽',
    'VIP1002,陈静,13810010002,' + daysAgo(45) + ',已完成,面部护理体验,李晓雯',
    'VIP1002,陈静,13810010002,' + daysAgo(70) + ',爽约,肩颈按摩,李晓雯',
    'VIP1003,杨丽,13810010003,' + daysAgo(12) + ',已完成,美白护理,王雅琴',
    'VIP1003,杨丽,13810010003,' + daysAgo(42) + ',已完成,面部护理,王雅琴',
    'VIP1005,周婷,13810010005,' + daysAgo(3) + ',已完成,面部护理,张美丽',
    'VIP1005,周婷,13810010005,' + daysAgo(30) + ',已完成,全身SPA,张美丽',
    'VIP1006,吴燕,13810010006,' + daysAgo(55) + ',已完成,全身SPA,李晓雯',
    'VIP1006,吴燕,13810010006,' + daysAgo(80) + ',已取消,面部护理,李晓雯',
    'VIP1009,朱晓,13810010009,' + daysAgo(20) + ',已完成,面部护理,张美丽',
    'VIP1010,马玲,13810010010,' + daysAgo(5) + ',已完成,美白护理,李晓雯',
  ].join('\n')

  const followUpCsv = [
    '会员号,姓名,手机号,跟进顾问,跟进日期,跟进方式,跟进内容,是否敏感',
    'VIP1001,刘芳,13810010001,张美丽,' + daysAgo(5) + ',微信,客户反馈这次护理效果很好,否',
    'VIP1001,刘芳,13810010001,张美丽,' + daysAgo(33) + ',电话,提醒客户到店，客户说本周有空,否',
    'VIP1002,陈静,13810010002,李晓雯,' + daysAgo(40) + ',电话,客户体验后表示考虑办卡，需跟进,否',
    'VIP1003,杨丽,13810010003,王雅琴,' + daysAgo(10) + ',微信,客户对服务很满意,否',
    'VIP1003,杨丽,13810010003,王雅琴,' + daysAgo(38) + ',到店,客户询问套餐详情,否',
    'VIP1005,周婷,13810010005,张美丽,' + daysAgo(1) + ',微信,确认下次到店时间,否',
    'VIP1005,周婷,13810010005,张美丽,' + daysAgo(27) + ',电话,提醒预约,否',
    'VIP1006,吴燕,13810010006,李晓雯,' + daysAgo(50) + ',电话,客户说最近比较忙,否',
    'VIP1009,朱晓,13810010009,张美丽,' + daysAgo(15) + ',微信,推荐新套餐,否',
    'VIP1010,马玲,13810010010,李晓雯,' + daysAgo(3) + ',电话,客户反馈护理体验很好,否',
  ].join('\n')

  const complaintCsv = [
    '会员号,姓名,手机号,投诉日期,投诉内容,处理状态,暂停联系,暂停至',
    'VIP1002,陈静,13810010002,' + daysAgo(38) + ',体验卡推销过度，感到不适,待处理,是,',
    'VIP1006,吴燕,13810010006,' + daysAgo(52) + ',预约等待时间过长，等了半小时,处理中,是,',
    'VIP1008,孙琳,13810010008,' + daysAgo(130) + ',上次按摩力度太大造成不适,已解决,否,',
  ].join('\n')

  return [
    { name: '01_会员消费表.csv', content: consumptionCsv },
    { name: '02_预约表.csv', content: appointmentCsv },
    { name: '03_顾问跟进备注.csv', content: followUpCsv },
    { name: '04_投诉记录.csv', content: complaintCsv },
  ]
}
void ALL_SCHEMAS
