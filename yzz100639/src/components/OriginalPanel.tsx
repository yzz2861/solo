import type { Sentence } from '@/engine/types'
import { categoryBgColors, categoryIcons, QuoteTag } from './RiskUI'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function SentenceLine({
  sentence,
  isSelected,
  onClick,
}: {
  sentence: Sentence
  isSelected: boolean
  onClick: () => void
}) {
  const hasRisk = sentence.risks.length > 0
  const unconfirmedRisks = sentence.risks.filter(r => !r.confirmed)
  const isHighlighted = hasRisk && unconfirmedRisks.length > 0

  const topRisk = unconfirmedRisks[0] || sentence.risks[0]
  const bgClass = topRisk ? categoryBgColors[topRisk.category] : ''

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
        isHighlighted ? bgClass : ''
      } ${isSelected ? 'ring-1 ring-[#FF6B35]/50' : ''} ${
        hasRisk && unconfirmedRisks.length === 0 ? 'opacity-40' : ''
      } hover:bg-white/5`}
    >
      <span className="text-[10px] font-mono text-white/20 w-8 shrink-0 text-right leading-5 select-none">
        {sentence.lineNumber}
      </span>
      <p className={`text-xs leading-5 flex-1 ${isHighlighted ? 'text-white/90' : 'text-white/50'}`}>
        {sentence.content}
      </p>
      {isHighlighted && (
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <QuoteTag category={sentence.quoteCategory} />
          {unconfirmedRisks.length > 1 && (
            <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
              +{unconfirmedRisks.length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function OriginalPanel({
  sentences,
  selectedId,
  onSelect,
}: {
  sentences: Sentence[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      {sentences.map((s) => (
        <SentenceLine
          key={s.id}
          sentence={s}
          isSelected={s.id === selectedId}
          onClick={() => onSelect(s.id)}
        />
      ))}
    </div>
  )
}

export function ConfirmedSection({
  sentences,
  onUnconfirm,
}: {
  sentences: Sentence[]
  onUnconfirm: (sentenceId: string, riskId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (sentences.length === 0) return null

  const allRisks = sentences.flatMap(s => s.risks.filter(r => r.confirmed))

  return (
    <div className="border-t border-white/5 pt-3 mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#4ECDC4]/70 hover:text-[#4ECDC4] transition-colors mb-2"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        已确认保留 ({allRisks.length})
      </button>
      {expanded && (
        <div className="space-y-2">
          {sentences.map(s => (
            <div key={s.id} className="rounded-lg bg-[#4ECDC4]/5 border border-[#4ECDC4]/10 p-3">
              <p className="text-xs text-white/40 line-through">{s.content}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {s.risks.filter(r => r.confirmed).map(r => (
                  <button
                    key={r.id}
                    onClick={() => onUnconfirm(s.id, r.id)}
                    className="text-[10px] text-[#4ECDC4]/50 hover:text-[#4ECDC4] transition-colors"
                  >
                    撤销确认
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
