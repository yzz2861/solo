import { create } from "zustand"
import { TrainingRecord, WeakPoint } from "@/types"
import { loadFromStorage, saveToStorage } from "@/utils/storage"

interface ScoreStore {
  records: TrainingRecord[]
  currentPlayerName: string

  setPlayerName: (name: string) => void
  addRecord: (record: TrainingRecord) => void
  getRecordsByLevel: (levelId: string) => TrainingRecord[]
  getRecordsByPlayer: (name: string) => TrainingRecord[]
  getWeakPointSummary: (levelId: string) => WeakPoint[]
  clearRecords: () => void
  loadRecords: () => void
}

export const useScoreStore = create<ScoreStore>((set, get) => ({
  records: [],
  currentPlayerName: "站务员",

  setPlayerName: (name) => set({ currentPlayerName: name }),

  addRecord: (record) => {
    const records = [...get().records, record]
    saveToStorage("training_records", records)
    set({ records })
  },

  getRecordsByLevel: (levelId) => {
    return get().records.filter(r => r.levelId === levelId)
  },

  getRecordsByPlayer: (name) => {
    return get().records.filter(r => r.playerName === name)
  },

  getWeakPointSummary: (levelId) => {
    const records = get().records.filter(r => r.levelId === levelId)
    const summary = new Map<string, WeakPoint>()
    for (const r of records) {
      for (const wp of r.weakPoints) {
        const existing = summary.get(wp.transferPointId)
        if (existing) {
          existing.avgResponseTime = (existing.avgResponseTime + wp.avgResponseTime) / 2
          existing.congestionOccurrences += wp.congestionOccurrences
        } else {
          summary.set(wp.transferPointId, { ...wp })
        }
      }
    }
    return Array.from(summary.values()).sort((a, b) => b.congestionOccurrences - a.congestionOccurrences)
  },

  clearRecords: () => {
    saveToStorage("training_records", [])
    set({ records: [] })
  },

  loadRecords: () => {
    const records = loadFromStorage<TrainingRecord[]>("training_records", [])
    set({ records })
  }
}))
