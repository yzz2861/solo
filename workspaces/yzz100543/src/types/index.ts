export type Speaker = 'passenger' | 'system' | 'narrator'

export type OptionCategory = 'comfort' | 'info' | 'maintenance' | 'escalate'

export type EndingType = 'success' | 'failure' | 'timeout'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface InfoPoint {
  id: string
  scenarioId: string
  name: string
  questionExample: string
  required: boolean
}

export interface Option {
  id: string
  nodeId: string
  text: string
  category: OptionCategory
  nextNodeId: string
  confirmsInfoPoints: string[]
  scoreDelta: number
}

export interface DialogueNode {
  id: string
  scenarioId: string
  speaker: Speaker
  text: string
  isEnding: boolean
  endingType?: EndingType
  options: Option[]
  passengerEmotion?: string
}

export interface Scenario {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  tags: string[]
  startNodeId: string
  nodes: Record<string, DialogueNode>
  infoPoints: InfoPoint[]
}

export interface Student {
  id: string
  name: string
  group: string
}

export interface DialogueLog {
  id: string
  sessionId: string
  timestamp: number
  speaker: Speaker
  text: string
  optionId?: string
  isMissed?: boolean
  missedInfoPointId?: string
}

export interface MissedPoint {
  id: string
  sessionId: string
  infoPointId: string
  correctQuestion: string
  infoPointName: string
}

export interface TrainingSession {
  id: string
  studentId: string
  scenarioId: string
  totalScore: number
  infoScore: number
  comfortScore: number
  efficiencyScore: number
  startTime: number
  endTime: number
  confirmedInfoPoints: string[]
  dialogueLogs: DialogueLog[]
  missedPoints: MissedPoint[]
  completed: boolean
}

export interface RetrainingPlan {
  id: string
  leaderId: string
  title: string
  deadline: string
  requiredScenarioIds: string[]
  studentIds: string[]
  note: string
  createdAt: number
}

export interface SupervisorState {
  isLoggedIn: boolean
  name: string
}

export interface LeaderState {
  isLoggedIn: boolean
  name: string
  leaderId: string
}
