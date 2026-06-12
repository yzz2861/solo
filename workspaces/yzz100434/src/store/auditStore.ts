import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AuditSession,
  AuditChecklistItem,
  ScannedFile,
  FileStatus,
} from '@/types'
import { getDefaultChecklist } from '@/data/defaultChecklist'
import { matchAndAnalyze } from '@/engine/matchingEngine'

interface AuditStore {
  session: AuditSession
  setSessionName: (name: string) => void
  setAuditDate: (date: string) => void
  toggleAuditDayMode: () => void
  importScannedFiles: (files: ScannedFile[]) => void
  toggleStarred: (itemId: string) => void
  updateItemStatus: (itemId: string, status: FileStatus) => void
  updateItemExpiry: (itemId: string, expiryDate: string) => void
  updateItemPages: (itemId: string, actualPages: number) => void
  removeScannedFile: (filePath: string) => void
  resetSession: () => void
  getCompletionStats: () => {
    total: number
    existing: number
    missing: number
    expired: number
    needsUpdate: number
    completionRate: number
    starredTotal: number
    starredReady: number
  }
  getCriticalAlerts: () => AuditChecklistItem[]
  getTodaySupplementList: () => AuditChecklistItem[]
}

function createDefaultSession(): AuditSession {
  return {
    id: `session-${Date.now()}`,
    name: '验厂准备',
    auditDate: '',
    checklist: getDefaultChecklist(),
    scannedFiles: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    auditDayMode: false,
  }
}

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      session: createDefaultSession(),

      setSessionName: (name) =>
        set((state) => ({
          session: { ...state.session, name, updatedAt: Date.now() },
        })),

      setAuditDate: (date) =>
        set((state) => ({
          session: { ...state.session, auditDate: date, updatedAt: Date.now() },
        })),

      toggleAuditDayMode: () =>
        set((state) => ({
          session: {
            ...state.session,
            auditDayMode: !state.session.auditDayMode,
            updatedAt: Date.now(),
          },
        })),

      importScannedFiles: (files) =>
        set((state) => {
          const existingPaths = new Set(state.session.scannedFiles.map((f) => f.path))
          const newFiles = files.filter((f) => !existingPaths.has(f.path))
          const allFiles = [...state.session.scannedFiles, ...newFiles]
          const updatedChecklist = matchAndAnalyze(
            state.session.checklist,
            allFiles
          )
          return {
            session: {
              ...state.session,
              scannedFiles: allFiles,
              checklist: updatedChecklist,
              updatedAt: Date.now(),
            },
          }
        }),

      toggleStarred: (itemId) =>
        set((state) => {
          const updatedChecklist = state.session.checklist.map((item) =>
            item.id === itemId ? { ...item, starred: !item.starred } : item
          )
          return {
            session: {
              ...state.session,
              checklist: updatedChecklist,
              updatedAt: Date.now(),
            },
          }
        }),

      updateItemStatus: (itemId, status) =>
        set((state) => {
          const updatedChecklist = state.session.checklist.map((item) =>
            item.id === itemId ? { ...item, status } : item
          )
          return {
            session: {
              ...state.session,
              checklist: updatedChecklist,
              updatedAt: Date.now(),
            },
          }
        }),

      updateItemExpiry: (itemId, expiryDate) =>
        set((state) => {
          const updatedChecklist = state.session.checklist.map((item) =>
            item.id === itemId ? { ...item, expiryDate } : item
          )
          const reanalyzed = matchAndAnalyze(
            updatedChecklist,
            state.session.scannedFiles
          )
          return {
            session: {
              ...state.session,
              checklist: reanalyzed,
              updatedAt: Date.now(),
            },
          }
        }),

      updateItemPages: (itemId, actualPages) =>
        set((state) => {
          const updatedChecklist = state.session.checklist.map((item) =>
            item.id === itemId ? { ...item, actualPages } : item
          )
          const reanalyzed = matchAndAnalyze(
            updatedChecklist,
            state.session.scannedFiles
          )
          return {
            session: {
              ...state.session,
              checklist: reanalyzed,
              updatedAt: Date.now(),
            },
          }
        }),

      removeScannedFile: (filePath) =>
        set((state) => {
          const filteredFiles = state.session.scannedFiles.filter(
            (f) => f.path !== filePath
          )
          const updatedChecklist = matchAndAnalyze(
            state.session.checklist,
            filteredFiles
          )
          return {
            session: {
              ...state.session,
              scannedFiles: filteredFiles,
              checklist: updatedChecklist,
              updatedAt: Date.now(),
            },
          }
        }),

      resetSession: () =>
        set({
          session: createDefaultSession(),
        }),

      getCompletionStats: () => {
        const { checklist } = get().session
        const total = checklist.length
        const existing = checklist.filter((i) => i.status === 'existing').length
        const missing = checklist.filter((i) => i.status === 'missing').length
        const expired = checklist.filter((i) => i.status === 'expired').length
        const needsUpdate = checklist.filter(
          (i) => i.status === 'needs_update'
        ).length
        const completionRate =
          total > 0 ? Math.round((existing / total) * 100) : 0
        const starredTotal = checklist.filter((i) => i.starred).length
        const starredReady = checklist.filter(
          (i) => i.starred && i.status === 'existing'
        ).length
        return {
          total,
          existing,
          missing,
          expired,
          needsUpdate,
          completionRate,
          starredTotal,
          starredReady,
        }
      },

      getCriticalAlerts: () => {
        const { checklist } = get().session
        return checklist.filter(
          (item) =>
            item.alerts.some((a) => a.severity === 'critical') ||
            item.status === 'missing'
        )
      },

      getTodaySupplementList: () => {
        const { checklist } = get().session
        return checklist.filter(
          (item) =>
            item.status === 'missing' ||
            item.status === 'expired' ||
            item.alerts.some((a) => a.severity === 'critical')
        )
      },
    }),
    {
      name: 'audit-folder-assistant',
    }
  )
)
