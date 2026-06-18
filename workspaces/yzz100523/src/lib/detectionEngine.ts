import type { DetectionMatch, ExemptionReason } from '../types'
import {
  KEYWORD_RULES,
  PATTERN_RULES,
  COMBI_RULES,
  NEGATION_PREFIXES,
  CONTEXT_EXEMPTION_PREFIXES,
  type KeywordRule,
} from './rules'

export interface SentenceInfo {
  text: string
  startOffset: number
  endOffset: number
  lineNumber: number
}

export function splitSentences(text: string): SentenceInfo[] {
  const sentences: SentenceInfo[] = []
  const lines = text.split('\n')
  let offset = 0

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    const lineStart = offset

    const regex = /[^。！？!?；;\n]+[。！？!?；;\n]?/g
    let m: RegExpExecArray | null
    let lastEnd = 0

    while ((m = regex.exec(line)) !== null) {
      const sentence = m[0].trim()
      if (sentence) {
        const sStart = lineStart + m.index
        const sEnd = sStart + sentence.length
        sentences.push({
          text: sentence,
          startOffset: sStart,
          endOffset: sEnd,
          lineNumber: lineIdx + 1,
        })
      }
      lastEnd = m.index + m[0].length
      if (m[0].length === 0) regex.lastIndex++
    }

    if (sentences.length === 0 || sentences[sentences.length - 1].lineNumber !== lineIdx + 1) {
      if (line.trim()) {
        sentences.push({
          text: line.trim(),
          startOffset: lineStart,
          endOffset: lineStart + line.length,
          lineNumber: lineIdx + 1,
        })
      }
    }

    offset += line.length + 1
  }

  return sentences
}

function hasNegation(sentence: string, keywordStart: number): boolean {
  const prefix = sentence.substring(0, keywordStart)
  return NEGATION_PREFIXES.some(n => prefix.endsWith(n) || prefix.includes(n))
}

function findContextExemption(
  sentence: string,
  prevSentence: string | undefined,
): { reason: ExemptionReason; confidence: number } | null {
  const context = `${prevSentence ?? ''} ${sentence}`
  for (const rule of CONTEXT_EXEMPTION_PREFIXES) {
    for (const kw of rule.keywords) {
      if (context.includes(kw)) {
        return { reason: rule.reason, confidence: context.startsWith(kw) ? 0.85 : 0.6 }
      }
    }
  }
  return null
}

function overlap(a: { startOffset: number; endOffset: number }, b: { startOffset: number; endOffset: number }) {
  return a.startOffset < b.endOffset && b.startOffset < a.endOffset
}

function removeOverlapping(matches: DetectionMatch[]): DetectionMatch[] {
  const sorted = [...matches].sort((a, b) => {
    const sevWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    const sDiff = sevWeight[b.severity] - sevWeight[a.severity]
    if (sDiff !== 0) return sDiff
    return (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset)
  })

  const kept: DetectionMatch[] = []
  for (const m of sorted) {
    if (!kept.some(k => overlap(k, m))) {
      kept.push(m)
    }
  }
  return kept.sort((a, b) => a.startOffset - b.startOffset)
}

function expandMatch(sentence: SentenceInfo, keywordStart: number, keywordEnd: number, range = 18) {
  const relStart = keywordStart - sentence.startOffset
  const relEnd = keywordEnd - sentence.startOffset
  const expandStart = Math.max(0, relStart - range)
  const expandEnd = Math.min(sentence.text.length, relEnd + range)
  return sentence.text.substring(expandStart, expandEnd).trim()
}

export function detectViolations(text: string): DetectionMatch[] {
  const sentences = splitSentences(text)
  const matches: DetectionMatch[] = []

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    const prevText = i > 0 ? sentences[i - 1].text : undefined
    const ctxExempt = findContextExemption(sentence.text, prevText)

    for (const rule of KEYWORD_RULES) {
      let idx = 0
      while (true) {
        const pos = sentence.text.indexOf(rule.keyword, idx)
        if (pos === -1) break
        idx = pos + rule.keyword.length

        if (rule.negationExcludable && hasNegation(sentence.text, pos)) {
          continue
        }

        const startOffset = sentence.startOffset + pos
        const endOffset = startOffset + rule.keyword.length
        const originalText = expandMatch(sentence, startOffset, endOffset)

        const contextScore = ctxExempt ? (ctxExempt.reason === 'SLIP_OF_TONGUE' ? 0.4 : 0.5) : 1

        matches.push({
          type: rule.type,
          severity: rule.severity,
          matchedKeyword: rule.keyword,
          startOffset,
          endOffset,
          lineNumber: sentence.lineNumber,
          originalText,
          ruleBasis: rule.ruleBasis,
          suggestion: rule.suggestion,
          contextScore,
        })
      }
    }

    for (const rule of PATTERN_RULES) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g')
      let m: RegExpExecArray | null
      while ((m = regex.exec(sentence.text)) !== null) {
        if (m[0].length === 0) { regex.lastIndex++; continue }

        const startOffset = sentence.startOffset + m.index
        const endOffset = startOffset + m[0].length
        const originalText = expandMatch(sentence, startOffset, endOffset)

        matches.push({
          type: rule.type,
          severity: rule.severity,
          matchedKeyword: m[0],
          startOffset,
          endOffset,
          lineNumber: sentence.lineNumber,
          originalText,
          ruleBasis: rule.ruleBasis,
          suggestion: rule.suggestion,
          contextScore: ctxExempt ? 0.55 : 1,
        })
      }
    }

    for (const rule of COMBI_RULES) {
      const hits = rule.keywords.filter(kw => sentence.text.includes(kw))
      if (hits.length >= rule.minHits) {
        const firstKw = hits[0]
        const pos = sentence.text.indexOf(firstKw)
        const startOffset = sentence.startOffset + pos
        const endOffset = startOffset + firstKw.length

        matches.push({
          type: rule.type,
          severity: rule.severity,
          matchedKeyword: hits.join(' + '),
          startOffset,
          endOffset,
          lineNumber: sentence.lineNumber,
          originalText: sentence.text,
          ruleBasis: rule.ruleBasis,
          suggestion: rule.suggestion,
          contextScore: ctxExempt ? 0.55 : 1,
        })
      }
    }
  }

  return removeOverlapping(matches)
}

export type { DetectionMatch } from '../types'

export function suggestReviewPriority(match: DetectionMatch): 'CONFIRM' | 'REVIEW' | 'LIKELY_EXEMPT' {
  if (match.contextScore >= 0.9) return 'CONFIRM'
  if (match.contextScore >= 0.6) return 'REVIEW'
  return 'LIKELY_EXEMPT'
}
