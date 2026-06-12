import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Pencil,
  MessageSquarePlus,
  ChevronDown,
  Clock,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Annotation, IssueType, AnnotationStatus } from '@/types'
import { ISSUE_TYPE_LABELS, ISSUE_TYPE_COLORS, CONFIDENCE_COLORS } from '@/types'

const STATUS_STYLES: Record<AnnotationStatus, { border: string; label: string }> = {
  PENDING: { border: 'border-2 border-dashed', label: '待确认' },
  CONFIRMED: { border: 'border-2 border-solid border-pass', label: '已确认' },
  REJECTED: { border: 'border-2 border-dotted border-danger', label: '已驳回' },
  MODIFIED: { border: 'border-2 border-solid border-warn', label: '已修改' },
}

const STATUS_BADGE: Record<AnnotationStatus, string> = {
  PENDING: 'bg-brand-600 text-gray-300',
  CONFIRMED: 'bg-pass/20 text-pass',
  REJECTED: 'bg-danger/20 text-danger',
  MODIFIED: 'bg-warn/20 text-warn',
}

const ACTION_LABELS: Record<string, string> = {
  created: '创建',
  confirmed: '确认',
  rejected: '驳回',
  modified_type: '修改类型',
  modified_position: '修改位置',
  added_note: '添加备注',
}

