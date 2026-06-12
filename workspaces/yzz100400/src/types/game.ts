export type Terrain = "reef" | "shallow" | "deep" | "safe" | "rock"

export type RiskLevel = "low" | "medium" | "high" | "critical"

export type BoatStatus = "idle" | "moving" | "loading" | "returning"

export type GamePhase = "planning" | "executing" | "gameOver" | "replay"

export type WindowStatus = "optimal" | "closing" | "missed" | "none"

export interface HexCoord {
  q: number
  r: number
}

export interface HexCell {
  q: number
  r: number
  terrain: Terrain
  baseElevation: number
}

export interface HexCellState extends HexCell {
  currentWaterLevel: number
  isSubmerged: boolean
}

export interface TidalStep {
  turn: number
  waterLevel: number
  label: string
}

export interface TidalCurve {
  steps: TidalStep[]
}

export interface TidalWindow {
  startTurn: number
  endTurn: number
  description: string
  affectedCells: string[]
}

export interface TouristGroup {
  id: string
  position: HexCoord
  count: number
  stamina: number
  maxStamina: number
  waitTurns: number
  riskLevel: RiskLevel
  rescued: boolean
}

export interface RescueBoat {
  id: string
  position: HexCoord
  capacity: number
  currentLoad: number
  status: BoatStatus
  path: HexCoord[]
  pathIndex: number
  assignedGroupId: string | null
}

export interface PendingDispatch {
  boatId: string
  path: HexCoord[]
  targetGroupId: string | null
}

export interface Decision {
  boatId: string
  action: "dispatch" | "recall" | "wait"
  targetPosition: HexCoord | null
  targetGroupId: string | null
  tidalWindowStatus: WindowStatus
}

export interface GameStateSnapshot {
  waterLevel: number
  cellStates: Record<string, { isSubmerged: boolean; currentWaterLevel: number }>
  touristGroups: TouristGroup[]
  boats: RescueBoat[]
}

export interface GameTurn {
  turnNumber: number
  waterLevel: number
  decisions: Decision[]
  snapshot: GameStateSnapshot
}

export interface GameScore {
  rescueEfficiency: number
  resourceUtilization: number
  riskControl: number
  speed: number
  decision: number
  total: number
}

export interface ResourceAnalysis {
  boatDispatchCount: Record<string, number>
  highRiskDispatchRatio: number
  lowRiskDispatchRatio: number
  idleTurns: Record<string, number>
  averageResponseTime: number
}

export interface ReplaySession {
  id: string
  levelId: string
  startTime: number
  endTime: number
  turns: GameTurn[]
  score: GameScore
  missedWindows: TidalWindow[]
  resourceAnalysis: ResourceAnalysis
}

export interface LevelConfig {
  id: string
  name: string
  region: string
  difficulty: number
  description: string
  mapWidth: number
  mapHeight: number
  cells: HexCell[]
  tidalCurve: TidalCurve
  tidalWindows: TidalWindow[]
  touristGroups: {
    id: string
    position: HexCoord
    count: number
    stamina: number
    maxStamina: number
  }[]
  boats: {
    id: string
    position: HexCoord
    capacity: number
  }[]
  safeZoneCells: HexCoord[]
  maxTurns: number
}
