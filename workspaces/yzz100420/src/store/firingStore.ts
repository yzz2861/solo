import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FiringRecord, SpecialEvent, StudentWork, WorkBatch } from '../types';
import { generateSampleRecord, generateSampleRecord2 } from '../utils/sampleData';

interface FiringStore {
  records: FiringRecord[];
  currentRecordId: string | null;
  isLoading: boolean;
  viewMode: 'teacher' | 'student';
  init: () => void;
  addRecord: (record: FiringRecord) => void;
  updateRecord: (id: string, updates: Partial<FiringRecord>) => void;
  deleteRecord: (id: string) => void;
  setCurrentRecord: (id: string | null) => void;
  getCurrentRecord: () => FiringRecord | undefined;
  setViewMode: (mode: 'teacher' | 'student') => void;
  addEvent: (recordId: string, event: SpecialEvent) => void;
  updateWork: (recordId: string, batchId: string, workId: string, updates: Partial<StudentWork>) => void;
  addBatch: (recordId: string, batch: WorkBatch) => void;
  addWork: (recordId: string, batchId: string, work: StudentWork) => void;
}

export const useFiringStore = create<FiringStore>()(
  persist(
    (set, get) => ({
      records: [],
      currentRecordId: null,
      isLoading: true,
      viewMode: 'teacher',

      init: () => {
        const { records } = get();
        if (records.length === 0) {
          const sample1 = generateSampleRecord();
          const sample2 = generateSampleRecord2();
          set({
            records: [sample1, sample2],
            currentRecordId: sample1.id,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      },

      addRecord: (record) =>
        set((state) => ({
          records: [record, ...state.records],
          currentRecordId: record.id,
        })),

      updateRecord: (id, updates) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r,
          ),
        })),

      deleteRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
          currentRecordId: state.currentRecordId === id ? null : state.currentRecordId,
        })),

      setCurrentRecord: (id) => set({ currentRecordId: id }),

      getCurrentRecord: () => {
        const { records, currentRecordId } = get();
        return records.find((r) => r.id === currentRecordId);
      },

      setViewMode: (mode) => set({ viewMode: mode }),

      addEvent: (recordId, event) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === recordId
              ? { ...r, events: [...r.events, event], updatedAt: Date.now() }
              : r,
          ),
        })),

      updateWork: (recordId, batchId, workId, updates) =>
        set((state) => ({
          records: state.records.map((r) => {
            if (r.id !== recordId) return r;
            return {
              ...r,
              batches: r.batches.map((b) =>
                b.id !== batchId
                  ? b
                  : {
                      ...b,
                      works: b.works.map((w) =>
                        w.id === workId ? { ...w, ...updates } : w,
                      ),
                    },
              ),
              updatedAt: Date.now(),
            };
          }),
        })),

      addBatch: (recordId, batch) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === recordId
              ? { ...r, batches: [...r.batches, batch], updatedAt: Date.now() }
              : r,
          ),
        })),

      addWork: (recordId, batchId, work) =>
        set((state) => ({
          records: state.records.map((r) => {
            if (r.id !== recordId) return r;
            return {
              ...r,
              batches: r.batches.map((b) =>
                b.id !== batchId ? b : { ...b, works: [...b.works, work] },
              ),
              updatedAt: Date.now(),
            };
          }),
        })),
    }),
    {
      name: 'kiln-firing-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        records: state.records,
        currentRecordId: state.currentRecordId,
        viewMode: state.viewMode,
      }),
    },
  ),
);
