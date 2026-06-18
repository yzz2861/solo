import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Project, ComponentItem, ComponentType, Annotation, Photo,
  PhotoAngle, Measurement, RepairSuggestion, Disease, Reinspection,
  Viewpoint, ReviewTask, ReviewItem, ExpertOpinion, Alert
} from '@/types'

interface AppState {
  project: Project | null
  components: ComponentItem[]
  annotations: Annotation[]
  photos: Photo[]
  measurements: Measurement[]
  repairSuggestions: RepairSuggestion[]
  diseases: Disease[]
  reinspections: Reinspection[]
  viewpoints: Viewpoint[]
  reviewTasks: ReviewTask[]
  reviewItems: ReviewItem[]
  expertOpinions: ExpertOpinion[]
  alerts: Alert[]

  selectedComponentId: string | null
  selectedAnnotationId: string | null
  annotationMode: ComponentType | null
  rightPanelTab: 'info' | 'photos' | 'measurements' | 'repair' | 'disease'

  setProject: (project: Project) => void
  setSelectedComponentId: (id: string | null) => void
  setSelectedAnnotationId: (id: string | null) => void
  setAnnotationMode: (mode: ComponentType | null) => void
  setRightPanelTab: (tab: AppState['rightPanelTab']) => void

  addComponent: (component: ComponentItem) => void
  updateComponent: (id: string, updates: Partial<ComponentItem>) => void
  deleteComponent: (id: string) => void

  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void

  addPhoto: (photo: Photo) => void
  updatePhoto: (id: string, updates: Partial<Photo>) => void
  deletePhoto: (id: string) => void

  addMeasurement: (measurement: Measurement) => void
  deleteMeasurement: (id: string) => void

  addRepairSuggestion: (suggestion: RepairSuggestion) => void
  updateRepairSuggestion: (id: string, updates: Partial<RepairSuggestion>) => void

  addDisease: (disease: Disease) => void
  updateDisease: (id: string, updates: Partial<Disease>) => void

  addReinspection: (reinspection: Reinspection) => void

  addViewpoint: (viewpoint: Viewpoint) => void
  deleteViewpoint: (id: string) => void

  addReviewTask: (task: ReviewTask) => void
  updateReviewTask: (id: string, updates: Partial<ReviewTask>) => void

  addReviewItem: (item: ReviewItem) => void
  updateReviewItem: (id: string, updates: Partial<ReviewItem>) => void

  addExpertOpinion: (opinion: ExpertOpinion) => void

  generateAlerts: () => void
  resolveAlert: (id: string) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      project: null,
      components: [],
      annotations: [],
      photos: [],
      measurements: [],
      repairSuggestions: [],
      diseases: [],
      reinspections: [],
      viewpoints: [],
      reviewTasks: [],
      reviewItems: [],
      expertOpinions: [],
      alerts: [],

      selectedComponentId: null,
      selectedAnnotationId: null,
      annotationMode: null,
      rightPanelTab: 'info',

