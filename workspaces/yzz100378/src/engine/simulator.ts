import { LevelConfig, GameState, Passenger, Fence, Guide, Position } from "@/types"
import { findPath, buildWallSet, buildBlockedCells } from "./pathfinding"
import { getCongestedCells, isCellCongested, CELL_CAPACITY } from "./collision"
import { calculateCongestionPenalty, calculateDetourPenalty } from "./scoring"
import { checkEvents, EventResult } from "./events"

const TICK_RATE = 1 / 30
const PASSENGER_SPEED = 2

let passengerCounter = 0

export function createInitialState(level: LevelConfig): GameState {
  const escalatorStates: Record<string, boolean> = {}
  for (const esc of level.escalators) {
    escalatorStates[esc.id] = esc.initiallyOpen
  }
  return {
    levelId: level.id,
    phase: "preparing",
    elapsedTime: 0,
    score: 0,
    fences: [],
    guides: [],
    escalatorStates,
    closedExits: {},
    passengers: [],
    activeEvents: [],
    totalSpawned: 0,
    totalExited: 0,
    congestionPenalty: 0,
    detourPenalty: 0,
    eventBonus: 0
  }
}

export function spawnPassengers(level: LevelConfig, state: GameState, dt: number, surgeMultipliers: Record<string, number>): Passenger[] {
  const newPassengers: Passenger[] = []
  for (const entrance of level.entrances) {
    const rate = entrance.passengerRate * (surgeMultipliers[entrance.id] || 1)
    const count = Math.floor(rate * dt + (Math.random() < (rate * dt % 1) ? 1 : 0))
    for (let i = 0; i < count; i++) {
      const destId = entrance.destinationIds[Math.floor(Math.random() * entrance.destinationIds.length)]
      const exit = level.exits.find(e => e.id === destId)
      if (!exit) continue

      const walls = buildWallSet(level.walls, state.fences)
      const blocked = buildBlockedCells(level.escalators, state.escalatorStates, state.closedExits, level.exits)
      const path = findPath(level.gridSize, walls, { x: entrance.x, y: entrance.y }, { x: exit.x, y: exit.y }, blocked)

      if (path) {
        const p: Passenger = {
          id: `p${passengerCounter++}`,
          x: entrance.x,
          y: entrance.y,
          entranceId: entrance.id,
          targetExitId: destId,
          state: "moving",
          path,
          pathIndex: 0,
          congestionTime: 0,
          detourDistance: 0,
          optimalPathLength: path.length,
          color: entrance.color
        }
        newPassengers.push(p)
      }
    }
  }
  return newPassengers
}

export function updatePassengers(state: GameState, level: LevelConfig, dt: number): GameState {
  const walls = buildWallSet(level.walls, state.fences)
  const blocked = buildBlockedCells(level.escalators, state.escalatorStates, state.closedExits, level.exits)
  const congestedCells = getCongestedCells(state.passengers)
  let congestionDelta = 0
  let detourDelta = 0

  const updatedPassengers = state.passengers.map(p => {
    if (p.state === "exited") return p

    const cellKey = `${Math.floor(p.x)},${Math.floor(p.y)}`
    const isCongested = congestedCells.has(cellKey)

    if (isCongested) {
      congestionDelta += dt
      return { ...p, state: "congested" as const, congestionTime: p.congestionTime + dt }
    }

    if (p.pathIndex >= p.path.length) {
      const targetExit = level.exits.find(e => e.id === p.targetExitId)
      if (targetExit && Math.abs(p.x - targetExit.x) < 0.5 && Math.abs(p.y - targetExit.y) < 0.5) {
        return { ...p, state: "exited" as const }
      }
      const newPath = findPath(level.gridSize, walls, { x: p.x, y: p.y }, { x: targetExit!.x, y: targetExit!.y }, blocked)
      if (newPath && newPath.length > 0) {
        const extraDist = newPath.length
        detourDelta += calculateDetourPenalty({ ...p, detourDistance: p.detourDistance + extraDist })
        return { ...p, path: newPath, pathIndex: 0, state: "detouring" as const, detourDistance: p.detourDistance + extraDist }
      }
      return { ...p, state: "congested" as const, congestionTime: p.congestionTime + dt }
    }

    const target = p.path[p.pathIndex]
    const dx = target.x - p.x
    const dy = target.y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < PASSENGER_SPEED * dt) {
      return { ...p, x: target.x, y: target.y, pathIndex: p.pathIndex + 1, state: "moving" as const }
    }

    const speed = isCongested ? PASSENGER_SPEED * 0.3 : PASSENGER_SPEED
    return {
      ...p,
      x: p.x + (dx / dist) * speed * dt,
      y: p.y + (dy / dist) * speed * dt,
      state: "moving" as const
    }
  })

  const totalExited = updatedPassengers.filter(p => p.state === "exited").length
  const activePassengers = updatedPassengers.filter(p => p.state !== "exited")

  return {
    ...state,
    passengers: activePassengers.length > 200 ? activePassengers.slice(-200) : updatedPassengers,
    totalExited: state.totalExited + (totalExited - state.totalExited),
    congestionPenalty: state.congestionPenalty + congestionDelta,
    detourPenalty: state.detourPenalty + detourDelta
  }
}

export function processEvents(level: LevelConfig, state: GameState): {
  state: GameState
  eventResults: Array<{ event: LevelConfig["events"][0]; result: EventResult }>
} {
  const triggered = checkEvents(level, state)

  let newState = { ...state }
  const results: typeof triggered = []

  for (const { event, result } of triggered) {
    newState.activeEvents = [...newState.activeEvents, { eventId: event.id, triggeredAt: state.elapsedTime }]
    if (result.escalatorStates) {
      newState.escalatorStates = { ...newState.escalatorStates, ...result.escalatorStates }
    }
    if (result.closedExits) {
      newState.closedExits = { ...newState.closedExits, ...result.closedExits }
    }
    results.push({ event, result })
  }

  return { state: newState, eventResults: results }
}

export function recalculatePaths(state: GameState, level: LevelConfig): Passenger[] {
  const walls = buildWallSet(level.walls, state.fences)
  const blocked = buildBlockedCells(level.escalators, state.escalatorStates, state.closedExits, level.exits)

  return state.passengers.map(p => {
    if (p.state === "exited") return p
    const targetExit = level.exits.find(e => e.id === p.targetExitId)
    if (!targetExit) return p

    const newPath = findPath(level.gridSize, walls, { x: Math.floor(p.x), y: Math.floor(p.y) }, { x: targetExit.x, y: targetExit.y }, blocked)
    if (newPath) {
      return { ...p, path: newPath, pathIndex: 0, detourDistance: p.detourDistance + Math.max(0, newPath.length - p.optimalPathLength) }
    }
    return p
  })
}
