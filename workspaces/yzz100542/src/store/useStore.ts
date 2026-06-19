import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TruckState {
  x: number
  z: number
  rotation: number
  speed: number
}

export interface GateState {
  x: number
  z: number
  rotation: number
}

export interface BarrierItem {
  id: string
  x: number
  z: number
  rotation: number
  length: number
}

export interface WalkwayState {
  x: number
  z: number
  rotation: number
  width: number
  length: number
}

export interface CommanderState {
  x: number
  z: number
}

export interface TempBarrierItem {
  id: string
  x: number
  z: number
  rotation: number
}

export interface AlertItem {
  id: string
  type: 'overspeed' | 'blindspot' | 'walkway_blocked' | 'view_blocked'
  severity: 'danger' | 'warning'
  message: string
  active: boolean
}

export interface SceneLayout {
  id: string
  name: string
  timestamp: number
  truck: TruckState
  gate: GateState
  barriers: BarrierItem[]
  walkway: WalkwayState
  commander: CommanderState
  tempBarriers: TempBarrierItem[]
}

export interface BriefingPlan {
  id: string
  name: string
  timestamp: number
  layout: SceneLayout
  topViewImage: string
  driverViewImage: string
}

const defaultLayout: SceneLayout = {
  id: 'default',
  name: '默认布局',
  timestamp: Date.now(),
  truck: { x: 0, z: 12, rotation: 0, speed: 5 },
  gate: { x: 0, z: -2, rotation: 0 },
  barriers: [
    { id: 'b1', x: -6, z: 5, rotation: 0, length: 16 },
    { id: 'b2', x: 6, z: 5, rotation: 0, length: 16 },
    { id: 'b3', x: 8, z: -4, rotation: Math.PI / 2, length: 8 },
    { id: 'b4', x: -6, z: -4, rotation: Math.PI / 2, length: 4 },
  ],
  walkway: { x: 3.5, z: 4, rotation: 0, width: 1.5, length: 12 },
  commander: { x: 4, z: -1 },
  tempBarriers: [],
}

interface AppState {
  layout: SceneLayout
  updateTruck: (truck: Partial<TruckState>) => void
  updateGate: (gate: Partial<GateState>) => void
  updateBarrier: (id: string, update: Partial<BarrierItem>) => void
  updateWalkway: (walkway: Partial<WalkwayState>) => void
  updateCommander: (commander: Partial<CommanderState>) => void
  addTempBarrier: () => void
  removeTempBarrier: (id: string) => void
  updateTempBarrier: (id: string, update: Partial<TempBarrierItem>) => void

  isPlaying: boolean
  animProgress: number
  setPlaying: (playing: boolean) => void
  setAnimProgress: (progress: number) => void
  resetAnimation: () => void

  cameraMode: 'overview' | 'driver'
  setCameraMode: (mode: 'overview' | 'driver') => void

  alerts: AlertItem[]
  setAlerts: (alerts: AlertItem[]) => void

  plans: BriefingPlan[]
  savePlan: (name: string, topViewImage: string, driverViewImage: string) => void
  deletePlan: (id: string) => void

  selectedObject: string | null
  setSelectedObject: (id: string | null) => void

  showBlindZone: boolean
  setShowBlindZone: (show: boolean) => void

  showTurnPath: boolean
  setShowTurnPath: (show: boolean) => void

  resetLayout: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      layout: { ...defaultLayout },
      updateTruck: (truck) =>
        set((s) => ({ layout: { ...s.layout, truck: { ...s.layout.truck, ...truck } } })),
      updateGate: (gate) =>
        set((s) => ({ layout: { ...s.layout, gate: { ...s.layout.gate, ...gate } } })),
      updateBarrier: (id, update) =>
        set((s) => ({
          layout: {
            ...s.layout,
            barriers: s.layout.barriers.map((b) =>
              b.id === id ? { ...b, ...update } : b
            ),
          },
        })),
      updateWalkway: (walkway) =>
        set((s) => ({
          layout: { ...s.layout, walkway: { ...s.layout.walkway, ...walkway } },
        })),
      updateCommander: (commander) =>
        set((s) => ({
          layout: { ...s.layout, commander: { ...s.layout.commander, ...commander } },
        })),
      addTempBarrier: () =>
        set((s) => ({
          layout: {
            ...s.layout,
            tempBarriers: [
              ...s.layout.tempBarriers,
              {
                id: `tb_${Date.now()}`,
                x: 0,
                z: 0,
                rotation: 0,
              },
            ],
          },
        })),
      removeTempBarrier: (id) =>
        set((s) => ({
          layout: {
            ...s.layout,
            tempBarriers: s.layout.tempBarriers.filter((b) => b.id !== id),
          },
        })),
      updateTempBarrier: (id, update) =>
        set((s) => ({
          layout: {
            ...s.layout,
            tempBarriers: s.layout.tempBarriers.map((b) =>
              b.id === id ? { ...b, ...update } : b
            ),
          },
        })),

      isPlaying: false,
      animProgress: 0,
      setPlaying: (playing) => set({ isPlaying: playing }),
      setAnimProgress: (progress) => set({ animProgress: progress }),
      resetAnimation: () => set({ isPlaying: false, animProgress: 0 }),

      cameraMode: 'overview',
      setCameraMode: (mode) => set({ cameraMode: mode }),

      alerts: [],
      setAlerts: (alerts) => set({ alerts }),

      plans: [],
      savePlan: (name, topViewImage, driverViewImage) =>
        set((s) => ({
          plans: [
            ...s.plans,
            {
              id: `plan_${Date.now()}`,
              name,
              timestamp: Date.now(),
              layout: { ...s.layout, id: `layout_${Date.now()}`, name, timestamp: Date.now() },
              topViewImage,
              driverViewImage,
            },
          ],
        })),
      deletePlan: (id) =>
        set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),

      selectedObject: null,
      setSelectedObject: (id) => set({ selectedObject: id }),

      showBlindZone: true,
      setShowBlindZone: (show) => set({ showBlindZone: show }),

      showTurnPath: true,
      setShowTurnPath: (show) => set({ showTurnPath: show }),

      resetLayout: () => set({ layout: { ...defaultLayout, timestamp: Date.now() } }),
    }),
    {
      name: 'blindspot-rehearsal-storage',
      partialize: (state) => ({ plans: state.plans }),
    }
  )
)
