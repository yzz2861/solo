import { create } from 'zustand'
import type {
  HexCellState,
  HexCoord,
  TouristGroup,
  RescueBoat,
  PendingDispatch,
  Decision,
  GameTurn,
  GameStateSnapshot,
  GameScore,
  ResourceAnalysis,
  TidalWindow,
  WindowStatus,
  LevelConfig,
  GamePhase,
  ReplaySession,
} from '@/types/game'
import { hexKey, hexNeighbors, hexDistance, generateHexGrid } from '@/engine/hexUtils'
import { getWaterLevelAtTurn, updateCellWaterLevels, checkTidalWindow, findTidalWindowsForRoute } from '@/engine/tidalSystem'
import { findPath, estimateTravelTime, isReachable } from '@/engine/pathfinding'
import { calculateScore, analyzeResources, getRiskLevel } from '@/engine/scoring'
import { levels } from '@/data/levels'

interface GameStore {
  phase: GamePhase
  currentTurn: number
  maxTurns: number
  waterLevel: number
  cells: Map<string, HexCellState>
  touristGroups: TouristGroup[]
  boats: RescueBoat[]
  pendingDispatches: PendingDispatch[]
  turnHistory: GameTurn[]
  tidalWindows: TidalWindow[]
  currentLevelId: string | null

  selectedBoatId: string | null
  hoveredCell: HexCoord | null
  previewPath: HexCoord[] | null

  replaySession: ReplaySession | null
  replayTurnIndex: number

  startLevel: (levelId: string) => void
  selectBoat: (boatId: string | null) => void
  dispatchBoat: (boatId: string, targetGroupId: string) => void
  cancelDispatch: (boatId: string) => void
  confirmTurn: () => void
  undoTurn: () => void

  setHoveredCell: (coord: HexCoord | null) => void
  setPreviewPath: (path: HexCoord[] | null) => void

  startReplay: (session: ReplaySession) => void
  setReplayTurn: (index: number) => void
  exitReplay: () => void

  getCellAt: (q: number, r: number) => HexCellState | undefined
  getGroupAt: (q: number, r: number) => TouristGroup | undefined
  getBoatAt: (q: number, r: number) => RescueBoat | undefined
  getTidalWindowStatus: (windowIndex: number) => WindowStatus
  getScore: () => GameScore
  getResourceAnalysis: () => ResourceAnalysis
}

function snapshotFromState(
  waterLevel: number,
  cells: Map<string, HexCellState>,
  touristGroups: TouristGroup[],
  boats: RescueBoat[]
): GameStateSnapshot {
  const cellStates: Record<string, { isSubmerged: boolean; currentWaterLevel: number }> = {}
  for (const [key, cell] of cells) {
    cellStates[key] = { isSubmerged: cell.isSubmerged, currentWaterLevel: cell.currentWaterLevel }
  }
  return {
    waterLevel,
    cellStates,
    touristGroups: touristGroups.map(g => ({ ...g, position: { ...g.position } })),
    boats: boats.map(b => ({
      ...b,
      position: { ...b.position },
      path: b.path.map(p => ({ ...p })),
    })),
  }
}

function restoreFromSnapshot(snapshot: GameStateSnapshot, baseCells: Map<string, HexCellState>): Map<string, HexCellState> {
  const restored = new Map<string, HexCellState>()
  for (const [key, base] of baseCells) {
    const state = snapshot.cellStates[key]
    if (state) {
      restored.set(key, { ...base, currentWaterLevel: state.currentWaterLevel, isSubmerged: state.isSubmerged })
    } else {
      restored.set(key, { ...base })
    }
  }
  return restored
}

function saveReplayToStorage(session: ReplaySession) {
  try {
    const raw = localStorage.getItem('tidal-rescue-replays')
    const existing: ReplaySession[] = raw ? JSON.parse(raw) : []
    existing.push(session)
    localStorage.setItem('tidal-rescue-replays', JSON.stringify(existing))
  } catch {
    // ignore storage errors
  }
}

