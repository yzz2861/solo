import { create } from 'zustand'
import type { Student, TrainingSession } from '@/types'
import { defaultStudents } from '@/data/students'
import { loadFromStorage, saveToStorage } from '@/utils/storage'

interface StudentState {
  students: Student[]
  currentStudentId: string | null
}

interface StudentActions {
  selectStudent: (studentId: string) => void
  getStudentSessions: (studentId: string, allSessions: TrainingSession[]) => TrainingSession[]
  getStudentAvgScore: (studentId: string, allSessions: TrainingSession[]) => number
  getStudentCompletedScenarios: (studentId: string, allSessions: TrainingSession[]) => string[]
  getWeakestScenarios: (studentId: string, allSessions: TrainingSession[], allScenarioIds: string[]) => string[]
  addStudent: (student: Student) => void
  loadStudents: () => void
}

export const useStudentStore = create<StudentState & StudentActions>()((set, get) => ({
  students: loadFromStorage<Student[]>('students', defaultStudents),
  currentStudentId: null,

  selectStudent: (studentId) => {
    set({ currentStudentId: studentId })
  },

  getStudentSessions: (studentId, allSessions) => {
    return allSessions.filter((s) => s.studentId === studentId)
  },

  getStudentAvgScore: (studentId, allSessions) => {
    const completed = allSessions.filter(
      (s) => s.studentId === studentId && s.completed,
    )
    if (completed.length === 0) return 0
    const total = completed.reduce((sum, s) => sum + s.totalScore, 0)
    return total / completed.length
  },

  getStudentCompletedScenarios: (studentId, allSessions) => {
    const completed = allSessions.filter(
      (s) => s.studentId === studentId && s.completed,
    )
    return [...new Set(completed.map((s) => s.scenarioId))]
  },

  getWeakestScenarios: (studentId, allSessions, allScenarioIds) => {
    const completed = allSessions.filter(
      (s) => s.studentId === studentId && s.completed,
    )

    const scenarioScores: Record<string, number[]> = {}
    for (const s of completed) {
      if (!scenarioScores[s.scenarioId]) scenarioScores[s.scenarioId] = []
      scenarioScores[s.scenarioId].push(s.totalScore)
    }

    const scored = allScenarioIds.map((id) => {
      const scores = scenarioScores[id]
      const avg = scores ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      return { id, avg }
    })

    scored.sort((a, b) => a.avg - b.avg)
    return scored.slice(0, 3).map((s) => s.id)
  },

  addStudent: (student) => {
    const updated = [...get().students, student]
    saveToStorage('students', updated)
    set({ students: updated })
  },

  loadStudents: () => {
    const students = loadFromStorage<Student[]>('students', defaultStudents)
    set({ students })
  },
}))
