import { create } from 'zustand'
import type { Transcript, Paragraph, Entity, Uncertainty, ChapterType, SelectedChapter } from '@/types'
import { saveProject, getProject, deleteProject, listProjects } from '@/utils/storage'
import { autoClassifyChapters } from '@/utils/parser'

interface TranscriptState {
  currentProject: Transcript | null
  projects: Transcript[]
  selectedChapter: SelectedChapter
  selectedParagraphId: string | null
  isSaving: boolean
  autoSaveEnabled: boolean

  setCurrentProject: (project: Transcript | null) => void
  loadProject: (id: string) => Promise<boolean>
  loadAllProjects: () => Promise<void>
  saveCurrentProject: () => Promise<void>
  createProject: (project: Transcript) => Promise<string>
  removeProject: (id: string) => Promise<void>

  updateParagraph: (id: string, updates: Partial<Paragraph>) => void
  updateParagraphChapter: (paragraphId: string, chapter: ChapterType) => void
  reorderParagraphs: (fromIndex: number, toIndex: number) => void
  moveParagraphToChapter: (paragraphId: string, chapter: ChapterType) => void

  addEntity: (paragraphId: string, entity: Entity) => void
  updateEntity: (id: string, updates: Partial<Entity>) => void
  toggleEntityConfirmed: (id: string) => void

  addUncertainty: (paragraphId: string, uncertainty: Uncertainty) => void
  updateUncertainty: (id: string, updates: Partial<Uncertainty>) => void
  updateUncertaintyStatus: (id: string, status: Uncertainty['status']) => void

  setSelectedChapter: (chapter: SelectedChapter) => void
  setSelectedParagraphId: (id: string | null) => void
  setAutoSaveEnabled: (enabled: boolean) => void

  reclassifyAll: () => void
  getChapterStats: () => Record<string, number>
  getFilteredParagraphs: () => Paragraph[]

  exportProjectData: (id: string) => string
  importProjectData: (data: string) => Promise<Transcript>
}

