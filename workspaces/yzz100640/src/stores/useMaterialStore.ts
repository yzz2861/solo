import { create } from 'zustand';
import type { MaterialItem } from '@/types';
import { MaterialService } from '@/services/materialService';

interface MaterialState {
  materials: MaterialItem[];
  isLoading: boolean;
  selectedType: MaterialItem['sourceType'] | 'all';
  searchKeyword: string;
  list: (type?: MaterialItem['sourceType']) => Promise<void>;
  search: (keyword: string, filters?: any) => Promise<void>;
  setSelectedType: (t: MaterialItem['sourceType'] | 'all') => void;
  setSearchKeyword: (k: string) => void;
  update: (id: string, data: Partial<MaterialItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useMaterialStore = create<MaterialState>((set) => ({
  materials: [],
  isLoading: false,
  selectedType: 'all',
  searchKeyword: '',
  list: async (type) => {
    set({ isLoading: true });
    try {
      const materials = await MaterialService.list(type ?? undefined);
      set({ materials });
    } finally {
      set({ isLoading: false });
    }
  },
  search: async (keyword, filters) => {
    set({ isLoading: true });
    try {
      const materials = await MaterialService.search(keyword, filters);
      set({ materials, searchKeyword: keyword });
    } finally {
      set({ isLoading: false });
    }
  },
  setSelectedType: (t) => set({ selectedType: t }),
  setSearchKeyword: (k) => set({ searchKeyword: k }),
  update: async (id, data) => {
    await MaterialService.update(id, data);
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m
      ),
    }));
  },
  remove: async (id) => {
    await MaterialService.delete(id);
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    }));
  },
}));
