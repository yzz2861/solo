import { create } from 'zustand'
import type { Scan, Sentence, RiskCategory, ExportItem } from '@/engine/types'
import { scanText, rescanText, getRiskSentences, makeConfirmedKey } from '@/engine/scanner'
import { RISK_CATEGORY_LABELS } from '@/engine/types'

interface ScanStore {
  currentScan: Scan | null
  isScanning: boolean
  filterCategory: RiskCategory | 'all'
  editingText: string

  startScan: (text: string) => void
  rescan: () => void
  confirmRisk: (sentenceId: string, riskId: string) => void
  unconfirmRisk: (sentenceId: string, riskId: string) => void
  setFilterCategory: (category: RiskCategory | 'all') => void
  setEditingText: (text: string) => void
  applyRewrite: (sentenceId: string, riskId: string) => void
  getExportItems: () => ExportItem[]
  getRiskSentences: () => Sentence[]
  getFilteredSentences: () => Sentence[]
  clearScan: () => void
}

export const useScanStore = create<ScanStore>((set, get) => ({
  currentScan: null,
  isScanning: false,
  filterCategory: 'all',
  editingText: '',

  startScan: (text: string) => {
    set({ isScanning: true, editingText: text })
    setTimeout(() => {
      const scan = scanText(text)
      set({ currentScan: scan, isScanning: false })
    }, 800)
  },

  rescan: () => {
    const { currentScan, editingText } = get()
    if (!currentScan) return
    set({ isScanning: true })
    setTimeout(() => {
      const newScan = rescanText(editingText, currentScan.confirmedKeys)
      set({ currentScan: newScan, isScanning: false })
    }, 800)
  },

  confirmRisk: (sentenceId: string, riskId: string) => {
    const { currentScan } = get()
    if (!currentScan) return
    const updatedSentences = currentScan.sentences.map(s => {
      if (s.id !== sentenceId) return s
      return {
        ...s,
        risks: s.risks.map(r => r.id === riskId ? { ...r, confirmed: true } : r),
      }
    })
    const targetSentence = currentScan.sentences.find(s => s.id === sentenceId)
    const targetRisk = targetSentence?.risks.find(r => r.id === riskId)
    const confirmedKey = targetSentence && targetRisk
      ? makeConfirmedKey(targetSentence.lineNumber, targetRisk.ruleId, targetSentence.content.slice(0, 20))
      : ''
    const newConfirmedKeys = new Set(currentScan.confirmedKeys)
    if (confirmedKey) newConfirmedKeys.add(confirmedKey)
    set({ currentScan: { ...currentScan, sentences: updatedSentences, confirmedKeys: newConfirmedKeys } })
  },

  unconfirmRisk: (sentenceId: string, riskId: string) => {
    const { currentScan } = get()
    if (!currentScan) return
    const updatedSentences = currentScan.sentences.map(s => {
      if (s.id !== sentenceId) return s
      return {
        ...s,
        risks: s.risks.map(r => r.id === riskId ? { ...r, confirmed: false } : r),
      }
    })
    const targetSentence = currentScan.sentences.find(s => s.id === sentenceId)
    const targetRisk = targetSentence?.risks.find(r => r.id === riskId)
    const confirmedKey = targetSentence && targetRisk
      ? makeConfirmedKey(targetSentence.lineNumber, targetRisk.ruleId, targetSentence.content.slice(0, 20))
      : ''
    const newConfirmedKeys = new Set(currentScan.confirmedKeys)
    if (confirmedKey) newConfirmedKeys.delete(confirmedKey)
    set({ currentScan: { ...currentScan, sentences: updatedSentences, confirmedKeys: newConfirmedKeys } })
  },

  setFilterCategory: (category) => set({ filterCategory: category }),

  setEditingText: (text) => set({ editingText: text }),

  applyRewrite: (sentenceId: string, riskId: string) => {
    const { currentScan, editingText } = get()
    if (!currentScan) return
    const sentence = currentScan.sentences.find(s => s.id === sentenceId)
    if (!sentence) return
    const risk = sentence.risks.find(r => r.id === riskId)
    if (!risk) return
    const newText = editingText.replace(sentence.content, `[已标记修改] ${sentence.content}`)
    set({ editingText: newText })
  },

  getExportItems: (): ExportItem[] => {
    const { currentScan } = get()
    if (!currentScan) return []
    const items: ExportItem[] = []
    for (const s of currentScan.sentences) {
      for (const r of s.risks) {
        items.push({
          lineNumber: s.lineNumber,
          originalSentence: s.content,
          riskCategory: r.category,
          riskLabel: RISK_CATEGORY_LABELS[r.category],
          severity: r.severity,
          rewriteSuggestion: r.rewriteSuggestion,
          confirmed: r.confirmed,
          quoteCategory: s.quoteCategory,
        })
      }
    }
    return items
  },

  getRiskSentences: (): Sentence[] => {
    const { currentScan } = get()
    if (!currentScan) return []
    return getRiskSentences(currentScan)
  },

  getFilteredSentences: (): Sentence[] => {
    const { currentScan, filterCategory } = get()
    if (!currentScan) return []
    const riskSentences = getRiskSentences(currentScan)
    if (filterCategory === 'all') return riskSentences
    return riskSentences.filter(s => s.risks.some(r => r.category === filterCategory))
  },

  clearScan: () => set({ currentScan: null, isScanning: false, editingText: '', filterCategory: 'all' }),
}))
