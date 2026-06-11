import { GameState, LevelConfig, Passenger, Guide } from "@/types"

export function calculateScore(state: GameState, level: LevelConfig): number {
  const passedRate = level.entrances.length > 0 ? state.totalExited / Math.max(state.totalSpawned, 1) : 0
  const passScore = passedRate * 40
  const timeBonus = Math.max(0, level.timeLimit - state.elapsedTime) * 0.5
  const total = passScore - state.congestionPenalty - state.detourPenalty + state.eventBonus + state.guideBonus + timeBonus
  return Math.round(Math.max(0, total) * 10) / 10
}

export function calculateCongestionPenalty(congestedPassengers: number, deltaTime: number): number {
  return congestedPassengers * 0.5 * deltaTime
}

export function calculateDetourPenalty(passenger: Passenger): number {
  if (passenger.optimalPathLength === 0) return 0
  const detourRatio = passenger.detourDistance / passenger.optimalPathLength
  if (detourRatio > 0.3) return 2
  return 0
}

export function calculatePassedRate(state: GameState): number {
  if (state.totalSpawned === 0) return 0
  return Math.round((state.totalExited / state.totalSpawned) * 100) / 100
}

export function calculateAvgCongestionTime(passengers: Passenger[]): number {
  const active = passengers.filter(p => p.congestionTime > 0)
  if (active.length === 0) return 0
  return Math.round((active.reduce((s, p) => s + p.congestionTime, 0) / active.length) * 10) / 10
}

export function calculateAvgDetourDistance(passengers: Passenger[]): number {
  const detouring = passengers.filter(p => p.detourDistance > 0)
  if (detouring.length === 0) return 0
  return Math.round((detouring.reduce((s, p) => s + p.detourDistance, 0) / detouring.length) * 10) / 10
}

export function calculateGuideEfficiency(
  guides: Guide[],
  assistedByGuide: number,
  guideBonus: number,
  totalFrames: number
): { utilization: number; bonusPerGuide: number; avgAssistedPerFrame: number } {
  if (guides.length === 0 || totalFrames === 0) {
    return { utilization: 0, bonusPerGuide: 0, avgAssistedPerFrame: 0 }
  }
  const avgAssisted = assistedByGuide / totalFrames
  const utilization = Math.min(1, avgAssisted / (guides.length * 4))
  const bonusPerGuide = Math.round((guideBonus / guides.length) * 10) / 10
  return {
    utilization: Math.round(utilization * 1000) / 10,
    bonusPerGuide,
    avgAssistedPerFrame: Math.round(avgAssisted * 10) / 10
  }
}
