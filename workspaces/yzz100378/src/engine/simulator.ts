import { LevelConfig, GameState, Passenger, Guide, Position } from "@/types"
import { findPath, buildWallSet, buildBlockedCells, isInGuideRange, getGuideInfluenceDiscount, GUIDE_INFLUENCE_RADIUS } from "./pathfinding"
import { getCongestedCells, isCellCongested, CELL_CAPACITY, getCellCapacityWithGuides, getGuidedPassengerCount } from "./collision"
import { calculateCongestionPenalty, calculateDetourPenalty } from "./scoring"
import { checkEvents, EventResult } from "./events"

const TICK_RATE = 1 / 30
const PASSENGER_SPEED = 2

const GUIDE_SPEED_BOOST_BASE = 1.5
const GUIDE_SPEED_BOOST_PER_TIER = 0.2

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
    eventBonus: 0,
    guideBonus: 0,
    assistedByGuide: 0
  }
}

function calcPassengerSpeed(
  passenger: Passenger,
  guides: Guide[],
  congested: boolean
): number {
  let speed = congested ? PASSENGER_SPEED * 0.3 : PASSENGER_SPEED
  const guide = isInGuideRange(Math.floor(passenger.x), Math.floor(passenger.y), guides)
  if (guide) {
    const dist = Math.abs(Math.floor(passenger.x) - guide.x) + Math.abs(Math.floor(passenger.y) - guide.y)
    const tier = guide.influenceRadius - dist
    let boost = GUIDE_SPEED_BOOST_BASE + tier * GUIDE_SPEED_BOOST_PER_TIER
    if (passenger.entranceId && guide.targetEntranceId && passenger.entranceId === guide.targetEntranceId) {
      boost += 0.1
    }
    if (congested) {
      speed = PASSENGER_SPEED * Math.min(boost, 1.0)
    } else {
      speed = PASSENGER_SPEED * boost
    }
  }
  return speed
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
      const path = findPath(
        level.gridSize,
        walls,
        { x: entrance.x, y: entrance.y },
        { x: exit.x, y: exit.y },
        blocked,
        state.guides.length > 0 ? state.guides : undefined,
        entrance.id,
        level.entrances
      )

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
  const congestedCells = getCongestedCells(state.passengers, state.guides)
  let congestionDelta = 0
  let detourDelta = 0
  let guideBonusDelta = 0
  let assistedThisFrame = 0

  const updatedPassengers = state.passengers.map(p => {
    if (p.state === "exited") return p

    const cellX = Math.floor(p.x)
    const cellY = Math.floor(p.y)
    const cellKey = `${cellX},${cellY}`
    const isCongested = congestedCells.has(cellKey)
    const nearbyGuide = isInGuideRange(cellX, cellY, state.guides)
    if (nearbyGuide) {
      assistedThisFrame += 1
      guideBonusDelta += 0.25 * dt
    }

    if (isCongested) {
      if (nearbyGuide) {
        const cap = getCellCapacityWithGuides(cellX, cellY, state.guides)
        const count = getCongestedCellRawCount(state.passengers, cellX, cellY)
        const prevented = Math.max(0, cap - CELL_CAPACITY)
        const stillOver = Math.max(0, count - CELL_CAPACITY)
        const mitigated = Math.min(prevented, stillOver)
        if (mitigated > 0) {
          guideBonusDelta += mitigated * 0.6 * dt
        }
      }
      congestionDelta += dt
      return { ...p, state: "congested" as const, congestionTime: p.congestionTime + dt }
    }

    if (p.pathIndex >= p.path.length) {
      const targetExit = level.exits.find(e => e.id === p.targetExitId)
      if (targetExit && Math.abs(p.x - targetExit.x) < 0.5 && Math.abs(p.y - targetExit.y) < 0.5) {
        if (nearbyGuide) {
          guideBonusDelta += 0.05 * dt
        }
        return { ...p, state: "exited" as const }
      }
      const newPath = findPath(
        level.gridSize,
        walls,
        { x: cellX, y: cellY },
        { x: targetExit!.x, y: targetExit!.y },
        blocked,
        state.guides.length > 0 ? state.guides : undefined,
        p.entranceId,
        level.entrances
      )
      if (newPath && newPath.length > 0) {
        const extraDist = newPath.length
        const dp = calculateDetourPenalty({ ...p, detourDistance: p.detourDistance + extraDist })
        detourDelta += dp
        return { ...p, path: newPath, pathIndex: 0, state: "detouring" as const, detourDistance: p.detourDistance + extraDist }
      }
      return { ...p, state: "congested" as const, congestionTime: p.congestionTime + dt }
    }

    const target = p.path[p.pathIndex]
    const dx = target.x - p.x
    const dy = target.y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    const speed = calcPassengerSpeed(p, state.guides, isCongested)
    if (dist < speed * dt) {
      if (nearbyGuide) {
        guideBonusDelta += 0.02 * dt
      }
      return { ...p, x: target.x, y: target.y, pathIndex: p.pathIndex + 1, state: "moving" as const }
    }

    return {
      ...p,
      x: p.x + (dx / dist) * speed * dt,
      y: p.y + (dy / dist) * speed * dt,
      state: "moving" as const
    }
  })

  for (const guide of state.guides) {
    const count = getCongestedCellRawCount(state.passengers, guide.x, guide.y)
    if (count >= 2) {
      const cap = getCellCapacityWithGuides(guide.x, guide.y, state.guides)
      const extra = cap - CELL_CAPACITY
      const actuallyUseful = Math.min(extra, Math.max(0, count - 2))
      if (actuallyUseful > 0) {
        guideBonusDelta += actuallyUseful * 0.4 * dt
      }
    }
  }

  const totalExited = updatedPassengers.filter(p => p.state === "exited").length
  const activePassengers = updatedPassengers.filter(p => p.state !== "exited")

  return {
    ...state,
    passengers: activePassengers.length > 200 ? activePassengers.slice(-200) : updatedPassengers,
    totalExited: state.totalExited + (totalExited - state.totalExited),
    congestionPenalty: state.congestionPenalty + congestionDelta,
    detourPenalty: state.detourPenalty + detourDelta,
    guideBonus: state.guideBonus + guideBonusDelta,
    assistedByGuide: state.assistedByGuide + assistedThisFrame
  }
}

