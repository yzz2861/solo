import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Feedback, DiscomfortItem, Photo, StyleNumber, SizeChart, Alert, PriorityMark, BodyPart } from '@/utils/types'
import { detectAllAlerts } from '@/utils/alertEngine'

interface FitBackState {
  styles: StyleNumber[]
  sizeCharts: SizeChart[]
  feedbacks: Feedback[]
  discomforts: DiscomfortItem[]
  photos: Photo[]
  priorityMarks: PriorityMark[]

  addStyle: (style: StyleNumber) => void
  updateStyle: (id: string, data: Partial<StyleNumber>) => void
  deleteStyle: (id: string) => void

  addSizeChart: (chart: SizeChart) => void
  updateSizeChart: (id: string, data: Partial<SizeChart>) => void
  deleteSizeChart: (id: string) => void

  addFeedback: (feedback: Feedback, discomforts: DiscomfortItem[], photos: Photo[]) => void
  deleteFeedback: (id: string) => void

  togglePriority: (styleId: string, bodyPart: BodyPart) => void

  getAlerts: () => Alert[]
  getFeedbacksByStyle: (styleId: string, version?: string) => Feedback[]
  getDiscomfortsByFeedback: (feedbackId: string) => DiscomfortItem[]
  getPhotosByFeedback: (feedbackId: string) => Photo[]
  getDiscomfortsByBodyPart: (bodyPart: BodyPart, styleId?: string) => DiscomfortItem[]
  getHighFrequencyParts: (styleId?: string) => { bodyPart: BodyPart; count: number }[]
}

export const useStore = create<FitBackState>()(
  persist(
    (set, get) => ({
      styles: [],
      sizeCharts: [],
      feedbacks: [],
      discomforts: [],
      photos: [],
      priorityMarks: [],

      addStyle: (style) => set(s => ({ styles: [...s.styles, style] })),
      updateStyle: (id, data) => set(s => ({
        styles: s.styles.map(st => st.id === id ? { ...st, ...data } : st),
      })),
      deleteStyle: (id) => set(s => ({
        styles: s.styles.filter(st => st.id !== id),
        sizeCharts: s.sizeCharts.filter(sc => sc.styleId !== id),
        feedbacks: s.feedbacks.filter(fb => fb.styleId !== id),
      })),

      addSizeChart: (chart) => set(s => ({ sizeCharts: [...s.sizeCharts, chart] })),
      updateSizeChart: (id, data) => set(s => ({
        sizeCharts: s.sizeCharts.map(sc => sc.id === id ? { ...sc, ...data } : sc),
      })),
      deleteSizeChart: (id) => set(s => ({
        sizeCharts: s.sizeCharts.filter(sc => sc.id !== id),
      })),

      addFeedback: (feedback, discomforts, photos) => set(s => ({
        feedbacks: [...s.feedbacks, feedback],
        discomforts: [...s.discomforts, ...discomforts],
        photos: [...s.photos, ...photos],
      })),
      deleteFeedback: (id) => set(s => ({
        feedbacks: s.feedbacks.filter(fb => fb.id !== id),
        discomforts: s.discomforts.filter(d => d.feedbackId !== id),
        photos: s.photos.filter(p => p.feedbackId !== id),
      })),

      togglePriority: (styleId, bodyPart) => set(s => {
        const existing = s.priorityMarks.find(m => m.styleId === styleId && m.bodyPart === bodyPart)
        if (existing) {
          return { priorityMarks: s.priorityMarks.filter(m => !(m.styleId === styleId && m.bodyPart === bodyPart)) }
        }
        return { priorityMarks: [...s.priorityMarks, { styleId, bodyPart, marked: true }] }
      }),

      getAlerts: () => {
        const s = get()
        return detectAllAlerts(s.feedbacks, s.discomforts, s.photos, s.styles, s.sizeCharts)
      },

      getFeedbacksByStyle: (styleId, version) => {
        const s = get()
        return s.feedbacks.filter(fb => {
          if (fb.styleId !== styleId) return false
          if (version && fb.version !== version) return false
          return true
        })
      },

      getDiscomfortsByFeedback: (feedbackId) => {
        return get().discomforts.filter(d => d.feedbackId === feedbackId)
      },

      getPhotosByFeedback: (feedbackId) => {
        return get().photos.filter(p => p.feedbackId === feedbackId)
      },

      getDiscomfortsByBodyPart: (bodyPart, styleId) => {
        const s = get()
        let fbs = s.feedbacks
        if (styleId) fbs = fbs.filter(fb => fb.styleId === styleId)
        const fbIds = new Set(fbs.map(fb => fb.id))
        return s.discomforts.filter(d => d.bodyPart === bodyPart && fbIds.has(d.feedbackId))
      },

      getHighFrequencyParts: (styleId) => {
        const s = get()
        const counts: Partial<Record<BodyPart, number>> = {}
        let fbs = s.feedbacks
        if (styleId) fbs = fbs.filter(fb => fb.styleId === styleId)
        const fbIds = new Set(fbs.map(fb => fb.id))
        for (const d of s.discomforts) {
          if (fbIds.has(d.feedbackId)) {
            counts[d.bodyPart] = (counts[d.bodyPart] || 0) + 1
          }
        }
        return (Object.entries(counts) as [BodyPart, number][])
          .map(([bodyPart, count]) => ({ bodyPart, count }))
          .sort((a, b) => b.count - a.count)
      },
    }),
    {
      name: 'fitback-storage',
    }
  )
)
