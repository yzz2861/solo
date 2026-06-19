import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppEvent, Judge, Work, Score, ValidationWarning } from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

function generateAnonymousCode(index: number): string {
  return 'A' + String(index + 1).padStart(2, '0')
}

interface AppState {
  events: AppEvent[]
  judges: Judge[]
  works: Work[]
  scores: Score[]
  warnings: ValidationWarning[]
  imageFolderHandle: string

  addEvent: (event: Omit<AppEvent, 'id' | 'revealed'>) => string
  updateEvent: (id: string, data: Partial<AppEvent>) => void
  deleteEvent: (id: string) => void
  revealEvent: (id: string) => void
  unrevealEvent: (id: string) => void

  addJudge: (eventId: string, name: string) => string
  updateJudge: (id: string, data: Partial<Judge>) => void
  removeJudge: (id: string) => void

  importWorks: (eventId: string, items: { imagePath: string; author: string; theme: string }[], imageMap: Record<string, string>) => void
  removeWork: (id: string) => void
  clearWorks: (eventId: string) => void

  setScore: (workId: string, judgeId: string, score: number | null) => void
  setComment: (workId: string, judgeId: string, comment: string) => void

  setWarnings: (warnings: ValidationWarning[]) => void
  clearWarnings: () => void

  setImageFolderHandle: (handle: string) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      events: [],
      judges: [],
      works: [],
      scores: [],
      warnings: [],
      imageFolderHandle: '',

      addEvent: (eventData) => {
        const id = generateId()
        const event: AppEvent = { ...eventData, id, revealed: false }
        set((s) => ({ events: [...s.events, event] }))
        return id
      },

      updateEvent: (id, data) => {
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...data } : e)),
        }))
      },

      deleteEvent: (id) => {
        set((s) => {
          const judgeIds = s.judges.filter((j) => j.eventId === id).map((j) => j.id)
          const workIds = s.works.filter((w) => w.eventId === id).map((w) => w.id)
          return {
            events: s.events.filter((e) => e.id !== id),
            judges: s.judges.filter((j) => j.eventId !== id),
            works: s.works.filter((w) => w.eventId !== id),
            scores: s.scores.filter((sc) => !workIds.includes(sc.workId) && !judgeIds.includes(sc.judgeId)),
          }
        })
      },

      revealEvent: (id) => {
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, revealed: true } : e)),
        }))
      },

      unrevealEvent: (id) => {
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, revealed: false } : e)),
        }))
      },

      addJudge: (eventId, name) => {
        const id = generateId()
        const judge: Judge = { id, eventId, name, absent: false, absentNote: '' }
        set((s) => {
          const works = s.works.filter((w) => w.eventId === eventId)
          const newScores = works.map((w) => ({
            id: generateId(),
            workId: w.id,
            judgeId: id,
            score: null,
            comment: '',
          }))
          return {
            judges: [...s.judges, judge],
            scores: [...s.scores, ...newScores],
          }
        })
        return id
      },

      updateJudge: (id, data) => {
        set((s) => ({
          judges: s.judges.map((j) => (j.id === id ? { ...j, ...data } : j)),
        }))
      },

      removeJudge: (id) => {
        set((s) => ({
          judges: s.judges.filter((j) => j.id !== id),
          scores: s.scores.filter((sc) => sc.judgeId !== id),
        }))
      },

      importWorks: (eventId, items, imageMap) => {
        set((s) => {
          const existingWorks = s.works.filter((w) => w.eventId === eventId)
          const startIndex = existingWorks.length
          const newWorks: Work[] = items.map((item, i) => ({
            id: generateId(),
            eventId,
            anonymousCode: generateAnonymousCode(startIndex + i),
            imagePath: item.imagePath,
            author: item.author,
            theme: item.theme,
            imageValid: !!imageMap[item.imagePath],
            imageUrl: imageMap[item.imagePath] || '',
          }))
          const judgeIds = s.judges.filter((j) => j.eventId === eventId).map((j) => j.id)
          const newScores: Score[] = []
          for (const work of newWorks) {
            for (const judgeId of judgeIds) {
              newScores.push({
                id: generateId(),
                workId: work.id,
                judgeId,
                score: null,
                comment: '',
              })
            }
          }
          return {
            works: [...s.works, ...newWorks],
            scores: [...s.scores, ...newScores],
          }
        })
      },

      removeWork: (id) => {
        set((s) => ({
          works: s.works.filter((w) => w.id !== id),
          scores: s.scores.filter((sc) => sc.workId !== id),
        }))
      },

      clearWorks: (eventId) => {
        set((s) => {
          const workIds = s.works.filter((w) => w.eventId === eventId).map((w) => w.id)
          return {
            works: s.works.filter((w) => w.eventId !== eventId),
            scores: s.scores.filter((sc) => !workIds.includes(sc.workId)),
          }
        })
      },

      setScore: (workId, judgeId, score) => {
        set((s) => ({
          scores: s.scores.map((sc) =>
            sc.workId === workId && sc.judgeId === judgeId ? { ...sc, score } : sc
          ),
        }))
      },

      setComment: (workId, judgeId, comment) => {
        set((s) => ({
          scores: s.scores.map((sc) =>
            sc.workId === workId && sc.judgeId === judgeId ? { ...sc, comment } : sc
          ),
        }))
      },

      setWarnings: (warnings) => set({ warnings }),
      clearWarnings: () => set({ warnings: [] }),

      setImageFolderHandle: (handle) => set({ imageFolderHandle: handle }),
    }),
    {
      name: 'photo-review-storage',
      partialize: (state) => ({
        events: state.events,
        judges: state.judges,
        works: state.works.map((w) => ({ ...w, imageUrl: '' })),
        scores: state.scores,
      }),
    }
  )
)
