import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReviewStore } from '@/store/useReviewStore'
import {
  exportStudentCsv,
  exportTechnicianCsv,
  exportTechnicianJson,
  downloadFile,
  generateFilename,
} from '@/utils/exportUtils'
import {
  ChevronDown,
  ChevronRight,
  Save,
  FileDown,
  FileText,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react'
import type { PlateData, SampleEntry } from '@/utils/types'

const TEAL = '#0D7377'
const NUM_FONT = "'JetBrains Mono', monospace"

function StatusBadge({ plate }: { plate: PlateData }) {
  switch (plate.status) {
    case 'adopted':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
          ✓ 采纳
        </span>
      )
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
          ✗ 剔除
          {plate.reasonText && <span className="text-red-500">({plate.reasonText})</span>}
        </span>
      )
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
          ⚠ {plate.reasonText}
        </span>
      )
    case 'no_data':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-400">
          —
        </span>
      )
  }
}

function PlateCell({ plate }: { plate: PlateData }) {
  const display = plate.colonyCount !== null
    ? plate.colonyCount.toLocaleString()
    : plate.rawInput || '—'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm" style={{ fontFamily: NUM_FONT }}>{display}</span>
      <StatusBadge plate={plate} />
    </div>
  )
}

function SampleCard({ sample }: { sample: SampleEntry }) {
  const [expanded, setExpanded] = useState(false)
  const anomalies = sample.dilutions.flatMap(d =>
    d.plates
      .filter(p => p.status === 'rejected' || p.status === 'warning')
      .map(p => ({ dilution: d.dilutionDisplay || d.rawDilutionInput, plate: p }))
  )

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-lg font-semibold text-gray-800">{sample.sampleName}</h3>
        {sample.finalCfu !== null ? (
          <span className="text-2xl font-bold" style={{ fontFamily: NUM_FONT, color: TEAL }}>
            {sample.finalCfu.toLocaleString()}{' '}
            <span className="text-sm font-normal text-gray-500">CFU/mL</span>
          </span>
        ) : (
          <span className="text-xl font-semibold text-red-500">无法计算</span>
        )}
      </div>

      <div className="px-5 py-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-sm hover:underline"
          style={{ color: TEAL }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          计算过程
        </button>
        {expanded && sample.calculationNote && (
          <div className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {sample.calculationNote}
          </div>
        )}
      </div>

      <div className="px-5 pb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="py-2 pr-2 font-medium">稀释度</th>
              <th className="py-2 pr-2 font-medium">接种体积</th>
              <th className="py-2 pr-2 font-medium">平板1</th>
              <th className="py-2 font-medium">平板2</th>
            </tr>
          </thead>
          <tbody>
            {sample.dilutions.map(d => {
              const adopted = d.id === sample.adoptedDilutionId
              return (
                <tr
                  key={d.id}
                  className={`border-b border-gray-50 ${adopted ? 'border-l-4 bg-teal-50/30' : ''}`}
                  style={adopted ? { borderLeftColor: TEAL } : undefined}
                >
                  <td className="py-2 pr-2">{d.dilutionDisplay || d.rawDilutionInput || '—'}</td>
                  <td className="py-2 pr-2">{d.inoculationVolume}{d.volumeUnit}</td>
                  <td className="py-2 pr-2"><PlateCell plate={d.plates[0]} /></td>
                  <td className="py-2"><PlateCell plate={d.plates[1]} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {anomalies.length > 0 && (
        <div className="space-y-2 px-5 pb-4">
          {anomalies.map(({ dilution, plate }) => (
            <div
              key={plate.id}
              className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
            >
              <AlertTriangle size={14} className="shrink-0 text-amber-500" />
              <span className="text-amber-800">
                {dilution} · 平板{plate.plateIndex + 1}：
                {plate.status === 'rejected' ? '剔除' : '警告'} — {plate.reasonText}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const { currentRecord, saveRecord } = useReviewStore()

  if (!currentRecord) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF5]">
        <div className="text-center">
          <p className="text-lg text-gray-500">暂无复核数据</p>
          <Link to="/" className="mt-4 inline-block hover:underline" style={{ color: TEAL }}>
            返回数据录入
          </Link>
        </div>
      </div>
    )
  }

  const handleSave = () => { saveRecord(); alert('记录已保存') }

  const handleExportStudent = () => {
    const csv = exportStudentCsv(currentRecord)
    downloadFile(csv, generateFilename(currentRecord, '学生批改', 'csv'), 'text/csv')
  }

  const handleExportTechCsv = () => {
    const csv = exportTechnicianCsv(currentRecord)
    downloadFile(csv, generateFilename(currentRecord, '实验员', 'csv'), 'text/csv')
  }

  const handleExportTechJson = () => {
    const json = exportTechnicianJson(currentRecord)
    downloadFile(json, generateFilename(currentRecord, '实验员', 'json'), 'application/json')
  }

  const handleBack = () => { navigate('/') }

  return (
    <div className="min-h-screen bg-[#FAFAF5] py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">复核结果</h1>
            <p className="text-sm text-gray-500">
              {currentRecord.className} · {currentRecord.groupName} · {currentRecord.reviewDate}
            </p>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft size={14} /> 返回修改
          </button>
        </div>

        <div className="space-y-4">
          {currentRecord.samples.map(s => (
            <SampleCard key={s.id} sample={s} />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <Save size={14} /> 保存记录
          </button>
          <button
            onClick={handleExportStudent}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-teal-50"
            style={{ borderColor: TEAL, color: TEAL }}
          >
            <FileDown size={14} /> 导出学生批改表
          </button>
          <button
            onClick={handleExportTechCsv}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileDown size={14} /> 导出实验员记录
          </button>
          <button
            onClick={handleExportTechJson}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileText size={14} /> 导出实验员JSON
          </button>
        </div>
      </div>
    </div>
  )
}
