import { create } from 'zustand'
import type {
  Customer,
  Consumption,
  Appointment,
  FollowUpNote,
  Complaint,
  ChurnAnalysis,
  FollowUpTask,
  UserRole,
  ProjectTypeRule,
} from '@/types'

interface AppState {
  role: UserRole
  setRole: (role: UserRole) => void

  customers: Customer[]
  consumptions: Consumption[]
  appointments: Appointment[]
  followUpNotes: FollowUpNote[]
  complaints: Complaint[]
  churnAnalyses: ChurnAnalysis[]
  followUpTasks: FollowUpTask[]

  projectTypeRules: ProjectTypeRule[]

  setCustomers: (c: Customer[]) => void
  setConsumptions: (c: Consumption[]) => void
  setAppointments: (a: Appointment[]) => void
  setFollowUpNotes: (n: FollowUpNote[]) => void
  setComplaints: (c: Complaint[]) => void
  setChurnAnalyses: (a: ChurnAnalysis[]) => void
  setFollowUpTasks: (t: FollowUpTask[]) => void

  updateCustomer: (id: string, updates: Partial<Customer>) => void
  addFollowUpTask: (task: FollowUpTask) => void
  updateFollowUpTask: (id: string, updates: Partial<FollowUpTask>) => void
  excludeCustomer: (id: string, reason: string) => void
  restoreCustomer: (id: string) => void

  addProjectTypeRule: (rule: ProjectTypeRule) => void
  removeProjectTypeRule: (keyword: string) => void

  resetAll: () => void
}

const defaultRules: ProjectTypeRule[] = [
  { keyword: '体验', type: 'trial' },
  { keyword: '试用', type: 'trial' },
  { keyword: '新客', type: 'trial' },
  { keyword: '首单', type: 'trial' },
  { keyword: '拓客', type: 'trial' },
]

export const useAppStore = create<AppState>((set) => ({
  role: 'manager',
  setRole: (role) => set({ role }),

  customers: [],
  consumptions: [],
  appointments: [],
  followUpNotes: [],
  complaints: [],
  churnAnalyses: [],
  followUpTasks: [],
  projectTypeRules: defaultRules,

  setCustomers: (customers) => set({ customers }),
  setConsumptions: (consumptions) => set({ consumptions }),
  setAppointments: (appointments) => set({ appointments }),
  setFollowUpNotes: (followUpNotes) => set({ followUpNotes }),
  setComplaints: (complaints) => set({ complaints }),
  setChurnAnalyses: (churnAnalyses) => set({ churnAnalyses }),
  setFollowUpTasks: (followUpTasks) => set({ followUpTasks }),

  updateCustomer: (id, updates) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  addFollowUpTask: (task) =>
    set((state) => ({ followUpTasks: [...state.followUpTasks, task] })),

  updateFollowUpTask: (id, updates) =>
    set((state) => ({
      followUpTasks: state.followUpTasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  excludeCustomer: (id, reason) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id
          ? { ...c, isExcluded: true, excludeReason: reason, excludeDate: new Date().toISOString().slice(0, 10) }
          : c
      ),
      churnAnalyses: state.churnAnalyses.map((a) =>
        a.customerId === id ? { ...a, isExcluded: true, excludeReason: reason } : a
      ),
    })),

  restoreCustomer: (id) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, isExcluded: false, excludeReason: undefined, excludeDate: undefined } : c
      ),
      churnAnalyses: state.churnAnalyses.map((a) =>
        a.customerId === id ? { ...a, isExcluded: false, excludeReason: undefined } : a
      ),
    })),

  addProjectTypeRule: (rule) =>
    set((state) => ({ projectTypeRules: [...state.projectTypeRules, rule] })),

  removeProjectTypeRule: (keyword) =>
    set((state) => ({
      projectTypeRules: state.projectTypeRules.filter((r) => r.keyword !== keyword),
    })),

  resetAll: () =>
    set({
      customers: [],
      consumptions: [],
      appointments: [],
      followUpNotes: [],
      complaints: [],
      churnAnalyses: [],
      followUpTasks: [],
    }),
}))
