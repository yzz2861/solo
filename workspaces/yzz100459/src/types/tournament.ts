export type PlayerStatus = 'active' | 'withdrawn' | 'bye'

export interface Player {
  id: string
  name: string
  rating: number
  team: string
  status: PlayerStatus
  seed: number
  note?: string
}

export type MatchResult =
  | 'pending'
  | 'win-white'
  | 'win-black'
  | 'draw'
  | 'forfeit-white'
  | 'forfeit-black'
  | 'bye-white'
  | 'bye-black'
  | 'no-show-white'
  | 'no-show-black'

export interface Match {
  id: string
  round: number
  board: number
  whiteId: string
  blackId: string
  result: MatchResult
  locked: boolean
  note?: string
}

export type RoundStatus = 'pending' | 'generated' | 'in-progress' | 'completed'

export interface Round {
  number: number
  status: RoundStatus
  matches: Match[]
  generatedAt?: string
  completedAt?: string
}

export interface TiebreakRecord {
  playerId: string
  score: number
  buchholz: number
  sonnebornBerger: number
  wins: number
  blackWins: number
  directEncounter: number
  ratingAverage: number
  tiebreakReasons: string[]
}

export interface TournamentInfo {
  name: string
  location: string
  date: string
  totalRounds: number
  timeControl: string
  scoringSystem: 'standard' | 'soccer' | 'custom'
  winPoints: number
  drawPoints: number
  lossPoints: number
  avoidSameTeam: boolean
  avoidSameTeamRound1: boolean
  maxRepeatEncounters: number
  note?: string
}

export interface TournamentState {
  info: TournamentInfo
  players: Player[]
  rounds: Round[]
  pairings: {
    [playerId: string]: string[]
  }
  colorBalance: {
    [playerId: string]: { white: number; black: number }
  }
  lastSavedAt?: string
  createdAt: string
  updatedAt: string
}

export const DEFAULT_TOURNAMENT_INFO: TournamentInfo = {
  name: '棋社周末快棋赛',
  location: '',
  date: new Date().toISOString().slice(0, 10),
  totalRounds: 5,
  timeControl: '10+5',
  scoringSystem: 'standard',
  winPoints: 1,
  drawPoints: 0.5,
  lossPoints: 0,
  avoidSameTeam: true,
  avoidSameTeamRound1: true,
  maxRepeatEncounters: 1,
}

export const createEmptyState = (): TournamentState => ({
  info: { ...DEFAULT_TOURNAMENT_INFO },
  players: [],
  rounds: [],
  pairings: {},
  colorBalance: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const RESULT_LABELS: Record<MatchResult, string> = {
  pending: '待开赛',
  'win-white': '白方胜',
  'win-black': '黑方胜',
  draw: '和棋',
  'forfeit-white': '白方弃权，黑胜',
  'forfeit-black': '黑方弃权，白胜',
  'bye-white': '白方轮空',
  'bye-black': '黑方轮空',
  'no-show-white': '白方迟到，黑胜',
  'no-show-black': '黑方迟到，白胜',
}

export const STATUS_LABELS: Record<PlayerStatus, string> = {
  active: '正常',
  withdrawn: '退赛',
  bye: '轮空',
}
