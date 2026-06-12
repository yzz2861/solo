import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Annotation, AnnotationHistory, Photo, UserRole } from '@/types'
import { ANNOTATIONS, ANNOTATION_HISTORIES, PHOTOS, STORES, INSPECTION_BATCHES, REPORTS, RECTIFICATION_ITEMS } from '@/data/mock'
import type { StoreInfo, InspectionBatch, RectificationItem, Report } from '@/types'

interface AppState {
  currentUser: { id: string; name: string; role: UserRole }
  stores: StoreInfo[]
  batches: InspectionBatch[]
  photos: Photo[]
  annotations: Annotation[]
  annotationHistories: AnnotationHistory[]
  rectificationItems: RectificationItem[]
  reports: Report[]
  selectedStoreFilter: string | null
  selectedIssueFilter: string | null
  importedPhotos: Photo[]

  setCurrentUser: (user: { id: string; name: string; role: UserRole }) => void
  setSelectedStoreFilter: (storeId: string | null) => void
  setSelectedIssueFilter: (issueType: string | null) => void
  addImportedPhotos: (photos: Photo[]) => void
  clearImportedPhotos: () => void
  confirmAnnotation: (annotationId: string, note?: string) => void
  rejectAnnotation: (annotationId: string, note?: string) => void
  modifyAnnotationType: (annotationId: string, newType: string, note?: string) => void
  modifyAnnotationPosition: (annotationId: string, x: number, y: number, width: number, height: number) => void
  addAnnotationNote: (annotationId: string, note: string) => void
  getAnnotationsByPhotoId: (photoId: string) => Annotation[]
  getPhotoById: (photoId: string) => Photo | undefined
  getPhotosByStoreId: (storeId: string) => Photo[]
  getPhotosByBatchId: (batchId: string) => Photo[]
  getRectificationByStoreId: (storeId: string) => RectificationItem[]
  getReportById: (reportId: string) => Report | undefined
  getBatchById: (batchId: string) => InspectionBatch | undefined
  getStoreById: (storeId: string) => StoreInfo | undefined
  getHistoryByAnnotationId: (annotationId: string) => AnnotationHistory[]
  updateRectificationStatus: (itemId: string, status: RectificationItem['status']) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: { id: 'sup-1', name: '王建国', role: 'supervisor' },
      stores: STORES,
      batches: INSPECTION_BATCHES,
      photos: PHOTOS,
      annotations: ANNOTATIONS,
      annotationHistories: ANNOTATION_HISTORIES,
      rectificationItems: RECTIFICATION_ITEMS,
      reports: REPORTS,
      selectedStoreFilter: null,
      selectedIssueFilter: null,
      importedPhotos: [],

      setCurrentUser: (user) => set({ currentUser: user }),

      setSelectedStoreFilter: (storeId) => set({ selectedStoreFilter: storeId }),

      setSelectedIssueFilter: (issueType) => set({ selectedIssueFilter: issueType }),

      addImportedPhotos: (photos) =>
        set((state) => ({
          importedPhotos: [...state.importedPhotos, ...photos],
          photos: [...state.photos, ...photos],
        })),

      clearImportedPhotos: () => set({ importedPhotos: [] }),

      confirmAnnotation: (annotationId, note) =>
        set((state) => {
          const now = new Date().toISOString()
          const annotation = state.annotations.find((a) => a.id === annotationId)
          if (!annotation) return state

          const newHistory: AnnotationHistory = {
            id: `hist-${Date.now()}`,
            annotationId,
            action: 'confirmed',
            previousValue: '待确认',
            newValue: '已确认',
            operatorId: state.currentUser.id,
            operatorName: state.currentUser.name,
            timestamp: now,
          }

          return {
            annotations: state.annotations.map((a) =>
              a.id === annotationId ? { ...a, status: 'CONFIRMED' as const, note: note || a.note } : a
            ),
            annotationHistories: [...state.annotationHistories, newHistory],
          }
        }),

      rejectAnnotation: (annotationId, note) =>
        set((state) => {
          const now = new Date().toISOString()
          const newHistory: AnnotationHistory = {
            id: `hist-${Date.now()}`,
            annotationId,
            action: 'rejected',
            previousValue: '待确认',
            newValue: '已驳回',
            operatorId: state.currentUser.id,
            operatorName: state.currentUser.name,
            timestamp: now,
          }

          return {
            annotations: state.annotations.map((a) =>
              a.id === annotationId ? { ...a, status: 'REJECTED' as const, note: note || a.note } : a
            ),
            annotationHistories: [...state.annotationHistories, newHistory],
          }
        }),

