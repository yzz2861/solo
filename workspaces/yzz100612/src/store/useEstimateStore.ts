import { create } from 'zustand'
import type { EstimateInput, EstimateRecord, EstimateResult } from '@/types'
import { calculateEstimate } from '@/utils/calculator'

interface EstimateState {
  input: EstimateInput
  result: EstimateResult | null
  records: EstimateRecord[]
  setInput: (partial: Partial<EstimateInput>) => void
  calculate: () => void
  saveRecord: () => void
  deleteRecord: (id: string) => void
  clearInput: () => void
  loadRecord: (id: string) => void
}

const defaultInput: EstimateInput = {
  waterDepth: 5,
  depthUnit: 'm',
  boatLength: 8,
  anchorType: 'danforth',
  windLevel: 3,
  windUnit: 'beaufort',
  waveHeight: 0.3,
  waveUnit: 'm',
  mooringHours: 4,
  location: '',
  isNight: false,
}

function loadRecords(): EstimateRecord[] {
  try {
    const data = localStorage.getItem('anchor-records')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveRecords(records: EstimateRecord[]) {
  localStorage.setItem('anchor-records', JSON.stringify(records))
}

export const useEstimateStore = create<EstimateState>((set, get) => ({
  input: { ...defaultInput },
  result: null,
  records: loadRecords(),

  setInput: (partial) =>
    set((state) => ({
      input: { ...state.input, ...partial },
    })),

  calculate: () => {
    const { input } = get()
    const result = calculateEstimate(input)
    set({ result })
  },

  saveRecord: () => {
    const { input, result, records } = get()
    if (!result) return
    const record: EstimateRecord = {
      ...input,
      ...result,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    const updated = [record, ...records]
    saveRecords(updated)
    set({ records: updated })
  },

  deleteRecord: (id) => {
    const updated = get().records.filter((r) => r.id !== id)
    saveRecords(updated)
    set({ records: updated })
  },

  clearInput: () => set({ input: { ...defaultInput }, result: null }),

  loadRecord: (id) => {
    const record = get().records.find((r) => r.id === id)
    if (!record) return
    const { id: _id, timestamp: _ts, ...input } = record
    const { recommendedLength: _rl, minLength: _ml, maxLength: _mxl, scopeRatio: _sr, minScope: _ms, maxScope: _mxs, riskLevel: _rl2, warnings: _w } = record
    set({ input: input as EstimateInput })
    const result = calculateEstimate(input as EstimateInput)
    set({ result })
  },
}))
