import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Specimen, BorrowRecord, UserRole, BorrowValidation } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

interface AppState {
  role: UserRole | null
  specimens: Specimen[]
  borrowRecords: BorrowRecord[]

  setRole: (role: UserRole | null) => void

  addSpecimen: (specimen: Omit<Specimen, 'id' | 'createdAt' | 'updatedAt'>) => Specimen
  updateSpecimen: (id: string, data: Partial<Specimen>) => void
  deleteSpecimen: (id: string) => void

  validateBorrow: (specimenId: string) => BorrowValidation
  addBorrowRecord: (record: Omit<BorrowRecord, 'id' | 'status' | 'returnDate' | 'labelOk' | 'pressingOk' | 'specimenOk' | 'returnNotes'>) => BorrowRecord | null
  returnBorrowRecord: (
    id: string,
    checks: { labelOk: boolean; pressingOk: boolean; specimenOk: boolean },
    notes: string
  ) => void
  updateOverdueRecords: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      role: null,
      specimens: [],
      borrowRecords: [],

      setRole: (role) => set({ role }),

      addSpecimen: (data) => {
        const now = new Date().toISOString()
        const specimen: Specimen = { ...data, id: generateId(), createdAt: now, updatedAt: now }
        set((s) => ({ specimens: [...s.specimens, specimen] }))
        return specimen
      },

      updateSpecimen: (id, data) =>
        set((s) => ({
          specimens: s.specimens.map((sp) =>
            sp.id === id ? { ...sp, ...data, updatedAt: new Date().toISOString() } : sp
          ),
        })),

      deleteSpecimen: (id) =>
        set((s) => ({ specimens: s.specimens.filter((sp) => sp.id !== id) })),

      validateBorrow: (specimenId) => {
        const state = get()
        const specimen = state.specimens.find((s) => s.id === specimenId)
        const result: BorrowValidation = { canBorrow: true, warnings: [], errors: [] }

        if (!specimen) {
          result.canBorrow = false
          result.errors.push('标本不存在')
          return result
        }

        if (specimen.preciousLevel === '珍贵' || specimen.preciousLevel === '极珍贵') {
          result.canBorrow = false
          result.errors.push(`珍贵标本（${specimen.preciousLevel}）不可外借`)
        }

        if (specimen.pressingStatus === '受潮') {
          result.canBorrow = false
          result.errors.push('压片受潮，标本已锁定，不可借出')
        }

        if (specimen.status === '借出中') {
          result.canBorrow = false
          result.errors.push('该标本已被借出')
        }

        if (specimen.status === '待修复') {
          result.canBorrow = false
          result.errors.push('该标本待修复，不可借出')
        }

        const recentBorrows = state.borrowRecords.filter(
          (r) => r.specimenId === specimenId && r.status !== '借出中'
        )
        if (recentBorrows.length >= 3) {
          result.warnings.push('该标本近期被多次借出（≥3次），请确认是否继续')
        }

        return result
      },

      addBorrowRecord: (data) => {
        const state = get()
        const validation = state.validateBorrow(data.specimenId)
        if (!validation.canBorrow) return null

        const record: BorrowRecord = {
          ...data,
          id: generateId(),
          status: '借出中',
          returnDate: null,
          labelOk: null,
          pressingOk: null,
          specimenOk: null,
          returnNotes: '',
        }

        set((s) => ({
          borrowRecords: [...s.borrowRecords, record],
          specimens: s.specimens.map((sp) =>
            sp.id === data.specimenId ? { ...sp, status: '借出中' as const, updatedAt: new Date().toISOString() } : sp
          ),
        }))

        return record
      },

      returnBorrowRecord: (id, checks, notes) => {
        const state = get()
        const record = state.borrowRecords.find((r) => r.id === id)
        if (!record) return

        const hasDamage = !checks.labelOk || !checks.pressingOk || !checks.specimenOk
        const now = new Date().toISOString()

        set((s) => ({
          borrowRecords: s.borrowRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: '已归还' as const,
                  returnDate: now,
                  labelOk: checks.labelOk,
                  pressingOk: checks.pressingOk,
                  specimenOk: checks.specimenOk,
                  returnNotes: notes,
                }
              : r
          ),
          specimens: s.specimens.map((sp) =>
            sp.id === record.specimenId
              ? {
                  ...sp,
                  status: hasDamage ? ('待修复' as const) : ('在馆' as const),
                  pressingStatus: !checks.pressingOk ? ('受潮' as const) : sp.pressingStatus,
                  updatedAt: now,
                }
              : sp
          ),
        }))
      },

      updateOverdueRecords: () => {
        const today = new Date().toISOString().split('T')[0]
        set((s) => ({
          borrowRecords: s.borrowRecords.map((r) =>
            r.status === '借出中' && r.expectedReturnDate < today
              ? { ...r, status: '逾期' as const }
              : r
          ),
        }))
      },
    }),
    {
      name: 'specimen-cabinet-store-v2',
    }
  )
)
