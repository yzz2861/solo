import { create } from 'zustand'
import type { ViewMode } from '@/types'

interface UIState {
  selectedPlacementId: string | null
  viewMode: ViewMode
  showValidation: boolean
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
  compareLeftId: string | null
  compareRightId: string | null
  setViewMode: (mode: ViewMode) => void
  setSelectedPlacement: (id: string | null) => void
  toggleValidation: () => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setCompareIds: (left: string | null, right: string | null) => void
}

export const useUIStore = create<UIState>()((set) => ({
  selectedPlacementId: null,
  viewMode: 'free',
  showValidation: true,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  compareLeftId: null,
  compareRightId: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedPlacement: (id) => set({ selectedPlacementId: id }),
  toggleValidation: () => set((state) => ({ showValidation: !state.showValidation })),
  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
  setCompareIds: (left, right) => set({ compareLeftId: left, compareRightId: right }),
}))
