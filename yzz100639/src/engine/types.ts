export type RiskCategory = 'absolute' | 'political' | 'data_source' | 'exaggeration'
export type RiskSeverity = 'high' | 'medium' | 'low'
export type QuoteCategory = 'leadership_quote' | 'customer_testimonial' | 'historical_honor' | 'general'

export interface Rule {
  id: string
  category: RiskCategory
  label: string
  severity: RiskSeverity
  rewriteHint: string
  match: (sentence: string) => boolean
}

export interface RiskItem {
  id: string
  ruleId: string
  category: RiskCategory
  severity: RiskSeverity
  rewriteSuggestion: string
  confirmed: boolean
}

export interface Sentence {
  id: string
  lineNumber: number
  content: string
  quoteCategory: QuoteCategory
  risks: RiskItem[]
}

export interface Scan {
  id: string
  text: string
  sentences: Sentence[]
  createdAt: number
  confirmedKeys: Set<string>
}

export interface ExportItem {
  lineNumber: number
  originalSentence: string
  riskCategory: string
  riskLabel: string
  severity: RiskSeverity
  rewriteSuggestion: string
  confirmed: boolean
  quoteCategory: QuoteCategory
}

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  absolute: '绝对化表述',
  political: '涉政敏感',
  data_source: '数据口径缺来源',
  exaggeration: '夸大表述',
}

export const RISK_SEVERITY_LABELS: Record<RiskSeverity, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}

export const QUOTE_CATEGORY_LABELS: Record<QuoteCategory, string> = {
  leadership_quote: '领导讲话',
  customer_testimonial: '客户评价',
  historical_honor: '历史荣誉',
  general: '一般表述',
}
