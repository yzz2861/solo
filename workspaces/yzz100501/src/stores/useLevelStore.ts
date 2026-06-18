import { create } from 'zustand';
import type { Level } from '@/types';
import { defaultLevels } from '@/data/levels';

const STORAGE_KEY = 'lab-safety-levels';

interface LevelState {
  levels: Level[];
  loadLevels: () => void;
  addLevel: (level: Level) => void;
  updateLevel: (id: string, level: Partial<Level>) => void;
  deleteLevel: (id: string) => void;
  getLevelById: (id: string) => Level | undefined;
}

function saveToStorage(levels: Level[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
  } catch {
    // localStorage may be unavailable or full
  }
}

function loadFromStorage(): Level[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Level[];
  } catch {
    // localStorage may be unavailable or data corrupted
  }
  return null;
}

const useLevelStore = create<LevelState>((set, get) => ({
  levels: [],

  loadLevels: () => {
    const stored = loadFromStorage();
    if (stored) {
      const storedIds = new Set(stored.map((l) => l.id));
      const merged = [
        ...defaultLevels.filter((l) => !storedIds.has(l.id)),
        ...stored,
      ];
      set({ levels: merged });
      saveToStorage(merged);
    } else {
      set({ levels: [...defaultLevels] });
      saveToStorage(defaultLevels);
    }
  },

  addLevel: (level) =>
    set((state) => {
      const levels = [...state.levels, level];
      saveToStorage(levels);
      return { levels };
    }),

  updateLevel: (id, partial) =>
    set((state) => {
      const levels = state.levels.map((l) =>
        l.id === id ? { ...l, ...partial } : l,
      );
      saveToStorage(levels);
      return { levels };
    }),

  deleteLevel: (id) =>
    set((state) => {
      const levels = state.levels.filter((l) => l.id !== id);
      saveToStorage(levels);
      return { levels };
    }),

  getLevelById: (id) => {
    return get().levels.find((l) => l.id === id);
  },
}));

export default useLevelStore;
