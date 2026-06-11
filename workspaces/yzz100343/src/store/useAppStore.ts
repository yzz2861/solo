import { create } from 'zustand';
import type {
  Hazard,
  HazardFilters,
  HazardStatus,
  Rectification,
  Review,
  Team,
  UserRole,
} from '@/types';
import { storage, generateId } from '@/utils/storage';
import { isOverdueDeadline, todayISO } from '@/utils/dateUtils';
import { seedHazards } from '@/data/seedData';

interface AppState {
  hazards: Hazard[];
  currentRole: UserRole;
  filters: HazardFilters;

  setRole: (role: UserRole) => void;
  setFilters: (filters: Partial<HazardFilters>) => void;

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
  ) => Hazard;

  submitRectification: (
    hazardId: string,
    rect: Omit<Rectification, 'id' | 'hazardId' | 'submittedAt'>
  ) => boolean;

  submitReview: (
    hazardId: string,
    review: Omit<Review, 'id' | 'hazardId' | 'reviewedAt'>
  ) => boolean;

  getHazardById: (id: string) => Hazard | undefined;
  refreshOverdue: () => void;
}

const STORAGE_KEY = 'app_state_v1';

const loadInitial = (): Hazard[] => {
  const saved = storage.get<{ hazards: Hazard[] } | null>(STORAGE_KEY, null);
  if (saved?.hazards?.length) return saved.hazards;
  return seedHazards.map((h) => ({
    ...h,
    isOverdue:
      h.status !== 'CLOSED' ? isOverdueDeadline(h.deadline) : false,
  }));
};

const persist = (hazards: Hazard[], currentRole: UserRole) => {
  storage.set(STORAGE_KEY, { hazards, currentRole, savedAt: todayISO() });
};

export const useAppStore = create<AppState>((set, get) => {
  const initialHazards = loadInitial();

  return {
    hazards: initialHazards,
    currentRole: 'SAFETY_OFFICER',
    filters: { status: 'ALL', team: 'ALL' },

    setRole: (role) => {
      set({ currentRole: role });
      persist(get().hazards, role);
    },

    setFilters: (newFilters) =>
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      })),

    addHazard: (data) => {
      const newHazard: Hazard = {
        ...data,
        id: generateId(),
        status: 'PENDING_RECTIFICATION',
        rejectCount: 0,
        isOverdue: isOverdueDeadline(data.deadline),
        createdAt: todayISO(),
        rectifications: [],
        reviews: [],
      };
      set((s) => ({ hazards: [newHazard, ...s.hazards] }));
      persist(get().hazards, get().currentRole);
      return newHazard;
    },

    submitRectification: (hazardId, rect) => {
      const state = get();
      const target = state.hazards.find((h) => h.id === hazardId);
      if (!target || target.status === 'CLOSED') return false;

      const newRect: Rectification = {
        ...rect,
        id: generateId(),
        hazardId,
        submittedAt: todayISO(),
      };

      set((s) => ({
        hazards: s.hazards.map((h) =>
          h.id === hazardId
            ? {
                ...h,
                status: 'PENDING_REVIEW' as HazardStatus,
                rectifications: [...h.rectifications, newRect],
              }
            : h
        ),
      }));
      persist(get().hazards, get().currentRole);
      return true;
    },

    submitReview: (hazardId, review) => {
      const state = get();
      const target = state.hazards.find((h) => h.id === hazardId);
      if (!target || target.status === 'CLOSED') return false;

      const newReview: Review = {
        ...review,
        id: generateId(),
        hazardId,
        reviewedAt: todayISO(),
      };

      set((s) => ({
        hazards: s.hazards.map((h) =>
          h.id === hazardId
            ? {
                ...h,
                status: (review.passed
                  ? 'CLOSED'
                  : 'REJECTED') as HazardStatus,
                rejectCount: review.passed
                  ? h.rejectCount
                  : h.rejectCount + 1,
                reviews: [...h.reviews, newReview],
              }
            : h
        ),
      }));
      persist(get().hazards, get().currentRole);
      return true;
    },

    getHazardById: (id) => get().hazards.find((h) => h.id === id),

    refreshOverdue: () => {
      const state = get();
      let changed = false;
      const updated = state.hazards.map((h) => {
        if (h.status === 'CLOSED') return h;
        const shouldOverdue = isOverdueDeadline(h.deadline);
        if (shouldOverdue !== h.isOverdue) {
          changed = true;
          return { ...h, isOverdue: shouldOverdue };
        }
        return h;
      });
      if (changed) {
        set({ hazards: updated });
        persist(updated, state.currentRole);
      }
    },
  };
});
