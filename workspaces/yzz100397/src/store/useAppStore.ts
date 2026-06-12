import { create } from 'zustand';
import type { Dish, DailyRecord, DishRecord } from '@/types';
import { MOCK_DISHES, MOCK_RECORDS } from '@/data/mockData';

interface AppState {
  dishes: Dish[];
  dailyRecords: DailyRecord[];
  addOrUpdateDailyRecord: (record: DailyRecord) => void;
  addDish: (dish: Dish) => void;
  updateDishRecord: (date: string, dishRecord: DishRecord) => void;
  getRecordByDate: (date: string) => DailyRecord | undefined;
}

const STORAGE_KEY = 'breakfast-waste-data';

function loadFromStorage(): { dishes: Dish[]; dailyRecords: DailyRecord[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
}

function saveToStorage(state: { dishes: Dish[]; dailyRecords: DailyRecord[] }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const stored = loadFromStorage();

export const useAppStore = create<AppState>((set, get) => ({
  dishes: stored?.dishes ?? MOCK_DISHES,
  dailyRecords: stored?.dailyRecords ?? MOCK_RECORDS,

  addOrUpdateDailyRecord: (record) => {
    set((state) => {
      const idx = state.dailyRecords.findIndex(r => r.date === record.date);
      const newRecords = idx >= 0
        ? state.dailyRecords.map((r, i) => i === idx ? record : r)
        : [...state.dailyRecords, record].sort((a, b) => a.date.localeCompare(b.date));
      const newState = { ...state, dailyRecords: newRecords };
      saveToStorage(newState);
      return newState;
    });
  },

  addDish: (dish) => {
    set((state) => {
      const newState = { ...state, dishes: [...state.dishes, dish] };
      saveToStorage(newState);
      return newState;
    });
  },

  updateDishRecord: (date, dishRecord) => {
    set((state) => {
      const daily = state.dailyRecords.find(r => r.date === date);
      if (!daily) return state;

      const updatedRecords = daily.dishRecords.some(dr => dr.dishId === dishRecord.dishId)
        ? daily.dishRecords.map(dr => dr.dishId === dishRecord.dishId ? dishRecord : dr)
        : [...daily.dishRecords, dishRecord];

      const updatedDaily = { ...daily, dishRecords: updatedRecords };
      const newRecords = state.dailyRecords.map(r => r.date === date ? updatedDaily : r);
      const newState = { ...state, dailyRecords: newRecords };
      saveToStorage(newState);
      return newState;
    });
  },

  getRecordByDate: (date) => {
    return get().dailyRecords.find(r => r.date === date);
  },
}));
