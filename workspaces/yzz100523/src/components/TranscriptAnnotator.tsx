import { useMemo, useState } from 'react'
import type { Violation } from '../types'
import { VIOLATION_META } from '../types'

interface Props {
  text: string
  violations: Violation[]
  selectedId?: string
  onSelect?: (id: string) => void
}

interface Segment {
  text: string
  start: number
  end: number
  lineNumber: number
  violation?: Violation
}

function buildSegments(text: string, violations: Violation[]): Segment[] {
  const sorted = [...violations].sort((a, b) => a.startOffset - b.startOffset)
  const segments: Segment[] = []
  let cursor = 0

  const lines = text.split('\n')
  const lineOffsets: number[] = []
  let acc = 0
  for (const line of lines) {
    lineOffsets.push(acc)
    acc += line.length + 1
  }
  const getLine = (offset: number) => {
    let lo = 0, hi = lineOffsets.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineOffsets[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }

  for (const v of sorted) {
    if (v.startOffset > cursor) {
      segments.push({
        text: text.substring(cursor, v.startOffset),
        start: cursor,
        end: v.startOffset,
        lineNumber: getLine(cursor),
      })
    }
    segments.push({
      text: text.substring(v.startOffset, v.endOffset),
      start: v.startOffset,
      end: v.endOffset,
      lineNumber: v.lineNumber,
      violation: v,
    })
    cursor = v.endOffset
  }
  if (cursor < text.length) {
    segments.push({
      text: text.substring(cursor),
      start: cursor,
      end: text.length,
      lineNumber: getLine(cursor),
    })
  }
  return segments
}

export default function TranscriptAnnotator({ text, violations, selectedId, onSelect }: Props) {
  const segments = useMemo(() => buildSegments(text, violations), [text, violations])
  const [hoverId, setHoverId] = useState<string | null>(null)

  const lines = useMemo(() => {
    const result: { lineNum: number; segs: Segment[] }[] = []
    let currentLine = 0
    let bucket: Segment[] = []

    const flush = (ln: number) => {
      if (bucket.length > 0 || result.length === 0) {
        result.push({ lineNum: ln, segs: bucket })
      }
      bucket = []
    }

    for (const seg of segments) {
      const parts = seg.text.split('\n')
      if (parts.length === 1) {
        bucket.push(seg)
        currentLine = seg.lineNumber
      } else {
        for (let i = 0; i < parts.length; i++) {
          const partSeg: Segment = {
            ...seg,
            text: parts[i],
            lineNumber: seg.lineNumber + i,
          }
          if (i === 0) {
            bucket.push(partSeg)
            flush(seg.lineNumber)
          } else {
            if (partSeg.text || i < parts.length - 1) {
              bucket = partSeg.text ? [partSeg] : []
              flush(seg.lineNumber + i)
            } else if (partSeg.text) {
              bucket.push(partSeg)
            }
          }
        }
        currentLine = seg.lineNumber + parts.length - 1
      }
    }
    if (bucket.length > 0) flush(currentLine || 1)
    return result
  }, [segments])

  return (
    <div className="font-mono text-sm bg-slate-50 rounded-lg border border-slate-200 overflow-auto max-h-[calc(100vh-260px)] scrollbar-thin">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((row, idx) => (
            <tr key={idx} className="group/row hover:bg-blue-50/30 transition-colors">
              <td className="select-none w-14 pr-2 pl-3 py-0.5 text-right text-xs text-slate-400 bg-slate-100/60 align-top sticky left-0 border-r border-slate-200">
                {row.lineNum}
              </td>
              <td className="py-0.5 px-3 whitespace-pre-wrap break-words align-top leading-7">
                {row.segs.length === 0 ? '\u00A0' : row.segs.map((seg, si) => {
                  if (!seg.violation) return <span key={si}>{seg.text}</span>
                  const v = seg.violation
                  const meta = VIOLATION_META[v.type]
                  const isSelected = selectedId === v.id
                  const isHovered = hoverId === v.id
                  const isExempt = !!v.exemption
                  return (
                    <mark
                      key={si}
                      data-violation-id={v.id}
                      onMouseEnter={() => setHoverId(v.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onClick={() => onSelect?.(v.id)}
                      className={`
                        relative cursor-pointer rounded px-0.5 -mx-0.5 py-0.5
                        transition-all duration-150
                        ${isExempt ? 'opacity-50 line-through decoration-dashed decoration-slate-400' : ''}
                        ${isSelected ? 'ring-2 ring-offset-1 shadow-md scale-[1.01]' : 'hover:shadow-sm'}
                      `}
                      style={{
                        backgroundColor: meta.color + (isSelected ? '33' : isHovered ? '28' : '18'),
                        color: meta.textColor?.replace('text-', '') ? undefined : meta.color,
                        boxShadow: isSelected
                          ? `0 0 0 2px ${meta.color}66 inset`
                          : isHovered
                          ? `0 0 0 1px ${meta.color}44 inset`
                          : undefined,
                        borderBottom: `2px solid ${meta.color}${isExempt ? '55' : 'CC'}`,
                      }}
                      title={`[${v.lineNumber}行] ${meta.label} · ${v.matchedKeyword}`}
                    >
                      {seg.text || '\u200B'}
                      {isSelected && (
                        <span
                          className="absolute -top-5 left-0 text-[10px] px-1.5 py-0.5 rounded text-white whitespace-nowrap shadow"
                          style={{ backgroundColor: meta.color }}
                        >
                          {meta.label}
                        </span>
                      )}
                    </mark>
                  )
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
