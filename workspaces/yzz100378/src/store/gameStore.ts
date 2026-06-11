import { create } from "zustand"
import {
  GameState, GamePhase, Fence, Guide, Passenger, LevelConfig,
  ActiveEvent, ReplayFrame, GameTool
} from "@/types"
import {
  createInitialState, spawnPassengers, updatePassengers,
  processEvents, recalculatePaths
} from "@/engine/simulator"
import { calculateScore, calculatePassedRate } from "@/engine/scoring"
import { buildCongestionHeatmap } from "@/engine/collision"
import { GUIDE_INFLUENCE_RADIUS } from "@/engine/pathfinding"

interface GameStore extends GameState {
  level: LevelConfig | null
  selectedTool: GameTool
  surgeMultipliers: Record<string, number>
  eventMessages: Array<{ id: string; message: string; type: string; timestamp: number }>
  replayFrames: ReplayFrame[]
  lastPlacedGuide: string | null

  loadLevel: (level: LevelConfig) => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  tick: (dt: number) => void
  addFence: (x: number, y: number, orientation: "h" | "v") => void
  removeFence: (id: string) => void
  addGuide: (x: number, y: number, targetEntranceId: string) => void
  removeGuide: (id: string) => void
  toggleEscalator: (id: string) => void
  setSelectedTool: (tool: GameTool) => void
  finishGame: () => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  levelId: "",
  phase: "preparing" as GamePhase,
  elapsedTime: 0,
  score: 0,
  fences: [],
  guides: [],
  escalatorStates: {},
  closedExits: {},
  passengers: [],
  activeEvents: [],
  totalSpawned: 0,
  totalExited: 0,
  congestionPenalty: 0,
  detourPenalty: 0,
  eventBonus: 0,
  guideBonus: 0,
  assistedByGuide: 0,
  level: null,
  selectedTool: "select" as GameTool,
  surgeMultipliers: {},
  eventMessages: [],
  replayFrames: [],
  lastPlacedGuide: null,

  loadLevel: (level: LevelConfig) => {
    const initial = createInitialState(level)
    set({
      ...initial,
      level,
      selectedTool: "select",
      surgeMultipliers: {},
      eventMessages: [],
      replayFrames: [],
      lastPlacedGuide: null
    })
  },

  startGame: () => {
    set({ phase: "running" })
  },

  pauseGame: () => {
    set({ phase: "paused" })
  },

  resumeGame: () => {
    set({ phase: "running" })
  },

  tick: (dt: number) => {
    const state = get()
    if (state.phase !== "running" || !state.level) return

    const level = state.level

    const newPassengers = spawnPassengers(level, state, dt, state.surgeMultipliers)
    const stateWithNewPassengers = {
      ...state,
      passengers: [...state.passengers, ...newPassengers],
      totalSpawned: state.totalSpawned + newPassengers.length
    }

    const { state: stateAfterEvents, eventResults } = processEvents(level, stateWithNewPassengers)
    const newMessages = eventResults.map((er, i) => ({
      id: `msg_${Date.now()}_${i}`,
      message: er.result.message,
      type: er.result.type,
      timestamp: state.elapsedTime
    }))

    let newSurge = { ...state.surgeMultipliers }
    for (const er of eventResults) {
      if (er.result.surgeEntranceId && er.result.surgeMultiplier) {
        newSurge[er.result.surgeEntranceId] = er.result.surgeMultiplier
      }
    }

    const stateForUpdate = { ...stateAfterEvents, surgeMultipliers: newSurge }
    const updatedState = updatePassengers(stateForUpdate, level, dt)

    const newElapsed = state.elapsedTime + dt
    const score = calculateScore(updatedState, level)

    const frame: ReplayFrame = {
      timestamp: newElapsed,
      passengers: updatedState.passengers.map(p => ({
        id: p.id, x: p.x, y: p.y, state: p.state
      })),
      fences: updatedState.fences.map(f => ({ x: f.x, y: f.y })),
      guides: updatedState.guides.map(g => ({ x: g.x, y: g.y })),
      congestionHeatmap: buildCongestionHeatmap(
        updatedState.passengers, level.gridSize.cols, level.gridSize.rows
      )
    }

    const isFinished = newElapsed >= level.timeLimit
    const finalExited = updatedState.passengers.filter(p => p.state === "exited").length

    set({
      ...updatedState,
      elapsedTime: newElapsed,
      score,
      totalExited: Math.max(updatedState.totalExited, finalExited),
      phase: isFinished ? "finished" : "running",
      eventMessages: [...state.eventMessages.slice(-4), ...newMessages],
      replayFrames: [...state.replayFrames, frame]
    })
  },

  addFence: (x: number, y: number, orientation: "h" | "v") => {
    const state = get()
    if (!state.level) return
    if (state.fences.length >= state.level.maxFences) return
    const fence: Fence = { id: `f${Date.now()}`, x, y, orientation }
    const newFences = [...state.fences, fence]
    const newPassengers = recalculatePaths({ ...state, fences: newFences }, state.level)
    set({ fences: newFences, passengers: newPassengers })
  },

  removeFence: (id: string) => {
    const state = get()
    if (!state.level) return
    const newFences = state.fences.filter(f => f.id !== id)
    const newPassengers = recalculatePaths({ ...state, fences: newFences }, state.level)
    set({ fences: newFences, passengers: newPassengers })
  },

  addGuide: (x: number, y: number, targetEntranceId: string) => {
    const state = get()
    if (!state.level) return
    if (state.guides.length >= state.level.maxGuides) return
    const guide: Guide = {
      id: `g${Date.now()}`,
      x, y,
      targetEntranceId,
      influenceRadius: GUIDE_INFLUENCE_RADIUS,
      bonusScore: 0,
      assistedPassengers: 0
    }
    const newGuides = [...state.guides, guide]
    const newPassengers = recalculatePaths({ ...state, guides: newGuides }, state.level)
    set({
      guides: newGuides,
      passengers: newPassengers,
      lastPlacedGuide: guide.id
    })
  },

  removeGuide: (id: string) => {
    const state = get()
    if (!state.level) return
    const newGuides = state.guides.filter(g => g.id !== id)
    const newPassengers = recalculatePaths({ ...state, guides: newGuides }, state.level)
    set({ guides: newGuides, passengers: newPassengers })
  },

  toggleEscalator: (id: string) => {
    const state = get()
    if (!state.level) return
    const newEscalatorStates = {
      ...state.escalatorStates,
      [id]: !state.escalatorStates[id]
    }
    const newPassengers = recalculatePaths({ ...state, escalatorStates: newEscalatorStates }, state.level)
    set({ escalatorStates: newEscalatorStates, passengers: newPassengers })
  },

  setSelectedTool: (tool: GameTool) => {
    set({ selectedTool: tool })
  },

  finishGame: () => {
    const state = get()
    set({ phase: "finished" })
  },

  resetGame: () => {
    const state = get()
    if (state.level) {
      const initial = createInitialState(state.level)
      set({
        ...initial,
        level: state.level,
        selectedTool: "select",
        surgeMultipliers: {},
        eventMessages: [],
        replayFrames: [],
        lastPlacedGuide: null
      })
    }
  }
}))
