import { create } from 'zustand';
import type { Annotation } from '@/types';
import { generateId } from '@/utils/math';

const STORAGE_KEY = 'patrol-annotations';

interface AnnotationState {
  annotations: Annotation[];
  isAnnotationMode: boolean;
  selectedAnnotationId: string | null;
  filter: {
    type?: string;
    targetType?: string;
  };
  searchQuery: string;
  
  actions: {
    addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
    updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
    deleteAnnotation: (id: string) => void;
    toggleAnnotationMode: () => void;
    selectAnnotation: (id: string | null) => void;
    setFilter: (filter: Partial<AnnotationState['filter']>) => void;
    setSearchQuery: (query: string) => void;
    loadAnnotations: () => void;
    saveAnnotations: () => void;
    getAnnotationsForTarget: (targetId: string) => Annotation[];
    getFilteredAnnotations: () => Annotation[];
  };
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  isAnnotationMode: false,
  selectedAnnotationId: null,
  filter: {},
  searchQuery: '',
  
  actions: {
    addAnnotation: (annotation) => {
      const newAnnotation: Annotation = {
        ...annotation,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      
      set((state) => ({
        annotations: [...state.annotations, newAnnotation],
      }));
      
      get().actions.saveAnnotations();
    },
    
    updateAnnotation: (id, updates) => {
      set((state) => ({
        annotations: state.annotations.map(a =>
          a.id === id ? { ...a, ...updates } : a
        ),
      }));
      
      get().actions.saveAnnotations();
    },
    
    deleteAnnotation: (id) => {
      set((state) => ({
        annotations: state.annotations.filter(a => a.id !== id),
        selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
      }));
      
      get().actions.saveAnnotations();
    },
    
    toggleAnnotationMode: () => set((state) => ({
      isAnnotationMode: !state.isAnnotationMode,
    })),
    
    selectAnnotation: (id) => set({ selectedAnnotationId: id }),
    
    setFilter: (filter) => set((state) => ({
      filter: { ...state.filter, ...filter },
    })),
    
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    loadAnnotations: () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          set({ annotations: JSON.parse(stored) });
        }
      } catch (error) {
        console.error('Failed to load annotations:', error);
      }
    },
    
    saveAnnotations: () => {
      try {
        const { annotations } = get();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
      } catch (error) {
        console.error('Failed to save annotations:', error);
      }
    },
    
    getAnnotationsForTarget: (targetId) => {
      return get().annotations.filter(a => a.targetId === targetId);
    },
    
    getFilteredAnnotations: () => {
      const { annotations, filter, searchQuery } = get();
      
      return annotations.filter(a => {
        if (filter.targetType && a.targetType !== filter.targetType) return false;
        
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            a.reason.toLowerCase().includes(query) ||
            a.note.toLowerCase().includes(query) ||
            a.createdBy.toLowerCase().includes(query)
          );
        }
        
        return true;
      }).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  },
}));