export const useTranscriptStore = create<TranscriptState>((set, get) => ({
  currentProject: null,
  projects: [],
  selectedChapter: null,
  selectedParagraphId: null,
  isSaving: false,
  autoSaveEnabled: true,

  setCurrentProject: (project) => set({ currentProject: project }),

  loadProject: async (id) => {
    const project = getProject(id)
    if (project) {
      set({ currentProject: project, selectedChapter: null, selectedParagraphId: null })
      return true
    }
    return false
  },

  loadAllProjects: async () => {
    const projects = listProjects()
    set({ projects })
  },

  saveCurrentProject: async () => {
    const { currentProject } = get()
    if (!currentProject) return

    set({ isSaving: true })
    try {
      saveProject(currentProject)
      await get().loadAllProjects()
    } finally {
      set({ isSaving: false })
    }
  },

  createProject: async (project) => {
    saveProject(project)
    await get().loadAllProjects()
    return project.id
  },

  removeProject: async (id) => {
    deleteProject(id)
    await get().loadAllProjects()
    if (get().currentProject?.id === id) {
      set({ currentProject: null })
    }
  },

  updateParagraph: (id, updates) => {
    set((state) => {
      if (!state.currentProject) return state

      const paragraphs = state.currentProject.paragraphs.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      )

      return {
        currentProject: {
          ...state.currentProject,
          paragraphs
        }
      }
    })

    if (get().autoSaveEnabled) {
      get().saveCurrentProject()
    }
  },

  updateParagraphChapter: (paragraphId, chapter) => {
    set((state) => {
      if (!state.currentProject) return state

      const paragraphs = state.currentProject.paragraphs.map((p) =>
        p.id === paragraphId ? { ...p, chapter } : p
      )

      return {
        currentProject: {
          ...state.currentProject,
          paragraphs
        }
      }
    })

    if (get().autoSaveEnabled) {
      get().saveCurrentProject()
    }
  },

  reorderParagraphs: (fromIndex, toIndex) => {
    set((state) => {
      if (!state.currentProject) return state

      const paragraphs = [...state.currentProject.paragraphs]
      const [removed] = paragraphs.splice(fromIndex, 1)
      paragraphs.splice(toIndex, 0, removed)

      const reordered = paragraphs.map((p, i) => ({ ...p, order: i }))

      return {
        currentProject: {
          ...state.currentProject,
          paragraphs: reordered
        }
      }
    })

    if (get().autoSaveEnabled) {
      get().saveCurrentProject()
    }
  },

  moveParagraphToChapter: (paragraphId, chapter) => {
    get().updateParagraphChapter(paragraphId, chapter)
  },

  addEntity: (paragraphId, entity) => {
    set((state) => {
      if (!state.currentProject) return state

      const paragraphs = state.currentProject.paragraphs.map((p) =>
        p.id === paragraphId
          ? { ...p, entities: [...p.entities, entity] }
          : p
      )

      const entities = [...state.currentProject.entities, entity]

      return {
        currentProject: {
          ...state.currentProject,
          paragraphs,
          entities
        }
      }
    })

    if (get().autoSaveEnabled) {
      get().saveCurrentProject()
    }
  },

  updateEntity: (id, updates) => {
    set((state) => {
      if (!state.currentProject) return state

      const entities = state.currentProject.entities.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      )

      const paragraphs = state.currentProject.paragraphs.map((p) => ({
        ...p,
        entities: p.entities.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        )
      }))

      return {
        currentProject: {
          ...state.currentProject,
          entities,
          paragraphs
        }
      }
    })

    if (get().autoSaveEnabled) {
      get().saveCurrentProject()
    }
  },

  toggleEntityConfirmed: (id) => {
    const entity = get().currentProject?.entities.find((e) => e.id === id)
    if (entity) {
      get().updateEntity(id, { confirmed: !entity.confirmed })
    }
  },

  addUncertainty: (paragraphId, uncertainty) => {
    set((state) => {
      if (!state.currentProject) return state

      const paragraphs = state.currentProject.paragraphs.map((p) =>
        p.id === paragraphId
          ? { ...p, uncertainties: [...p.uncertainties, uncertainty] }
          : p
      )

      const uncertainties = [...state.currentProject.uncertainties, uncertainty]

      return {
        currentProject: {
          ...state.currentProject,
          paragraphs,
          uncertainties
        }
      }
    })

    if (get().autoSaveEnabled) {
      get().saveCurrentProject()
    }
  },

  updateUncertainty: (id, updates) => {
    set((state) => {
      if (!state.currentProject) return state

      const uncertainties = state.currentProject.uncertainties.map((u) =>
        u.id === id ? { ...u, ...updates } : u
      )

      const paragraphs = state.currentProject.paragraphs.map((p) => ({
        ...p,
        uncertainties: p.uncertainties.map((u) =>
          u.id === id ? { ...u, ...updates } : u
        )
      }))

      return {
        currentProject: {
          ...state.currentProject,
          uncertainties,
          paragraphs
        }
      }
    })

    if (get().autoSaveEnabled) {
      get().saveCurrentProject()
    }
  },

  updateUncertaintyStatus: (id, status) => {
    get().updateUncertainty(id, { status })
  },

  setSelectedChapter: (chapter) => set({ selectedChapter: chapter }),

  setSelectedParagraphId: (id) => set({ selectedParagraphId: id }),

  setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),

  reclassifyAll: () => {
    set((state) => {
      if (!state.currentProject) return state

      const classified = autoClassifyChapters(state.currentProject.paragraphs)

      return {
        currentProject: {
          ...state.currentProject,
          paragraphs: classified
        }
      }
    })

    if (get().autoSaveEnabled) {
      get().saveCurrentProject()
    }
  },

  getChapterStats: () => {
    const { currentProject } = get()
    if (!currentProject) return {}

    const stats: Record<string, number> = {
      childhood: 0,
      techniques: 0,
      mentorship: 0,
      tools: 0,
      difficulties: 0,
      unclassified: 0
    }

    currentProject.paragraphs.forEach((p) => {
      const key = p.chapter || 'unclassified'
      stats[key]++
    })

    return stats
  },

  getFilteredParagraphs: () => {
    const { currentProject, selectedChapter } = get()
    if (!currentProject) return []

    const sorted = [...currentProject.paragraphs].sort((a, b) => a.order - b.order)

    if (selectedChapter === null) {
      return sorted.filter((p) => p.chapter === null)
    }

    if (selectedChapter !== undefined) {
      return sorted.filter((p) => p.chapter === selectedChapter)
    }

    return sorted
  },

  exportProjectData: (id) => {
    const project = getProject(id)
    if (!project) throw new Error('项目不存在')
    return JSON.stringify(project, null, 2)
  },

  importProjectData: async (data) => {
    const project = JSON.parse(data) as Transcript
    project.id = `${Date.now()}_${project.id}`
    project.createdAt = new Date().toISOString()
    project.updatedAt = new Date().toISOString()
    saveProject(project)
    await get().loadAllProjects()
    return project
  }
}))
