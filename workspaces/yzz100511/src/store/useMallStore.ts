import { create } from 'zustand';
import type { MallConfig } from '../types';
import { defaultMallConfig } from '../utils/mockData';

interface MallState {
  config: MallConfig;
  updateConfig: (config: Partial<MallConfig>) => void;
  resetConfig: () => void;
}

const STORAGE_KEY = 'mall_atrium_mall_config';

const loadFromStorage = (): MallConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load mall config from storage:', e);
  }
  return null;
};

const saveToStorage = (config: MallConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save mall config to storage:', e);
  }
};

export const useMallStore = create<MallState>((set) => {
  const initialConfig = loadFromStorage() || defaultMallConfig;
  
  return {
    config: initialConfig,
    updateConfig: (updates) =>
      set((state) => {
        const newConfig = { ...state.config, ...updates };
        saveToStorage(newConfig);
        return { config: newConfig };
      }),
    resetConfig: () => {
      saveToStorage(defaultMallConfig);
      set({ config: defaultMallConfig });
    },
  };
});
