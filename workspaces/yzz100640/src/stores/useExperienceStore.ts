import { create } from 'zustand';
import type { MaterialItem } from '@/types';
import { ExperienceService } from '@/services/experienceService';

interface ExperienceState {
  experiences: MaterialItem[];
  isLoading: boolean;
  statusFilter: 'all' | 'pending' | 'approved';
  list: (status?: 'pending' | 'approved') => Promise<void>;
  create: (data: Omit<MaterialItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MaterialItem>;
  approve: (id: string) => Promise<void>;
  update: (id: string, data: Partial<MaterialItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setStatusFilter: (s: ExperienceState['statusFilter']) => void;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  experiences: [],
  isLoading: false,
  statusFilter: 'all',
  list: async (status) => {
    set({ isLoading: true });
    try {
      const experiences = await ExperienceService.list(status ?? undefined);
      set({ experiences });
    } finally {
      set({ isLoading: false });
    }
  },
  create: async (data) => {
    const newItem = await ExperienceService.create(data);
    set((state) => ({
      experiences: [newItem, ...state.experiences],
    }));
    return newItem;
  },
  approve: async (id) => {
    await ExperienceService.approve(id);
    set((state) => ({
      experiences: state.experiences.map((e) =>
        e.id === id ? { ...e, status: 'approved', updatedAt: new Date().toISOString() } : e
      ),
    }));
  },
  update: async (id, data) => {
    await ExperienceService.update(id, data);
    set((state) => ({
      experiences: state.experiences.map((e) =>
        e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
      ),
    }));
  },
  remove: async (id) => {
    await ExperienceService.delete(id);
    set((state) => ({
      experiences: state.experiences.filter((e) => e.id !== id),
    }));
  },
  setStatusFilter: (s) => set({ statusFilter: s }),
}));