export default function ReviewConfirm() {
  const { photoId } = useParams<{ photoId: string }>()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(true)

  const { photos, getPhotoById, getAnnotationsByPhotoId, getHistoryByAnnotationId,
    confirmAnnotation, rejectAnnotation, modifyAnnotationType, addAnnotationNote } = useAppStore()

  const resolvedPhotoId = useMemo(() => {
    if (photoId && photoId !== 'current') return photoId
    const pending = photos.find((p) => p.hasIssues)
    return pending?.id ?? photos[0]?.id
  }, [photoId, photos])

  const photo = getPhotoById(resolvedPhotoId ?? '')
  const annotations = getAnnotationsByPhotoId(resolvedPhotoId ?? '')
  const selected = annotations.find((a) => a.id === selectedId) ?? null

  const batchPhotos = useMemo(
    () => (photo ? photos.filter((p) => p.batchId === photo.batchId) : []),
    [photo, photos]
  )
  const currentIndex = batchPhotos.findIndex((p) => p.id === resolvedPhotoId)

  const allHistories = useMemo(
    () => annotations.flatMap((a) => getHistoryByAnnotationId(a.id)).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [annotations, getHistoryByAnnotationId]
  )

  const handlePrev = () => {
    if (currentIndex > 0) navigate(`/review/${batchPhotos[currentIndex - 1].id}`)
  }
  const handleNext = () => {
    if (currentIndex < batchPhotos.length - 1) navigate(`/review/${batchPhotos[currentIndex + 1].id}`)
  }

  if (!photo) {
    return <div className="flex items-center justify-center h-full text-gray-400">暂无照片数据</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-brand-700/50">
        <div>
          <h2 className="text-lg font-bold text-gray-100">确认审核</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            照片 {currentIndex + 1}/{batchPhotos.length} · {photo.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-brand-700 text-gray-300 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" /> 上一张
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex >= batchPhotos.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-brand-700 text-gray-300 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            下一张 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-4 relative">
          <div className="relative w-full h-full rounded-lg overflow-hidden bg-brand-900">
            <img src={photo.url} alt="" className="w-full h-full object-contain" />
            {annotations.map((ann) => {
              const color = ISSUE_TYPE_COLORS[ann.type]
              const style = STATUS_STYLES[ann.status]
              const isSelected = ann.id === selectedId
              return (
                <div
                  key={ann.id}
                  onClick={() => setSelectedId(ann.id)}
                  className={`absolute cursor-pointer transition-shadow ${style.border} ${isSelected ? 'shadow-[0_0_12px_2px_rgba(255,107,53,0.5)]' : ''}`}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: `${ann.width}%`,
                    height: `${ann.height}%`,
                    borderColor: ann.status === 'PENDING' || ann.status === 'MODIFIED' ? color : undefined,
                  }}
                >
                  <span
                    className="absolute -top-5 left-0 text-[10px] px-1.5 py-0.5 rounded font-medium text-white whitespace-nowrap"
                    style={{ backgroundColor: color }}
                  >
                    {ISSUE_TYPE_LABELS[ann.type]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="w-80 flex-shrink-0 border-l border-brand-700/50 flex flex-col bg-surface-card">
          <div className="px-4 py-3 border-b border-brand-700/40">
            <h3 className="text-sm font-semibold text-gray-200">
              标注列表 <span className="text-gray-500 font-normal">({annotations.length})</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {annotations.map((ann) => {
              const isSelected = ann.id === selectedId
              return (
                <div
                  key={ann.id}
                  onClick={() => setSelectedId(ann.id)}
                  className={`p-3 rounded-lg cursor-pointer transition border ${
                    isSelected
                      ? 'border-accent bg-accent/10'
                      : 'border-brand-700/40 bg-brand-800 hover:bg-brand-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ISSUE_TYPE_COLORS[ann.type] }} />
                      <span className="text-sm text-gray-200">{ISSUE_TYPE_LABELS[ann.type]}</span>
                    </div>
                    <Pencil className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: `${CONFIDENCE_COLORS[ann.confidenceLevel]}20`, color: CONFIDENCE_COLORS[ann.confidenceLevel] }}
                    >
                      {Math.round(ann.confidence * 100)}%
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[ann.status]}`}>
                      {STATUS_STYLES[ann.status].label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {selected && (
            <div className="p-3 border-t border-brand-700/40 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => confirmAnnotation(selected.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium bg-pass/20 text-pass hover:bg-pass/30 transition btn-pass"
                >
                  <CheckCircle2 className="w-4 h-4" /> 确认
                </button>
                <button
                  onClick={() => rejectAnnotation(selected.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium bg-danger/20 text-danger hover:bg-danger/30 transition btn-danger"
                >
                  <XCircle className="w-4 h-4" /> 驳回
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm bg-brand-700 text-gray-300 hover:bg-brand-600 transition"
                >
                  修改类型 <ChevronDown className={`w-4 h-4 transition ${showTypeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showTypeDropdown && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-brand-700 rounded-lg border border-brand-600 shadow-lg overflow-hidden z-10">
                    {(Object.keys(ISSUE_TYPE_LABELS) as IssueType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => { modifyAnnotationType(selected.id, t); setShowTypeDropdown(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-brand-600 transition"
                      >
                        {ISSUE_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="添加备注..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-brand-700 text-gray-200 placeholder-gray-500 border border-brand-600 focus:outline-none focus:border-accent/50"
                />
                <button
                  onClick={() => { if (noteInput.trim()) { addAnnotationNote(selected.id, noteInput.trim()); setNoteInput('') } }}
                  className="px-3 py-2 rounded-lg text-sm bg-accent/20 text-accent hover:bg-accent/30 transition"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-brand-700/50">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full flex items-center justify-between px-6 py-2.5 text-sm text-gray-300 hover:bg-brand-800/50 transition"
        >
          <span className="font-medium">修改历史</span>
          <ChevronDown className={`w-4 h-4 transition ${historyOpen ? 'rotate-180' : ''}`} />
        </button>
        {historyOpen && (
          <div className="px-6 pb-3 max-h-48 overflow-y-auto">
            {allHistories.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">暂无修改记录</p>
            ) : (
              <div className="space-y-2">
                {allHistories.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 text-xs">
                    <div className="mt-1 w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(h.timestamp).toLocaleString('zh-CN')}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-300">{h.operatorName}</span>
                      </div>
                      <p className="text-gray-300 mt-0.5">
                        {ACTION_LABELS[h.action] ?? h.action}
                        {h.previousValue && h.newValue ? (
                          <span className="text-gray-500"> {h.previousValue} → {h.newValue}</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
