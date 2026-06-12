import { create } from 'zustand';
import type { Level } from '@/types/level';
import { PRESET_LEVELS } from '@/data/presets';

const STORAGE_KEY = 'ocean_cleanup_levels';

interface LevelStore {
  levels: Level[];
  loadLevels: () => void;
  saveLevel: (level: Level) => void;
  deleteLevel: (id: string) => void;
  getLevel: (id: string) => Level | undefined;
  getAllLevels: () => Level[];
}

function loadFromStorage(): Level[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

function saveToStorage(levels: Level[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
  } catch {}
}

export const useLevelStore = create<LevelStore>((set, get) => ({
  levels: [],

  loadLevels: () => {
    const custom = loadFromStorage();
    const all = [...PRESET_LEVELS, ...custom];
    set({ levels: all });
  },

  saveLevel: (level: Level) => {
    const custom = loadFromStorage();
    const idx = custom.findIndex(l => l.id === level.id);
    const toSave = { ...level, isPreset: false, createdAt: Date.now() };
    if (idx >= 0) {
      custom[idx] = toSave;
    } else {
      custom.push(toSave);
    }
    saveToStorage(custom);
    set({ levels: [...PRESET_LEVELS, ...custom] });
  },

  deleteLevel: (id: string) => {
    const custom = loadFromStorage().filter(l => l.id !== id);
    saveToStorage(custom);
    set({ levels: [...PRESET_LEVELS, ...custom] });
  },

  getLevel: (id: string) => {
    return get().levels.find(l => l.id === id);
  },

  getAllLevels: () => get().levels,
}));