export const useGameStore = create<GameStore>()((set, get) => ({
  phase: 'planning',
  currentTurn: 0,
  maxTurns: 0,
  waterLevel: 0,
  cells: new Map(),
  touristGroups: [],
  boats: [],
  pendingDispatches: [],
  turnHistory: [],
  tidalWindows: [],
  currentLevelId: null,

  selectedBoatId: null,
  hoveredCell: null,
  previewPath: null,

  replaySession: null,
  replayTurnIndex: 0,

  startLevel: (levelId: string) => {
    const level = levels.find(l => l.id === levelId)
    if (!level) return

    const waterLevel = getWaterLevelAtTurn(level.tidalCurve, 0)
    const cells = new Map<string, HexCellState>()
    for (const cell of level.cells) {
      const key = hexKey(cell.q, cell.r)
      const currentWaterLevel = waterLevel
      const isSubmerged = currentWaterLevel >= cell.baseElevation
      cells.set(key, { ...cell, currentWaterLevel, isSubmerged })
    }

    const touristGroups: TouristGroup[] = level.touristGroups.map(g => ({
      id: g.id,
      position: { ...g.position },
      count: g.count,
      stamina: g.stamina,
      maxStamina: g.maxStamina,
      waitTurns: 0,
      riskLevel: 'low',
      rescued: false,
    }))

    const boats: RescueBoat[] = level.boats.map(b => ({
      id: b.id,
      position: { ...b.position },
      capacity: b.capacity,
      currentLoad: 0,
      status: 'idle',
      path: [],
      pathIndex: 0,
      assignedGroupId: null,
    }))

    set({
      phase: 'planning',
      currentTurn: 0,
      maxTurns: level.maxTurns,
      waterLevel,
      cells,
      touristGroups,
      boats,
      pendingDispatches: [],
      turnHistory: [],
      tidalWindows: level.tidalWindows,
      currentLevelId: levelId,
      selectedBoatId: null,
      hoveredCell: null,
      previewPath: null,
      replaySession: null,
      replayTurnIndex: 0,
    })
  },

  selectBoat: (boatId: string | null) => {
    if (boatId === null) {
      set({ selectedBoatId: null, previewPath: null })
    } else {
      set({ selectedBoatId: boatId })
    }
  },

  dispatchBoat: (boatId: string, targetGroupId: string) => {
    const state = get()
    const boat = state.boats.find(b => b.id === boatId)
    const group = state.touristGroups.find(g => g.id === targetGroupId)
    if (!boat || !group) return

    const path = findPath(boat.position, group.position, state.cells, state.waterLevel)
    if (path.length === 0) return

    const newDispatch: PendingDispatch = {
      boatId,
      path,
      targetGroupId,
    }

    const existing = state.pendingDispatches.filter(d => d.boatId !== boatId)
    set({
      pendingDispatches: [...existing, newDispatch],
      previewPath: path,
    })
  },

  cancelDispatch: (boatId: string) => {
    const state = get()
    const remaining = state.pendingDispatches.filter(d => d.boatId !== boatId)
    const wasPreview = state.previewPath !== null && state.pendingDispatches.some(d => d.boatId === boatId)
    set({
      pendingDispatches: remaining,
      previewPath: wasPreview ? null : state.previewPath,
    })
  },

  confirmTurn: () => {
    const state = get()
    const level = levels.find(l => l.id === state.currentLevelId)
    if (!level) return

    const snapshot = snapshotFromState(state.waterLevel, state.cells, state.touristGroups, state.boats)

    const decisions: Decision[] = state.pendingDispatches.map(d => {
      const group = state.touristGroups.find(g => g.id === d.targetGroupId)
      let tidalWindowStatus: WindowStatus = 'none'
      if (group) {
        const matchingWindowIndex = state.tidalWindows.findIndex(w =>
          state.touristGroups.some(g => {
            const key = hexKey(g.position.q, g.position.r)
            return g.id === d.targetGroupId && w.affectedCells.includes(key)
          })
        )
        if (matchingWindowIndex >= 0) {
          tidalWindowStatus = checkTidalWindow(state.tidalWindows[matchingWindowIndex], state.currentTurn)
        }
      }
      return {
        boatId: d.boatId,
        action: 'dispatch' as const,
        targetPosition: d.path.length > 0 ? d.path[d.path.length - 1] : null,
        targetGroupId: d.targetGroupId,
        tidalWindowStatus,
      }
    })

    const turnRecord: GameTurn = {
      turnNumber: state.currentTurn,
      waterLevel: state.waterLevel,
      decisions,
      snapshot,
    }

    let updatedBoats = state.boats.map(b => ({ ...b, path: b.path.map(p => ({ ...p })), position: { ...b.position } }))

    for (const dispatch of state.pendingDispatches) {
      const boat = updatedBoats.find(b => b.id === dispatch.boatId)
      if (boat) {
        boat.path = dispatch.path.map(p => ({ ...p }))
        boat.pathIndex = 0
        boat.status = 'moving'
        boat.assignedGroupId = dispatch.targetGroupId
      }
    }

    for (const boat of updatedBoats) {
      if (boat.status === 'moving' && boat.path.length > 0) {
        boat.pathIndex = Math.min(boat.pathIndex + 1, boat.path.length - 1)
        boat.position = { ...boat.path[boat.pathIndex] }

        if (boat.pathIndex >= boat.path.length - 1) {
          const targetGroup = state.touristGroups.find(g => g.id === boat.assignedGroupId)
          if (targetGroup && !targetGroup.rescued) {
            boat.status = 'loading'
          }
        }
      } else if (boat.status === 'loading') {
        const loadAmount = boat.assignedGroupId
          ? Math.min(
              (state.touristGroups.find(g => g.id === boat.assignedGroupId)?.count ?? 0),
              boat.capacity - boat.currentLoad
            )
          : 0
        boat.currentLoad = loadAmount
        boat.status = 'returning'

        const nearestSafe = findNearestSafeZone(boat.position, level.safeZoneCells, state.cells, state.waterLevel)
        if (nearestSafe) {
          const returnPath = findPath(boat.position, nearestSafe, state.cells, state.waterLevel)
          if (returnPath.length > 0) {
            boat.path = returnPath
            boat.pathIndex = 0
          }
        }
      } else if (boat.status === 'returning') {
        if (boat.path.length > 0) {
          boat.pathIndex = Math.min(boat.pathIndex + 1, boat.path.length - 1)
          boat.position = { ...boat.path[boat.pathIndex] }

          if (boat.pathIndex >= boat.path.length - 1) {
            boat.status = 'idle'
            boat.currentLoad = 0
            boat.assignedGroupId = null
            boat.path = []
            boat.pathIndex = 0
          }
        }
      }
    }

    const nextTurn = state.currentTurn + 1
    const nextWaterLevel = getWaterLevelAtTurn(level.tidalCurve, nextTurn)
    const updatedCells = updateCellWaterLevels(state.cells, nextWaterLevel)

    let updatedGroups = state.touristGroups.map(g => ({ ...g, position: { ...g.position } }))

    for (const boat of updatedBoats) {
      if (boat.status === 'loading' && boat.assignedGroupId) {
        const group = updatedGroups.find(g => g.id === boat.assignedGroupId)
        if (group && !group.rescued) {
          group.rescued = true
        }
      }
    }

    for (const group of updatedGroups) {
      if (!group.rescued) {
        const cell = updatedCells.get(hexKey(group.position.q, group.position.r))
        const elevation = cell?.baseElevation ?? 0
        group.riskLevel = getRiskLevel(group.stamina, group.maxStamina, group.waitTurns, nextWaterLevel, elevation)

        let staminaDrain = 0.5
        if (cell?.terrain === 'reef') staminaDrain = 1.5
        else if (cell?.terrain === 'shallow') staminaDrain = 1
        group.stamina = Math.max(0, group.stamina - staminaDrain)
        group.waitTurns += 1
      }
    }

    const allRescued = updatedGroups.every(g => g.rescued)
    const anyReachable = updatedGroups.some(g => {
      if (g.rescued) return true
      return updatedBoats.some(b =>
        b.status === 'idle' && isReachable(b.position, g.position, updatedCells, nextWaterLevel)
      )
    })
    const turnsExceeded = nextTurn >= state.maxTurns
    const gameOver = allRescued || !anyReachable || turnsExceeded

    const newHistory = [...state.turnHistory, turnRecord]

    if (gameOver) {
      const rescuedCount = updatedGroups.filter(g => g.rescued).reduce((sum, g) => sum + g.count, 0)
      const totalTourists = updatedGroups.reduce((sum, g) => sum + g.count, 0)
      const missedWindows = state.tidalWindows.filter(w => checkTidalWindow(w, nextTurn) === 'missed')
      const score = calculateScore(rescuedCount, totalTourists, nextTurn, state.maxTurns, missedWindows, state.tidalWindows.length)
      const resourceAnalysis = analyzeResources(newHistory, updatedBoats, updatedGroups)

      const replaySession: ReplaySession = {
        id: crypto.randomUUID(),
        levelId: state.currentLevelId!,
        startTime: Date.now() - nextTurn * 60000,
        endTime: Date.now(),
        turns: newHistory,
        score,
        missedWindows,
        resourceAnalysis,
      }

      saveReplayToStorage(replaySession)

      set({
        phase: 'gameOver',
        currentTurn: nextTurn,
        waterLevel: nextWaterLevel,
        cells: updatedCells,
        touristGroups: updatedGroups,
        boats: updatedBoats,
        pendingDispatches: [],
        turnHistory: newHistory,
        selectedBoatId: null,
        previewPath: null,
      })
    } else {
      set({
        phase: 'planning',
        currentTurn: nextTurn,
        waterLevel: nextWaterLevel,
        cells: updatedCells,
        touristGroups: updatedGroups,
        boats: updatedBoats,
        pendingDispatches: [],
        turnHistory: newHistory,
        selectedBoatId: null,
        previewPath: null,
      })
    }
  },

  undoTurn: () => {
    const state = get()
    if (state.turnHistory.length === 0) return

    const lastTurn = state.turnHistory[state.turnHistory.length - 1]
    const restoredCells = restoreFromSnapshot(lastTurn.snapshot, state.cells)
    const restoredGroups = lastTurn.snapshot.touristGroups.map(g => ({ ...g, position: { ...g.position } }))
    const restoredBoats = lastTurn.snapshot.boats.map(b => ({
      ...b,
      position: { ...b.position },
      path: b.path.map(p => ({ ...p })),
    }))

    set({
      phase: 'planning',
      currentTurn: lastTurn.turnNumber,
      waterLevel: lastTurn.waterLevel,
      cells: restoredCells,
      touristGroups: restoredGroups,
      boats: restoredBoats,
      pendingDispatches: [],
      turnHistory: state.turnHistory.slice(0, -1),
      selectedBoatId: null,
      previewPath: null,
    })
  },

  setHoveredCell: (coord: HexCoord | null) => {
    set({ hoveredCell: coord })
  },

  setPreviewPath: (path: HexCoord[] | null) => {
    set({ previewPath: path })
  },

  startReplay: (session: ReplaySession) => {
    set({
      phase: 'replay',
      replaySession: session,
      replayTurnIndex: 0,
    })
  },

  setReplayTurn: (index: number) => {
    set({ replayTurnIndex: index })
  },

  exitReplay: () => {
    set({
      phase: 'planning',
      replaySession: null,
      replayTurnIndex: 0,
    })
  },

  getCellAt: (q: number, r: number) => {
    return get().cells.get(hexKey(q, r))
  },

  getGroupAt: (q: number, r: number) => {
    return get().touristGroups.find(g => g.position.q === q && g.position.r === r)
  },

  getBoatAt: (q: number, r: number) => {
    return get().boats.find(b => b.position.q === q && b.position.r === r)
  },

  getTidalWindowStatus: (windowIndex: number) => {
    const state = get()
    if (windowIndex < 0 || windowIndex >= state.tidalWindows.length) return 'none' as WindowStatus
    return checkTidalWindow(state.tidalWindows[windowIndex], state.currentTurn)
  },

  getScore: () => {
    const state = get()
    const rescuedCount = state.touristGroups.filter(g => g.rescued).reduce((sum, g) => sum + g.count, 0)
    const totalTourists = state.touristGroups.reduce((sum, g) => sum + g.count, 0)
    const missedWindows = state.tidalWindows.filter(w => checkTidalWindow(w, state.currentTurn) === 'missed')
    return calculateScore(rescuedCount, totalTourists, state.currentTurn, state.maxTurns, missedWindows, state.tidalWindows.length)
  },

  getResourceAnalysis: () => {
    const state = get()
    return analyzeResources(state.turnHistory, state.boats, state.touristGroups)
  },
}))

function findNearestSafeZone(
  from: HexCoord,
  safeZones: HexCoord[],
  cells: Map<string, HexCellState>,
  waterLevel: number
): HexCoord | null {
  let nearest: HexCoord | null = null
  let minDist = Infinity

  for (const zone of safeZones) {
    const dist = hexDistance(from, zone)
    const reachable = isReachable(from, zone, cells, waterLevel)
    if (reachable && dist < minDist) {
      minDist = dist
      nearest = zone
    }
  }

  return nearest
}
