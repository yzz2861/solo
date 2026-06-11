import { create } from 'zustand';
import type { CalculationRecord } from '@/types';

const STORAGE_KEY = 'infusion-pump-records';

function loadRecords(): CalculationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: CalculationRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

interface RecordStore {
  records: CalculationRecord[];
  addRecord: (record: CalculationRecord) => void;
  deleteRecord: (id: string) => void;
  clearRecords: () => void;
}

export const useRecordStore = create<RecordStore>((set) => ({
  records: loadRecords(),
  addRecord: (record) =>
    set((state) => {
      const next = [record, ...state.records];
      saveRecords(next);
      return { records: next };
    }),
  deleteRecord: (id) =>
    set((state) => {
      const next = state.records.filter((r) => r.id !== id);
      saveRecords(next);
      return { records: next };
    }),
  clearRecords: () => {
    saveRecords([]);
    set({ records: [] });
  },
}));