function getCongestedCellRawCount(passengers: Passenger[], x: number, y: number): number {
  let count = 0
  for (const p of passengers) {
    if (p.state === "exited") continue
    if (Math.floor(p.x) === x && Math.floor(p.y) === y) count++
  }
  return count
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
    if ("eventBonus" in result && typeof result.eventBonus === "number") {
      newState.eventBonus += result.eventBonus
    }
    results.push({ event, result })
  }

  return { state: newState, eventResults: results }
}

export function recalculatePaths(state: GameState, level: LevelConfig): Passenger[] {
  const walls = buildWallSet(level.walls, state.fences)
  const blocked = buildBlockedCells(level.escalators, state.escalatorStates, state.closedExits, level.exits)
  const guides = state.guides.length > 0 ? state.guides : undefined

  return state.passengers.map(p => {
    if (p.state === "exited") return p
    const targetExit = level.exits.find(e => e.id === p.targetExitId)
    if (!targetExit) return p

    const newPath = findPath(
      level.gridSize,
      walls,
      { x: Math.floor(p.x), y: Math.floor(p.y) },
      { x: targetExit.x, y: targetExit.y },
      blocked,
      guides,
      p.entranceId,
      level.entrances
    )
    if (newPath) {
      const oldLen = p.path.length - p.pathIndex
      const detourAdd = Math.max(0, newPath.length - oldLen)
      return { ...p, path: newPath, pathIndex: 0, detourDistance: p.detourDistance + detourAdd }
    }
    return p
  })
}
