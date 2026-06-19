import { create } from 'zustand'
import type { DialogueLog, MissedPoint, TrainingSession, Option, InfoPoint, Speaker } from '@/types'
import { calculateScore } from '@/utils/scoring'
import { detectMissedPoints } from '@/utils/missedPoints'
import { saveToStorage, loadFromStorage } from '@/utils/storage'

interface GameState {
  currentSession: TrainingSession | null
  currentNodeId: string
  confirmedInfoPoints: string[]
  dialogueLogs: DialogueLog[]
  comfortScore: number
  totalRounds: number
  isTraining: boolean
  allSessions: TrainingSession[]
}

interface GameActions {
  startSession: (studentId: string, scenarioId: string, scenarioInfoPoints: InfoPoint[]) => void
  selectOption: (option: Option, speaker: Speaker, text: string, scenarioInfoPoints: InfoPoint[]) => void
  addDialogueLog: (speaker: Speaker, text: string, isMissed?: boolean, missedInfoPointId?: string) => void
  endSession: (scenarioInfoPoints: InfoPoint[]) => void
  loadSessions: () => void
  getCurrentSession: () => TrainingSession | null
}

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  currentSession: null,
  currentNodeId: 'start',
  confirmedInfoPoints: [],
  dialogueLogs: [],
  comfortScore: 0,
  totalRounds: 0,
  isTraining: false,
  allSessions: loadFromStorage<TrainingSession[]>('sessions', []),

  startSession: (studentId, scenarioId, _scenarioInfoPoints) => {
    const session: TrainingSession = {
      id: `session-${Date.now()}`,
      studentId,
      scenarioId,
      totalScore: 0,
      infoScore: 0,
      comfortScore: 0,
      efficiencyScore: 0,
      startTime: Date.now(),
      endTime: 0,
      confirmedInfoPoints: [],
      dialogueLogs: [],
      missedPoints: [],
      completed: false,
    }
    set({
      currentSession: session,
      currentNodeId: 'start',
      confirmedInfoPoints: [],
      dialogueLogs: [],
      comfortScore: 0,
      totalRounds: 0,
      isTraining: true,
    })
  },

  selectOption: (option, speaker, text, scenarioInfoPoints) => {
    const state = get()
    const newConfirmed = [...new Set([...state.confirmedInfoPoints, ...option.confirmsInfoPoints])]
    const log: DialogueLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId: state.currentSession?.id ?? '',
      timestamp: Date.now(),
      speaker,
      text,
      optionId: option.id,
    }
    const newComfortScore = option.category === 'comfort'
      ? state.comfortScore + option.scoreDelta
      : state.comfortScore

    set({
      confirmedInfoPoints: newConfirmed,
      dialogueLogs: [...state.dialogueLogs, log],
      currentNodeId: option.nextNodeId,
      comfortScore: newComfortScore,
      totalRounds: state.totalRounds + 1,
    })
  },

  addDialogueLog: (speaker, text, isMissed, missedInfoPointId) => {
    const state = get()
    const log: DialogueLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId: state.currentSession?.id ?? '',
      timestamp: Date.now(),
      speaker,
      text,
      isMissed,
      missedInfoPointId,
    }
    set({ dialogueLogs: [...state.dialogueLogs, log] })
  },

  endSession: (scenarioInfoPoints) => {
    const state = get()
    if (!state.currentSession) return

    const sessionId = state.currentSession.id
    const requiredInfoPoints = scenarioInfoPoints.filter(p => p.required)
    const missedPoints = detectMissedPoints(state.confirmedInfoPoints, requiredInfoPoints, sessionId)
    const confirmedCount = state.confirmedInfoPoints.length
    const requiredCount = requiredInfoPoints.length
    const scores = calculateScore(confirmedCount, requiredCount, state.comfortScore, state.totalRounds, 6)

    const completedSession: TrainingSession = {
      ...state.currentSession,
      totalScore: scores.totalScore,
      infoScore: scores.infoScore,
      comfortScore: scores.comfortNorm,
      efficiencyScore: scores.efficiencyScore,
      endTime: Date.now(),
      confirmedInfoPoints: state.confirmedInfoPoints,
      dialogueLogs: state.dialogueLogs,
      missedPoints,
      completed: true,
    }

    const updatedSessions = [...state.allSessions, completedSession]
    saveToStorage('sessions', updatedSessions)

    set({
      currentSession: completedSession,
      allSessions: updatedSessions,
      isTraining: false,
    })
  },

  loadSessions: () => {
    const sessions = loadFromStorage<TrainingSession[]>('sessions', [])
    set({ allSessions: sessions })
  },

  getCurrentSession: () => get().currentSession,
}))
