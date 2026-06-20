import { create } from 'zustand';
import type { CalculationInput, CalculationResult, HistoryRecord, UserMode, EcUnit, VolumeUnit } from '@/types';
import { calculateEcDilution } from '@/utils/calculations';
import { getHistoryRecords, saveHistoryRecord, deleteHistoryRecord, clearHistoryRecords, generateId, formatDate } from '@/utils/storage';

interface CalculatorState {
  mode: UserMode;
  input: CalculationInput;
  result: CalculationResult | null;
  history: HistoryRecord[];
  setMode: (mode: UserMode) => void;
  updateInput: (key: keyof CalculationInput, value: string | number) => void;
  calculate: () => void;
  saveToHistory: () => void;
  loadHistory: () => void;
  deleteRecord: (id: string) => void;
  clearHistory: () => void;
}

const defaultInput: CalculationInput = {
  currentEc: 1.2,
  currentEcUnit: 'mS/cm',
  targetEc: 2.0,
  targetEcUnit: 'mS/cm',
  tankVolume: 100,
  tankVolumeUnit: 'L',
  stockEc: 10,
  stockEcUnit: 'mS/cm',
  waterVolume: 0,
  waterVolumeUnit: 'L',
  cropStage: '生长期',
};

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  mode: 'farmer',
  input: defaultInput,
  result: null,
  history: [],

  setMode: (mode: UserMode) => set({ mode }),

  updateInput: (key: keyof CalculationInput, value: string | number) => {
    set((state) => ({
      input: {
        ...state.input,
        [key]: value,
      },
      result: null,
    }));
  },

  calculate: () => {
    const { input } = get();
    const result = calculateEcDilution(input);
    set({ result });
  },

  saveToHistory: () => {
    const { input, result } = get();
    if (!result) return;

    const now = new Date();
    const record: HistoryRecord = {
      id: generateId(),
      date: formatDate(now),
      timestamp: now.getTime(),
      input: { ...input },
      result: { ...result },
    };

    saveHistoryRecord(record);
    set((state) => ({
      history: [record, ...state.history].slice(0, 100),
    }));
  },

  loadHistory: () => {
    const records = getHistoryRecords();
    set({ history: records });
  },

  deleteRecord: (id: string) => {
    deleteHistoryRecord(id);
    set((state) => ({
      history: state.history.filter((r) => r.id !== id),
    }));
  },

  clearHistory: () => {
    clearHistoryRecords();
    set({ history: [] });
  },
}));

export type { EcUnit, VolumeUnit };