      setProject: (project) => set({ project }),
      setSelectedComponentId: (id) => set({ selectedComponentId: id }),
      setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),
      setAnnotationMode: (mode) => set({ annotationMode: mode }),
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

      addComponent: (component) => set((s) => ({ components: [...s.components, component] })),
      updateComponent: (id, updates) => set((s) => ({
        components: s.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      })),
      deleteComponent: (id) => set((s) => ({
        components: s.components.filter((c) => c.id !== id),
        annotations: s.annotations.filter((a) => a.componentId !== id),
        photos: s.photos.filter((p) => p.componentId !== id),
        measurements: s.measurements.filter((m) => m.componentId !== id),
        diseases: s.diseases.filter((d) => d.componentId !== id),
        selectedComponentId: s.selectedComponentId === id ? null : s.selectedComponentId,
      })),

      addAnnotation: (annotation) => set((s) => ({ annotations: [...s.annotations, annotation] })),
      updateAnnotation: (id, updates) => set((s) => ({
        annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      })),
      deleteAnnotation: (id) => set((s) => ({
        annotations: s.annotations.filter((a) => a.id !== id),
      })),

      addPhoto: (photo) => set((s) => ({ photos: [...s.photos, photo] })),
      updatePhoto: (id, updates) => set((s) => ({
        photos: s.photos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      })),
      deletePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),

      addMeasurement: (measurement) => set((s) => ({ measurements: [...s.measurements, measurement] })),
      deleteMeasurement: (id) => set((s) => ({ measurements: s.measurements.filter((m) => m.id !== id) })),

      addRepairSuggestion: (suggestion) => set((s) => ({ repairSuggestions: [...s.repairSuggestions, suggestion] })),
      updateRepairSuggestion: (id, updates) => set((s) => ({
        repairSuggestions: s.repairSuggestions.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      })),

      addDisease: (disease) => set((s) => ({ diseases: [...s.diseases, disease] })),
      updateDisease: (id, updates) => set((s) => ({
        diseases: s.diseases.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      })),

      addReinspection: (reinspection) => set((s) => ({ reinspections: [...s.reinspections, reinspection] })),

      addViewpoint: (viewpoint) => set((s) => ({ viewpoints: [...s.viewpoints, viewpoint] })),
      deleteViewpoint: (id) => set((s) => ({ viewpoints: s.viewpoints.filter((v) => v.id !== id) })),

      addReviewTask: (task) => set((s) => ({ reviewTasks: [...s.reviewTasks, task] })),
      updateReviewTask: (id, updates) => set((s) => ({
        reviewTasks: s.reviewTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })),

      addReviewItem: (item) => set((s) => ({ reviewItems: [...s.reviewItems, item] })),
      updateReviewItem: (id, updates) => set((s) => ({
        reviewItems: s.reviewItems.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      })),

      addExpertOpinion: (opinion) => set((s) => ({ expertOpinions: [...s.expertOpinions, opinion] })),

      generateAlerts: () => {
        const state = get()
        const newAlerts: Alert[] = []
        let alertId = 1

        state.components.forEach((comp) => {
          if (!comp.code || comp.code.trim() === '') {
            newAlerts.push({
              id: `alert-${alertId++}`,
              type: 'missing_code',
              severity: 'warning',
              componentId: comp.id,
              message: `构件「${comp.name}」缺少编号`,
              relatedIds: [comp.id],
              resolved: false,
            })
          }
        })

        state.photos.forEach((photo) => {
          if (photo.angle === 'unknown') {
            const comp = state.components.find((c) => c.id === photo.componentId)
            newAlerts.push({
              id: `alert-${alertId++}`,
              type: 'unknown_angle',
              severity: 'info',
              componentId: photo.componentId,
              message: `构件「${comp?.name || '未知'}」的照片拍摄角度不明，建议补拍`,
              relatedIds: [photo.id],
              resolved: false,
            })
          }
        })

        state.diseases.forEach((disease) => {
          const relatedInspections = state.reinspections.filter((r) => r.diseaseId === disease.id)
          if (relatedInspections.length >= 2) {
            const conclusions = relatedInspections.map((r) => r.conclusion)
            const uniqueConclusions = [...new Set(conclusions)]
            if (uniqueConclusions.length > 1) {
              const comp = state.components.find((c) => c.id === disease.componentId)
              newAlerts.push({
                id: `alert-${alertId++}`,
                type: 'conflicting_conclusion',
                severity: 'error',
                componentId: disease.componentId,
                message: `构件「${comp?.name || '未知'}」的病害「${disease.type}」多次复查结论不一致`,
                relatedIds: relatedInspections.map((r) => r.id),
                resolved: false,
              })
            }
          }
        })

        set({ alerts: newAlerts })
      },

      resolveAlert: (id) => set((s) => ({
        alerts: s.alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
      })),
    }),
    {
      name: 'heritage-annotation-store',
    }
  )
)
