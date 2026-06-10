import { create } from "zustand"
import { LevelConfig, EditorTool, Position, Entrance, Exit, Escalator, TransferPoint, LevelEvent } from "@/types"

interface EditorStore {
  level: Partial<LevelConfig>
  selectedTool: EditorTool
  selectedElementId: string | null

  setTool: (tool: EditorTool) => void
  setGridSize: (cols: number, rows: number) => void
  setLevelName: (name: string) => void
  setStationName: (name: string) => void
  setDifficulty: (d: 1 | 2 | 3 | 4 | 5) => void
  setTimeLimit: (t: number) => void
  setMaxGuides: (n: number) => void
  setMaxFences: (n: number) => void

  addWall: (x: number, y: number) => void
  removeWall: (x: number, y: number) => void
  addEntrance: (e: Entrance) => void
  updateEntrance: (id: string, updates: Partial<Entrance>) => void
  removeEntrance: (id: string) => void
  addExit: (e: Exit) => void
  updateExit: (id: string, updates: Partial<Exit>) => void
  removeExit: (id: string) => void
  addEscalator: (e: Escalator) => void
  updateEscalator: (id: string, updates: Partial<Escalator>) => void
  removeEscalator: (id: string) => void
  addTransferPoint: (t: TransferPoint) => void
  removeTransferPoint: (id: string) => void
  addEvent: (e: LevelEvent) => void
  updateEvent: (id: string, updates: Partial<LevelEvent>) => void
  removeEvent: (id: string) => void

  loadLevel: (level: LevelConfig) => void
  exportLevel: () => LevelConfig | null
  resetEditor: () => void
  setSelectedElement: (id: string | null) => void
}

const defaultLevel: Partial<LevelConfig> = {
  name: "",
  stationName: "",
  difficulty: 1,
  gridSize: { cols: 20, rows: 15 },
  cellSize: 32,
  walls: [],
  passages: [],
  entrances: [],
  exits: [],
  escalators: [],
  transferPoints: [],
  timeLimit: 120,
  events: [],
  maxGuides: 5,
  maxFences: 20
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  level: { ...defaultLevel },
  selectedTool: "wall",
  selectedElementId: null,

  setTool: (tool) => set({ selectedTool: tool }),
  setGridSize: (cols, rows) => set(s => ({ level: { ...s.level, gridSize: { cols, rows } } })),
  setLevelName: (name) => set(s => ({ level: { ...s.level, name } })),
  setStationName: (name) => set(s => ({ level: { ...s.level, stationName: name } })),
  setDifficulty: (d) => set(s => ({ level: { ...s.level, difficulty: d } })),
  setTimeLimit: (t) => set(s => ({ level: { ...s.level, timeLimit: t } })),
  setMaxGuides: (n) => set(s => ({ level: { ...s.level, maxGuides: n } })),
  setMaxFences: (n) => set(s => ({ level: { ...s.level, maxFences: n } })),

  addWall: (x, y) => set(s => {
    const walls = s.level.walls || []
    if (walls.some(w => w.x === x && w.y === y)) return s
    return { level: { ...s.level, walls: [...walls, { x, y }] } }
  }),
  removeWall: (x, y) => set(s => ({
    level: { ...s.level, walls: (s.level.walls || []).filter(w => !(w.x === x && w.y === y)) }
  })),

  addEntrance: (e) => set(s => ({
    level: { ...s.level, entrances: [...(s.level.entrances || []), e] }
  })),
  updateEntrance: (id, updates) => set(s => ({
    level: {
      ...s.level,
      entrances: (s.level.entrances || []).map(e => e.id === id ? { ...e, ...updates } : e)
    }
  })),
  removeEntrance: (id) => set(s => ({
    level: { ...s.level, entrances: (s.level.entrances || []).filter(e => e.id !== id) }
  })),

  addExit: (e) => set(s => ({
    level: { ...s.level, exits: [...(s.level.exits || []), e] }
  })),
  updateExit: (id, updates) => set(s => ({
    level: {
      ...s.level,
      exits: (s.level.exits || []).map(e => e.id === id ? { ...e, ...updates } : e)
    }
  })),
  removeExit: (id) => set(s => ({
    level: { ...s.level, exits: (s.level.exits || []).filter(e => e.id !== id) }
  })),

  addEscalator: (e) => set(s => ({
    level: { ...s.level, escalators: [...(s.level.escalators || []), e] }
  })),
  updateEscalator: (id, updates) => set(s => ({
    level: {
      ...s.level,
      escalators: (s.level.escalators || []).map(e => e.id === id ? { ...e, ...updates } : e)
    }
  })),
  removeEscalator: (id) => set(s => ({
    level: { ...s.level, escalators: (s.level.escalators || []).filter(e => e.id !== id) }
  })),

  addTransferPoint: (t) => set(s => ({
    level: { ...s.level, transferPoints: [...(s.level.transferPoints || []), t] }
  })),
  removeTransferPoint: (id) => set(s => ({
    level: { ...s.level, transferPoints: (s.level.transferPoints || []).filter(t => t.id !== id) }
  })),

  addEvent: (e) => set(s => ({
    level: { ...s.level, events: [...(s.level.events || []), e] }
  })),
  updateEvent: (id, updates) => set(s => ({
    level: {
      ...s.level,
      events: (s.level.events || []).map(ev => ev.id === id ? { ...ev, ...updates } : ev)
    }
  })),
  removeEvent: (id) => set(s => ({
    level: { ...s.level, events: (s.level.events || []).filter(ev => ev.id !== id) }
  })),

  loadLevel: (level) => set({ level: { ...level }, selectedTool: "select", selectedElementId: null }),

  exportLevel: () => {
    const { level } = get()
    if (!level.name || !level.stationName || !level.gridSize) return null
    return {
      id: level.id || `level_${Date.now()}`,
      name: level.name,
      stationName: level.stationName,
      difficulty: level.difficulty || 1,
      gridSize: level.gridSize,
      cellSize: level.cellSize || 32,
      walls: level.walls || [],
      passages: level.passages || [],
      entrances: level.entrances || [],
      exits: level.exits || [],
      escalators: level.escalators || [],
      transferPoints: level.transferPoints || [],
      timeLimit: level.timeLimit || 120,
      events: level.events || [],
      maxGuides: level.maxGuides || 5,
      maxFences: level.maxFences || 20
    } as LevelConfig
  },

  resetEditor: () => set({ level: { ...defaultLevel }, selectedTool: "wall", selectedElementId: null }),
  setSelectedElement: (id) => set({ selectedElementId: id })
}))
