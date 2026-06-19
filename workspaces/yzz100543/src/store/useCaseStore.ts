import { create } from 'zustand'
import type { Scenario, SupervisorState, LeaderState, RetrainingPlan } from '@/types'
import { defaultScenarios } from '@/data/scenarios'
import { loadFromStorage, saveToStorage } from '@/utils/storage'

interface CaseStoreState {
  scenarios: Scenario[]
  supervisor: SupervisorState
  leader: LeaderState
  retrainingPlans: RetrainingPlan[]
}

interface CaseStoreActions {
  loadScenarios: () => void
  addScenario: (scenario: Scenario) => void
  updateScenario: (scenarioId: string, updates: Partial<Scenario>) => void
  deleteScenario: (scenarioId: string) => void
  supervisorLogin: (name: string) => void
  supervisorLogout: () => void
  leaderLogin: (name: string, leaderId: string) => void
  leaderLogout: () => void
  addRetrainingPlan: (plan: RetrainingPlan) => void
  deleteRetrainingPlan: (planId: string) => void
  loadRetrainingPlans: () => void
}

export const useCaseStore = create<CaseStoreState & CaseStoreActions>()((set) => ({
  scenarios: loadFromStorage<Scenario[]>('scenarios', defaultScenarios),
  supervisor: { isLoggedIn: false, name: '' },
  leader: { isLoggedIn: false, name: '', leaderId: '' },
  retrainingPlans: [],

  loadScenarios() {
    set({ scenarios: loadFromStorage<Scenario[]>('scenarios', defaultScenarios) })
  },

  addScenario(scenario) {
    set((state) => {
      const scenarios = [...state.scenarios, scenario]
      saveToStorage('scenarios', scenarios)
      return { scenarios }
    })
  },

  updateScenario(scenarioId, updates) {
    set((state) => {
      const scenarios = state.scenarios.map((s) =>
        s.id === scenarioId ? { ...s, ...updates } : s,
      )
      saveToStorage('scenarios', scenarios)
      return { scenarios }
    })
  },

  deleteScenario(scenarioId) {
    set((state) => {
      const scenarios = state.scenarios.filter((s) => s.id !== scenarioId)
      saveToStorage('scenarios', scenarios)
      return { scenarios }
    })
  },

  supervisorLogin(name) {
    set({ supervisor: { isLoggedIn: true, name } })
  },

  supervisorLogout() {
    set({ supervisor: { isLoggedIn: false, name: '' } })
  },

  leaderLogin(name, leaderId) {
    set({ leader: { isLoggedIn: true, name, leaderId } })
  },

  leaderLogout() {
    set({ leader: { isLoggedIn: false, name: '', leaderId: '' } })
  },

  addRetrainingPlan(plan) {
    set((state) => {
      const retrainingPlans = [...state.retrainingPlans, plan]
      saveToStorage('retraining-plans', retrainingPlans)
      return { retrainingPlans }
    })
  },

  deleteRetrainingPlan(planId) {
    set((state) => {
      const retrainingPlans = state.retrainingPlans.filter((p) => p.id !== planId)
      saveToStorage('retraining-plans', retrainingPlans)
      return { retrainingPlans }
    })
  },

  loadRetrainingPlans() {
    set({ retrainingPlans: loadFromStorage<RetrainingPlan[]>('retraining-plans', []) })
  },
}))
