import { create } from 'zustand';
import type {
  Hazard,
  HazardFilters,
  HazardStatus,
  Rectification,
  Review,
  UserRole,
} from '@/types';
import {
  fetchHazards,
  fetchHazardById,
  createHazard as apiCreateHazard,
  submitRectification as apiSubmitRectification,
  submitReview as apiSubmitReview,
} from '@/utils/api';

interface AppState {
  hazards: Hazard[];
  currentRole: UserRole;
  filters: HazardFilters;
  isLoading: boolean;
  error: string | null;

  setRole: (role: UserRole) => void;
  setFilters: (filters: Partial<HazardFilters>) => void;

  loadHazards: () => Promise<void>;

  addHazard: (
    data: Omit<
      Hazard,
      | 'id'
      | 'status'
      | 'rejectCount'
      | 'isOverdue'
      | 'createdAt'
      | 'rectifications'
      | 'reviews'
    >
  ) => Promise<Hazard | null>;

  submitRectification: (
    hazardId: string,
    rect: Omit<Rectification, 'id' | 'hazardId' | 'submittedAt'>
  ) => Promise<boolean>;

  submitReview: (
    hazardId: string,
    review: Omit<Review, 'id' | 'hazardId' | 'reviewedAt'>
  ) => Promise<boolean>;

  getHazardById: (id: string) => Hazard | undefined;
  refreshOverdue: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  hazards: [],
  currentRole: 'SAFETY_OFFICER',
  filters: { status: 'ALL', team: 'ALL' },
  isLoading: false,
  error: null,

  setRole: (role) => {
    set({ currentRole: role });
  },

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  loadHazards: async () => {
    set({ isLoading: true, error: null });
    try {
      const hazards = await fetchHazards();
      set({ hazards, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载数据失败', isLoading: false });
    }
  },

  addHazard: async (data) => {
    set({ error: null });
    try {
      const newHazard = await apiCreateHazard({
        boxNumber: data.boxNumber,
        location: data.location,
        description: data.description,
        photoUrl: data.photoUrl,
        team: data.team,
        deadline: data.deadline,
        createdBy: data.createdBy,
      });
      set((s) => ({ hazards: [newHazard, ...s.hazards] }));
      return newHazard;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '创建隐患失败' });
      return null;
    }
  },

  submitRectification: async (hazardId, rect) => {
    set({ error: null });
    try {
      const updated = await apiSubmitRectification(hazardId, {
        description: rect.description,
        photoUrl: rect.photoUrl,
        submittedBy: rect.submittedBy,
      });
      set((s) => ({
        hazards: s.hazards.map((h) => (h.id === hazardId ? updated : h)),
      }));
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '提交整改失败' });
      return false;
    }
  },

  submitReview: async (hazardId, review) => {
    set({ error: null });
    try {
      const updated = await apiSubmitReview(hazardId, {
        passed: review.passed,
        comment: review.comment,
        reviewedBy: review.reviewedBy,
      });
      set((s) => ({
        hazards: s.hazards.map((h) => (h.id === hazardId ? updated : h)),
      }));
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '提交复查失败' });
      return false;
    }
  },

  getHazardById: (id) => get().hazards.find((h) => h.id === id),

  refreshOverdue: async () => {
    await get().loadHazards();
  },
}));
