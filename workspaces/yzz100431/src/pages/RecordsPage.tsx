import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '@/store/useReviewStore'
import {
  exportStudentCsv,
  exportTechnicianCsv,
  exportTechnicianJson,
  downloadFile,
  generateFilename,
} from '@/utils/exportUtils'
import {
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileDown,
  FileText,
  Inbox,
} from 'lucide-react'
import type { ReviewRecord } from '@/utils/types'

const TEAL = '#0D7377'
const NUM_FONT = "'JetBrains Mono', monospace"

function StatusBadge({ status, text }: { status: string; text: string }) {
  switch (status) {
    case 'adopted':
      return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">✓</span>
    case 'rejected':
      return <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">✗ {text}</span>
    case 'warning':
      return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">⚠</span>
    default:
      return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">—</span>
  }
}

function ExpandedDetail({ record }: { record: ReviewRecord }) {
  return (
    <div className="space-y-3 bg-gray-50 px-6 py-4">
      {record.samples.map(s => (
        <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-800">{s.sampleName}</h4>
            {s.finalCfu !== null ? (
              <span className="font-bold" style={{ fontFamily: NUM_FONT, color: TEAL }}>
                {s.finalCfu.toLocaleString()} CFU/mL
              </span>
            ) : (
              <span className="font-semibold text-red-500">无法计算</span>
            )}
          </div>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-400">
                <th className="py-1 pr-2 font-medium">稀释度</th>
                <th className="py-1 pr-2 font-medium">接种体积</th>
                <th className="py-1 pr-2 font-medium">平板1</th>
                <th className="py-1 font-medium">平板2</th>
              </tr>
            </thead>
            <tbody>
              {s.dilutions.map(d => {
                const adopted = d.id === s.adoptedDilutionId
                return (
                  <tr
                    key={d.id}
                    className={`border-b border-gray-50 ${adopted ? 'border-l-4 bg-teal-50/30' : ''}`}
                    style={adopted ? { borderLeftColor: TEAL } : undefined}
                  >
                    <td className="py-1 pr-2">{d.dilutionDisplay || d.rawDilutionInput || '—'}</td>
                    <td className="py-1 pr-2">{d.inoculationVolume}{d.volumeUnit}</td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1">
                        <span style={{ fontFamily: NUM_FONT }}>{d.plates[0]?.colonyCount ?? '—'}</span>
                        <StatusBadge status={d.plates[0]?.status ?? 'no_data'} text={d.plates[0]?.reasonText ?? ''} />
                      </div>
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <span style={{ fontFamily: NUM_FONT }}>{d.plates[1]?.colonyCount ?? '—'}</span>
                        <StatusBadge status={d.plates[1]?.status ?? 'no_data'} text={d.plates[1]?.reasonText ?? ''} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function RecordRow({
  record,
  onLoad,
  onDelete,
  onExportStudent,
  onExportTechCsv,
  onExportTechJson,
}: {
  record: ReviewRecord
  onLoad: () => void
  onDelete: () => void
  onExportStudent: () => void
  onExportTechCsv: () => void
  onExportTechJson: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const summaryParts = record.samples.map(s =>
    s.finalCfu !== null ? `${s.sampleName}: ${s.finalCfu.toLocaleString()}` : `${s.sampleName}: 无法计算`
  )
  const summary = summaryParts.length <= 2
    ? summaryParts.join('；')
    : summaryParts.slice(0, 2).join('；') + `…等${summaryParts.length}个`

  return (
    <div className="border-b border-gray-100">
      <div
        className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-gray-50"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="w-4 shrink-0 text-gray-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
        <span className="w-24 shrink-0 text-sm text-gray-600">{record.reviewDate}</span>
        <span className="w-20 shrink-0 text-sm text-gray-800">{record.className}</span>
        <span className="w-16 shrink-0 text-sm text-gray-800">{record.groupName}</span>
        <span className="w-20 shrink-0 text-sm text-gray-600">{record.reviewerName}</span>
        <span className="w-12 shrink-0 text-sm text-gray-500">{record.samples.length}</span>
        <span className="flex-1 truncate text-xs text-gray-500">{summary}</span>
        <div className="flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={onLoad} className="rounded p-1 text-[#0D7377] hover:bg-teal-50" title="加载复核">
            <Eye size={14} />
          </button>
          <button onClick={onExportStudent} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="导出学生版">
            <FileDown size={14} />
          </button>
          <button onClick={onExportTechCsv} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="导出实验员版">
            <FileText size={14} />
          </button>
          <button onClick={onExportTechJson} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="导出JSON">
            <FileDown size={14} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { onDelete(); setConfirmDelete(false) }} className="rounded bg-red-500 px-2 py-0.5 text-xs text-white hover:bg-red-600">
                确认
              </button>
              <button onClick={() => setConfirmDelete(false)} className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-300">
                取消
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="rounded p-1 text-red-400 hover:bg-red-50" title="删除">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {expanded && <ExpandedDetail record={record} />}
    </div>
  )
}

export default function RecordsPage() {
  const navigate = useNavigate()
  const { records, loadRecords, loadRecord, deleteRecord } = useReviewStore()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { loadRecords() }, [loadRecords])

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    if (q) {
      const inClass = r.className.toLowerCase().includes(q)
      const inGroup = r.groupName.toLowerCase().includes(q)
      const inSample = r.samples.some(s => s.sampleName.toLowerCase().includes(q))
      if (!inClass && !inGroup && !inSample) return false
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      if (r.createdAt < from) return false
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000
      if (r.createdAt > to) return false
    }
    return true
  })

  const handleLoad = (record: ReviewRecord) => {
    loadRecord(record)
    navigate('/review')
  }

  const handleExportStudent = (record: ReviewRecord) => {
    downloadFile(exportStudentCsv(record), generateFilename(record, '学生批改', 'csv'), 'text/csv')
  }

  const handleExportTechCsv = (record: ReviewRecord) => {
    downloadFile(exportTechnicianCsv(record), generateFilename(record, '实验员', 'csv'), 'text/csv')
  }

  const handleExportTechJson = (record: ReviewRecord) => {
    downloadFile(exportTechnicianJson(record), generateFilename(record, '实验员', 'json'), 'application/json')
  }

  return (
    <div className="min-h-screen bg-[#FAFAF5] py-8">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">记录管理</h1>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索班级 / 组号 / 样品名"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm focus:border-[#0D7377] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0D7377] focus:outline-none"
            />
            <span>至</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0D7377] focus:outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Inbox size={48} strokeWidth={1} />
            <p className="mt-3 text-sm">暂无记录</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">
              <span className="w-4" />
              <span className="w-24">日期</span>
              <span className="w-20">班级</span>
              <span className="w-16">组号</span>
              <span className="w-20">复核人</span>
              <span className="w-12">样品数</span>
              <span className="flex-1">结果概要</span>
              <span className="w-36">操作</span>
            </div>
            {filtered.map(r => (
              <RecordRow
                key={r.id}
                record={r}
                onLoad={() => handleLoad(r)}
                onDelete={() => deleteRecord(r.id)}
                onExportStudent={() => handleExportStudent(r)}
                onExportTechCsv={() => handleExportTechCsv(r)}
                onExportTechJson={() => handleExportTechJson(r)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
