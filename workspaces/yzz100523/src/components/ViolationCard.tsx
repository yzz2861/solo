import { useState } from 'react'
import type { Violation, ExemptionReason } from '../types'
import { VIOLATION_META, EXEMPTION_META } from '../types'
import { ViolationTag, SeverityTag, ExemptionChip } from './Tags'

interface Props {
  violation: Violation
  index: number
  selected: boolean
  onSelect: () => void
  onSetExemption: (reason: ExemptionReason | null, note?: string) => void
  onSetCorrection: (data: { correctedText?: string; reviewerNote?: string; isDone?: boolean }) => void
}

export default function ViolationCard({
  violation, index, selected, onSelect, onSetExemption, onSetCorrection,
}: Props) {
  const [open, setOpen] = useState(selected)
  const [correctedText, setCorrectedText] = useState(violation.correction?.correctedText ?? '')
  const [reviewerNote, setReviewerNote] = useState(violation.correction?.reviewerNote ?? '')
  const [exemptNote, setExemptNote] = useState(violation.exemption?.note ?? '')

  const meta = VIOLATION_META[violation.type]
  const isExempt = !!violation.exemption
  const isCorrected = !!violation.correction?.isDone
  const needsReview = !violation.reviewed

  const handleSaveCorrection = () => {
    onSetCorrection({
      correctedText,
      reviewerNote,
      isDone: correctedText.trim().length > 0,
    })
  }

  return (
    <div
      className={`
        card overflow-hidden transition-all duration-200 animate-slide-up
        ${selected ? 'ring-2 ring-brand-500 shadow-lg -translate-y-0.5' : ''}
        ${isExempt ? 'opacity-70' : ''}
      `}
      style={selected ? { borderLeft: `4px solid ${meta.color}` } : undefined}
    >
      <button
        onClick={() => { onSelect(); setOpen(o => !o) }}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-50/60 transition"
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
          style={{ background: meta.color }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <ViolationTag type={violation.type} />
            <SeverityTag severity={violation.severity} />
            <span className="text-xs text-slate-500">
              第 {violation.lineNumber} 行 · 字符 {violation.startOffset}-{violation.endOffset}
            </span>
            {needsReview && (
              <span className="badge bg-blue-50 text-blue-700 border border-blue-200 animate-pulse-slow">
                ⚡ 待复核
              </span>
            )}
            {isExempt && (
              <span className="badge bg-slate-100 text-slate-600 border border-slate-200">
                {EXEMPTION_META[violation.exemption!.reason].icon} 豁免·{EXEMPTION_META[violation.exemption!.reason].label}
              </span>
            )}
            {!isExempt && isCorrected && (
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✅ 已整改
              </span>
            )}
            {!isExempt && !isCorrected && violation.reviewed && (
              <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                ⏳ 待整改
              </span>
            )}
          </div>
          <p className="text-sm text-slate-800 line-clamp-2">
            「{violation.originalText}」
            <span className="ml-2 text-xs text-slate-500">匹配词: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{violation.matchedKeyword}</span></span>
          </p>
        </div>
        <div className="flex-shrink-0 text-slate-400 text-lg">
          {open ? '▲' : '▼'}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-gradient-to-b from-slate-50/40 to-white">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-medium text-slate-500 mb-1.5">📜 规则依据</div>
              <div className="text-slate-700">{violation.ruleBasis}</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="text-xs font-medium text-amber-700 mb-1.5">💡 系统建议整改方向</div>
              <div className="text-slate-700">{violation.suggestion}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-700 mb-2">👮 标记豁免（留给人工确认的情况）</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {(Object.keys(EXEMPTION_META) as ExemptionReason[]).map(r => (
                <ExemptionChip
                  key={r}
                  reason={r}
                  active={violation.exemption?.reason === r}
                  onClick={() => {
                    if (violation.exemption?.reason === r) {
                      onSetExemption(null)
                    } else {
                      onSetExemption(r, exemptNote)
                    }
                  }}
                />
              ))}
            </div>
            <input
              type="text"
              className="input text-sm"
              placeholder="豁免原因补充说明（可选）"
              value={exemptNote}
              onChange={e => {
                setExemptNote(e.target.value)
                if (violation.exemption) onSetExemption(violation.exemption.reason, e.target.value)
              }}
            />
            {violation.exemption && (
              <div className="mt-2 text-xs text-slate-500">
                {EXEMPTION_META[violation.exemption.reason].hint}
              </div>
            )}
          </div>

          {!isExempt && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span>✏️ 填写整改方案（主播需执行）</span>
              </div>
              <textarea
                className="input text-sm min-h-[80px]"
                placeholder="请输入规范后的说法，将直接展示给主播..."
                value={correctedText}
                onChange={e => setCorrectedText(e.target.value)}
              />
              <textarea
                className="input text-sm min-h-[60px]"
                placeholder="内部备注（仅合规内部可见，可选）"
                value={reviewerNote}
                onChange={e => setReviewerNote(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  保存后将在导出清单中展示给主播
                </span>
                <button
                  onClick={handleSaveCorrection}
                  disabled={!correctedText.trim() && !reviewerNote.trim()}
                  className="btn-primary text-sm !px-3 !py-1.5"
                >
                  💾 保存整改
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
