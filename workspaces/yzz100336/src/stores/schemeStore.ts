import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Scheme, ShelfConfig, Placement } from '@/types'
import { DEFAULT_LAYERS, DEFAULT_SHELF_WIDTH, DEFAULT_SHELF_DEPTH } from '@/types'

interface SchemeState {
  currentSchemeId: string | null
  schemes: Record<string, Scheme>
  createScheme: (name: string) => string
  deleteScheme: (id: string) => void
  duplicateScheme: (id: string, newName: string) => string
  updateScheme: (id: string, partial: Partial<Omit<Scheme, 'id'>>) => void
  addPlacement: (schemeId: string, placement: Placement) => void
  removePlacement: (schemeId: string, placementId: string) => void
  updatePlacement: (schemeId: string, placementId: string, partial: Partial<Omit<Placement, 'id'>>) => void
  updateShelfConfig: (schemeId: string, shelfConfig: Partial<ShelfConfig>) => void
  setCurrentSchemeId: (id: string | null) => void
}

export const useSchemeStore = create<SchemeState>()(
  persist(
    (set) => ({
      currentSchemeId: null,
      schemes: {},

      createScheme: (name) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const shelf: ShelfConfig = {
          id: crypto.randomUUID(),
          name,
          width: DEFAULT_SHELF_WIDTH,
          depth: DEFAULT_SHELF_DEPTH,
          layers: DEFAULT_LAYERS.map((l) => ({ ...l, id: crypto.randomUUID() })),
        }
        const scheme: Scheme = {
          id,
          name,
          shelf,
          placements: [],
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          schemes: { ...state.schemes, [id]: scheme },
          currentSchemeId: id,
        }))
        return id
      },

      deleteScheme: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.schemes
          return {
            schemes: rest,
            currentSchemeId: state.currentSchemeId === id ? null : state.currentSchemeId,
          }
        }),

      duplicateScheme: (id, newName) => {
        const newId = crypto.randomUUID()
        const now = new Date().toISOString()
        set((state) => {
          const original = state.schemes[id]
          if (!original) return {}
          const dup: Scheme = {
            ...original,
            id: newId,
            name: newName,
            placements: original.placements.map((p) => ({
              ...p,
              id: crypto.randomUUID(),
            })),
            createdAt: now,
            updatedAt: now,
          }
          return { schemes: { ...state.schemes, [newId]: dup } }
        })
        return newId
      },

      updateScheme: (id, partial) =>
        set((state) => {
          const scheme = state.schemes[id]
          if (!scheme) return {}
          return {
            schemes: {
              ...state.schemes,
              [id]: { ...scheme, ...partial, updatedAt: new Date().toISOString() },
            },
          }
        }),

      addPlacement: (schemeId, placement) =>
        set((state) => {
          const scheme = state.schemes[schemeId]
          if (!scheme) return {}
          return {
            schemes: {
              ...state.schemes,
              [schemeId]: {
                ...scheme,
                placements: [...scheme.placements, placement],
                updatedAt: new Date().toISOString(),
              },
            },
          }
        }),

      removePlacement: (schemeId, placementId) =>
        set((state) => {
          const scheme = state.schemes[schemeId]
          if (!scheme) return {}
          return {
            schemes: {
              ...state.schemes,
              [schemeId]: {
                ...scheme,
                placements: scheme.placements.filter((p) => p.id !== placementId),
                updatedAt: new Date().toISOString(),
              },
            },
          }
        }),

      updatePlacement: (schemeId, placementId, partial) =>
        set((state) => {
          const scheme = state.schemes[schemeId]
          if (!scheme) return {}
          return {
            schemes: {
              ...state.schemes,
              [schemeId]: {
                ...scheme,
                placements: scheme.placements.map((p) =>
                  p.id === placementId ? { ...p, ...partial } : p
                ),
                updatedAt: new Date().toISOString(),
              },
            },
          }
        }),

      updateShelfConfig: (schemeId, shelfConfig) =>
        set((state) => {
          const scheme = state.schemes[schemeId]
          if (!scheme) return {}
          return {
            schemes: {
              ...state.schemes,
              [schemeId]: {
                ...scheme,
                shelf: { ...scheme.shelf, ...shelfConfig },
                updatedAt: new Date().toISOString(),
              },
            },
          }
        }),

      setCurrentSchemeId: (id) => set({ currentSchemeId: id }),
    }),
    { name: 'shelf-schemes' }
  )
)
