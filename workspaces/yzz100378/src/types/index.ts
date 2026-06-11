export interface Position {
  x: number
  y: number
}

export interface Entrance {
  id: string
  x: number
  y: number
  label: string
  color: string
  passengerRate: number
  destinationIds: string[]
}

export interface Exit {
  id: string
  x: number
  y: number
  label: string
  color: string
}

export interface Escalator {
  id: string
  x: number
  y: number
  direction: "up" | "down"
  capacity: number
  initiallyOpen: boolean
}

export interface TransferPoint {
  id: string
  x: number
  y: number
  label: string
}

export interface LevelEvent {
  id: string
  type: "escalator_stop" | "exit_close" | "passenger_surge"
  triggerTime: number
  params: Record<string, unknown>
}

export interface LevelConfig {
  id: string
  name: string
  stationName: string
  difficulty: 1 | 2 | 3 | 4 | 5
  gridSize: { cols: number; rows: number }
  cellSize: number
  walls: Position[]
  passages: Array<{ x: number; y: number; direction: "up" | "down" | "left" | "right" }>
  entrances: Entrance[]
  exits: Exit[]
  escalators: Escalator[]
  transferPoints: TransferPoint[]
  timeLimit: number
  events: LevelEvent[]
  maxGuides: number
  maxFences: number
}

export interface Fence {
  id: string
  x: number
  y: number
  orientation: "h" | "v"
}

export interface Guide {
  id: string
  x: number
  y: number
  targetEntranceId: string
  influenceRadius: number
  bonusScore: number
  assistedPassengers: number
}

export type PassengerState = "moving" | "congested" | "detouring" | "exited"

export interface Passenger {
  id: string
  x: number
  y: number
  entranceId: string
  targetExitId: string
  state: PassengerState
  path: Position[]
  pathIndex: number
  congestionTime: number
  detourDistance: number
  optimalPathLength: number
  color: string
}

export interface ActiveEvent {
  eventId: string
  triggeredAt: number
  resolvedAt?: number
}

export type GamePhase = "preparing" | "running" | "paused" | "finished"

export interface GameState {
  levelId: string
  phase: GamePhase
  elapsedTime: number
  score: number
  fences: Fence[]
  guides: Guide[]
  escalatorStates: Record<string, boolean>
  closedExits: Record<string, boolean>
  passengers: Passenger[]
  activeEvents: ActiveEvent[]
  totalSpawned: number
  totalExited: number
  congestionPenalty: number
  detourPenalty: number
  eventBonus: number
  guideBonus: number
  assistedByGuide: number
}

export interface WeakPoint {
  transferPointId: string
  transferPointLabel: string
  avgResponseTime: number
  congestionOccurrences: number
}

export interface ReplayFrame {
  timestamp: number
  passengers: Array<{ id: string; x: number; y: number; state: string }>
  fences: Array<{ x: number; y: number }>
  guides: Array<{ x: number; y: number }>
  congestionHeatmap: number[][]
}

export interface TrainingRecord {
  id: string
  levelId: string
  levelName: string
  stationName: string
  playerName: string
  score: number
  passedRate: number
  avgCongestionTime: number
  avgDetourDistance: number
  completedAt: string
  duration: number
  weakPoints: WeakPoint[]
  replayFrames: ReplayFrame[]
}

export type EditorTool = "wall" | "passage" | "entrance" | "exit" | "escalator" | "transfer" | "fence" | "select" | "erase"

export type GameTool = "fence" | "guide" | "escalator" | "select" | "erase"