      modifyAnnotationType: (annotationId, newType, note) =>
        set((state) => {
          const now = new Date().toISOString()
          const annotation = state.annotations.find((a) => a.id === annotationId)
          if (!annotation) return state

          const ISSUE_TYPE_LABELS: Record<string, string> = {
            MISSING_PRICE: '缺价签',
            WRONG_PRICE: '错价签',
            INSUFFICIENT_SHELF: '排面不足',
            COMPETITOR_MIX: '竞品混放',
            DISPLAY_BLOCKED: '堆头遮挡',
          }

          const newHistory: AnnotationHistory = {
            id: `hist-${Date.now()}`,
            annotationId,
            action: 'modified_type',
            previousValue: ISSUE_TYPE_LABELS[annotation.type] || annotation.type,
            newValue: ISSUE_TYPE_LABELS[newType] || newType,
            operatorId: state.currentUser.id,
            operatorName: state.currentUser.name,
            timestamp: now,
          }

          return {
            annotations: state.annotations.map((a) =>
              a.id === annotationId
                ? { ...a, type: newType as Annotation['type'], status: 'MODIFIED' as const, note: note || a.note }
                : a
            ),
            annotationHistories: [...state.annotationHistories, newHistory],
          }
        }),

      modifyAnnotationPosition: (annotationId, x, y, width, height) =>
        set((state) => {
          const now = new Date().toISOString()
          const annotation = state.annotations.find((a) => a.id === annotationId)
          if (!annotation) return state

          const newHistory: AnnotationHistory = {
            id: `hist-${Date.now()}`,
            annotationId,
            action: 'modified_position',
            previousValue: `(${annotation.x}, ${annotation.y})`,
            newValue: `(${x}, ${y})`,
            operatorId: state.currentUser.id,
            operatorName: state.currentUser.name,
            timestamp: now,
          }

          return {
            annotations: state.annotations.map((a) =>
              a.id === annotationId
                ? { ...a, x, y, width, height, status: a.status === 'PENDING' ? 'MODIFIED' as const : a.status }
                : a
            ),
            annotationHistories: [...state.annotationHistories, newHistory],
          }
        }),

      addAnnotationNote: (annotationId, note) =>
        set((state) => {
          const now = new Date().toISOString()
          const newHistory: AnnotationHistory = {
            id: `hist-${Date.now()}`,
            annotationId,
            action: 'added_note',
            previousValue: '',
            newValue: note,
            operatorId: state.currentUser.id,
            operatorName: state.currentUser.name,
            timestamp: now,
          }

          return {
            annotations: state.annotations.map((a) =>
              a.id === annotationId ? { ...a, note } : a
            ),
            annotationHistories: [...state.annotationHistories, newHistory],
          }
        }),

      getAnnotationsByPhotoId: (photoId) => get().annotations.filter((a) => a.photoId === photoId),

      getPhotoById: (photoId) => get().photos.find((p) => p.id === photoId),

      getPhotosByStoreId: (storeId) => get().photos.filter((p) => p.storeId === storeId),

      getPhotosByBatchId: (batchId) => get().photos.filter((p) => p.batchId === batchId),

      getRectificationByStoreId: (storeId) => get().rectificationItems.filter((r) => r.storeId === storeId),

      getReportById: (reportId) => get().reports.find((r) => r.id === reportId),

      getBatchById: (batchId) => get().batches.find((b) => b.id === batchId),

      getStoreById: (storeId) => get().stores.find((s) => s.id === storeId),

      getHistoryByAnnotationId: (annotationId) =>
        get().annotationHistories.filter((h) => h.annotationId === annotationId),

      updateRectificationStatus: (itemId, status) =>
        set((state) => ({
          rectificationItems: state.rectificationItems.map((r) =>
            r.id === itemId
              ? { ...r, status, completedAt: status === 'COMPLETED' ? new Date().toISOString() : null }
              : r
          ),
        })),
    }),
    {
      name: 'shelf-inspection-store',
      partialize: (state) => ({
        annotations: state.annotations,
        annotationHistories: state.annotationHistories,
        rectificationItems: state.rectificationItems,
        currentUser: state.currentUser,
      }),
    }
  )
)
