import type { Scan, Sentence, RiskItem } from './types'
import { rules, generateRewrite } from './rules'
import { classifyQuote } from './classifier'

let idCounter = 0
function nextId(): string {
  return `id_${Date.now()}_${idCounter++}`
}

function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[。！？\n])/)
  return parts.map(s => s.trim()).filter(s => s.length > 0)
}

function scanSentence(sentence: string, lineNumber: number, confirmedKeys: Set<string>): Sentence {
  const quoteCategory = classifyQuote(sentence)
  const risks: RiskItem[] = []

  for (const rule of rules) {
    if (rule.match(sentence)) {
      const riskId = nextId()
      const confirmedKey = `${lineNumber}:${rule.id}:${sentence.slice(0, 20)}`
      risks.push({
        id: riskId,
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        rewriteSuggestion: generateRewrite(sentence, rule),
        confirmed: confirmedKeys.has(confirmedKey),
      })
    }
  }

  return {
    id: nextId(),
    lineNumber,
    content: sentence,
    quoteCategory,
    risks,
  }
}

export function scanText(text: string, confirmedKeys: Set<string> = new Set()): Scan {
  const rawSentences = splitSentences(text)
  const sentences: Sentence[] = rawSentences.map((s, i) =>
    scanSentence(s, i + 1, confirmedKeys)
  )

  return {
    id: nextId(),
    text,
    sentences,
    createdAt: Date.now(),
    confirmedKeys,
  }
}

export function rescanText(text: string, previousConfirmedKeys: Set<string>): Scan {
  return scanText(text, previousConfirmedKeys)
}

export function getRiskSentences(scan: Scan): Sentence[] {
  return scan.sentences.filter(s => s.risks.some(r => !r.confirmed))
}

export function getConfirmedSentences(scan: Scan): Sentence[] {
  return scan.sentences.filter(s => s.risks.some(r => r.confirmed))
}

export function makeConfirmedKey(lineNumber: number, ruleId: string, sentenceStart: string): string {
  return `${lineNumber}:${ruleId}:${sentenceStart}`
}
