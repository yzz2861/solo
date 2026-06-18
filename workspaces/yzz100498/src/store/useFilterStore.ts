import { create } from 'zustand';
import { FilterState, MealType } from '../types';
import { format, subDays } from 'date-fns';

interface FilterStore extends FilterState {
  setDateRange: (start: string, end: string) => void;
  setSelectedWards: (wards: string[]) => void;
  setSelectedMealTypes: (types: MealType[]) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const today = format(new Date('2026-06-18'), 'yyyy-MM-dd');
const twoWeeksAgo = format(subDays(new Date('2026-06-18'), 13), 'yyyy-MM-dd');

const defaultState: FilterState = {
  dateRange: {
    start: twoWeeksAgo,
    end: today,
  },
  selectedWards: [],
  selectedMealTypes: [],
  searchQuery: '',
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...defaultState,
  setDateRange: (start, end) => set({ dateRange: { start, end } }),
  setSelectedWards: (wards) => set({ selectedWards: wards }),
  setSelectedMealTypes: (types) => set({ selectedMealTypes: types }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () => set(defaultState),
}));
