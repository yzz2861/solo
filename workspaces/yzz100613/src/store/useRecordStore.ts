import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SprintRecord, CorrectionResult, Filters, EventType } from '@/types';
import { calculateCorrection } from '@/utils/correction';
import { generateId } from '@/utils/format';
import { generateWeekRecords, analyzeRecords, filterRecords } from '@/utils/analysis';

interface RecordState {
  records: SprintRecord[];
  currentRecord: Partial<SprintRecord>;
  currentResult: CorrectionResult | null;
  reportMode: 'student' | 'coach';
  filters: Filters;
  initMockData: () => void;
  addRecord: (record: Partial<SprintRecord>) => void;
  addRecords: (records: Partial<SprintRecord>[]) => void;
  updateRecord: (id: string, updates: Partial<SprintRecord>) => void;
  deleteRecord: (id: string) => void;
  toggleExclude: (id: string) => void;
  setCurrentRecord: (record: Partial<SprintRecord>) => void;
  updateCurrentRecord: (updates: Partial<SprintRecord>) => void;
  calculateCurrent: () => void;
  setReportMode: (mode: 'student' | 'coach') => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  getFilteredRecords: () => SprintRecord[];
  getBatchAnalysis: () => ReturnType<typeof analyzeRecords>;
  clearAllRecords: () => void;
}

const defaultRecord: Partial<SprintRecord> = {
  event: '100m',
  rawTime: undefined,
  windSpeed: undefined,
  altitude: 0,
  temperature: 20,
  trackType: 'synthetic',
  timingMethod: 'electronic',
  manualError: 0.2,
};

export const useRecordStore = create<RecordState>()(
  persist(
    (set, get) => ({
      records: [],
      currentRecord: { ...defaultRecord },
      currentResult: null,
      reportMode: 'student',
      filters: {
        excludeMissingWind: false,
        excludeHighError: false,
        excludeOutliers: false,
        excludeExcluded: true,
        eventType: 'all',
      },

      initMockData: () => {
        const mockData = generateWeekRecords();
        set({ records: mockData });
      },

      addRecord: (record) => {
        const newRecord: SprintRecord = {
          id: generateId(),
          date: new Date().toISOString().split('T')[0],
          event: record.event || '100m',
          rawTime: record.rawTime || 0,
          windSpeed: record.windSpeed,
          altitude: record.altitude ?? 0,
          temperature: record.temperature ?? 20,
          trackType: record.trackType || 'synthetic',
          timingMethod: record.timingMethod || 'electronic',
          manualError: record.manualError,
          isExcluded: false,
          note: record.note,
          studentName: record.studentName,
        };
        set((state) => ({
          records: [...state.records, newRecord],
        }));
      },

      addRecords: (newRecords) => {
        const recordsToAdd = newRecords.map((r) => ({
          id: generateId(),
          date: r.date || new Date().toISOString().split('T')[0],
          event: r.event || '100m' as EventType,
          rawTime: r.rawTime || 0,
          windSpeed: r.windSpeed,
          altitude: r.altitude ?? 0,
          temperature: r.temperature ?? 20,
          trackType: r.trackType || 'synthetic',
          timingMethod: r.timingMethod || 'electronic',
          manualError: r.manualError,
          isExcluded: false,
          note: r.note,
          studentName: r.studentName,
        } as SprintRecord));
        set((state) => ({
          records: [...state.records, ...recordsToAdd],
        }));
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        }));
      },

      toggleExclude: (id) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, isExcluded: !r.isExcluded } : r
          ),
        }));
      },

      setCurrentRecord: (record) => {
        set({ currentRecord: { ...defaultRecord, ...record } });
      },

      updateCurrentRecord: (updates) => {
        set((state) => ({
          currentRecord: { ...state.currentRecord, ...updates },
        }));
      },

      calculateCurrent: () => {
        const { currentRecord } = get();
        const result = calculateCorrection(currentRecord);
        set({ currentResult: result });
      },

      setReportMode: (mode) => {
        set({ reportMode: mode });
      },

      setFilter: (key, value) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        }));
      },

      getFilteredRecords: () => {
        const { records, filters } = get();
        return filterRecords(records, filters);
      },

      getBatchAnalysis: () => {
        const { records, filters } = get();
        return analyzeRecords(records, filters);
      },

      clearAllRecords: () => {
        set({ records: [] });
      },
    }),
    {
      name: 'sprint-correction-storage',
      partialize: (state) => ({
        records: state.records,
        filters: state.filters,
        reportMode: state.reportMode,
      }),
    }
  )
);
