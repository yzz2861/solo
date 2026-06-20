import { create } from 'zustand'
import type { DilutionRecord, UsagePreset } from '@/types'
import { DEFAULT_PRESETS } from '@/types'

interface DilutionState {
  records: DilutionRecord[]
  presets: UsagePreset[]
  addRecord: (record: DilutionRecord) => void
  deleteRecord: (id: string) => void
  clearRecords: () => void
  addPreset: (preset: UsagePreset) => void
  updatePreset: (id: string, preset: Partial<UsagePreset>) => void
  deletePreset: (id: string) => void
  loadFromStorage: () => void
}

const STORAGE_KEY_RECORDS = 'dilution_records'
const STORAGE_KEY_PRESETS = 'dilution_presets'

export const useDilutionStore = create<DilutionState>((set, get) => ({
  records: [],
  presets: DEFAULT_PRESETS,

  addRecord: (record) => {
    set((state) => {
      const records = [record, ...state.records]
      try {
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records))
      } catch { /* ignore */ }
      return { records }
    })
  },

  deleteRecord: (id) => {
    set((state) => {
      const records = state.records.filter(r => r.id !== id)
      try {
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records))
      } catch { /* ignore */ }
      return { records }
    })
  },

  clearRecords: () => {
    set({ records: [] })
    try {
      localStorage.removeItem(STORAGE_KEY_RECORDS)
    } catch { /* ignore */ }
  },

  addPreset: (preset) => {
    set((state) => {
      const presets = [...state.presets, preset]
      try {
        localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets))
      } catch { /* ignore */ }
      return { presets }
    })
  },

  updatePreset: (id, updates) => {
    set((state) => {
      const presets = state.presets.map(p => p.id === id ? { ...p, ...updates } : p)
      try {
        localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets))
      } catch { /* ignore */ }
      return { presets }
    })
  },

  deletePreset: (id) => {
    set((state) => {
      const presets = state.presets.filter(p => p.id !== id)
      try {
        localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets))
      } catch { /* ignore */ }
      return { presets }
    })
  },

  loadFromStorage: () => {
    try {
      const recordsStr = localStorage.getItem(STORAGE_KEY_RECORDS)
      const presetsStr = localStorage.getItem(STORAGE_KEY_PRESETS)
      const records = recordsStr ? JSON.parse(recordsStr) : []
      const presets = presetsStr ? JSON.parse(presetsStr) : DEFAULT_PRESETS
      set({ records, presets })
    } catch {
      set({ records: [], presets: DEFAULT_PRESETS })
    }
  },
}))
