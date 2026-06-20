import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mockBridges } from '@/data/mockBridges'
import { mockRecords } from '@/data/mockRecords'

export interface BridgePoint {
  id: string
  name: string
  district: string
  length: number
  lanes: number
  height: number
  notes: string
}

export interface SaltRecord {
  id: string
  bridgeId: string
  bridgeName: string
  timestamp: number
  temperature: number
  humidity: number
  windSpeed: number
  saltAmount: number
  operator: string
  notes: string
}

export interface DispatchItem {
  id: string
  bridgeId: string
  bridgeName: string
  createdAt: number
  scheduledAt: number
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  assignedTo: string
  saltAmount: number
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger'
  notes: string
}

interface AppState {
  bridges: BridgePoint[]
  saltRecords: SaltRecord[]
  dispatches: DispatchItem[]
  addSaltRecord: (rec: Omit<SaltRecord, 'id'>) => void
  addDispatch: (item: Omit<DispatchItem, 'id'>) => void
  updateDispatch: (id: string, patch: Partial<DispatchItem>) => void
  initMockData: () => void
}

const genId = () => Math.random().toString(36).slice(2, 10)

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      bridges: [],
      saltRecords: [],
      dispatches: [],
      addSaltRecord: (rec) =>
        set((state) => ({
          saltRecords: [{ ...rec, id: genId() }, ...state.saltRecords],
        })),
      addDispatch: (item) =>
        set((state) => ({
          dispatches: [{ ...item, id: genId() }, ...state.dispatches],
        })),
      updateDispatch: (id, patch) =>
        set((state) => ({
          dispatches: state.dispatches.map((d) =>
            d.id === id ? { ...d, ...patch } : d
          ),
        })),
      initMockData: () =>
        set(() => ({
          bridges: [...mockBridges],
          saltRecords: [...mockRecords],
          dispatches: [],
        })),
    }),
    {
      name: 'ice-risk-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        'ice-risk:bridges': state.bridges,
        'ice-risk:salt-records': state.saltRecords,
        'ice-risk:dispatches': state.dispatches,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Zustand persist rehydrate error:', error)
          return
        }
        if (!state) return
        const restored = state as unknown as Record<string, unknown>
        state.bridges = (restored['ice-risk:bridges'] as BridgePoint[]) || []
        state.saltRecords = (restored['ice-risk:salt-records'] as SaltRecord[]) || []
        state.dispatches = (restored['ice-risk:dispatches'] as DispatchItem[]) || []
      },
    }
  )
)
