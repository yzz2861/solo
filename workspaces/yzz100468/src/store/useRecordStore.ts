import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PracticeRecord, ToothRegion } from '@/types';
import { getTodayString, generateId } from '@/utils/dateUtils';

interface RecordState {
  records: PracticeRecord[];
  addRecord: (record: Omit<PracticeRecord, 'id' | 'date' | 'startTime'>) => void;
  getTodayRecords: () => PracticeRecord[];
  getRecordsByDateRange: (startDate: string, endDate: string) => PracticeRecord[];
  getRecentRecords: (days: number) => PracticeRecord[];
  getAverageScore: (records?: PracticeRecord[]) => number;
  getTotalDuration: (records?: PracticeRecord[]) => number;
  getWeakRegions: (records?: PracticeRecord[]) => ToothRegion[];
  getCommonIssues: (records?: PracticeRecord[]) => string[];
  clearAllRecords: () => void;
}

export const useRecordStore = create<RecordState>()(
  persist(
    (set, get) => ({
      records: [],

      addRecord: (recordData) => {
        const newRecord: PracticeRecord = {
          ...recordData,
          id: generateId(),
          date: getTodayString(),
          startTime: Date.now(),
        };
        set((state) => ({
          records: [newRecord, ...state.records],
        }));
      },

      getTodayRecords: () => {
        const today = getTodayString();
        return get().records.filter((r) => r.date === today);
      },

      getRecordsByDateRange: (startDate, endDate) => {
        return get().records.filter(
          (r) => r.date >= startDate && r.date <= endDate
        );
      },

      getRecentRecords: (days) => {
        const records = get().records;
        const result: PracticeRecord[] = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          records.filter((r) => r.date === dateStr).forEach((r) => result.push(r));
        }

        return result;
      },

      getAverageScore: (records) => {
        const targetRecords = records || get().records;
        if (targetRecords.length === 0) return 0;
        const total = targetRecords.reduce((sum, r) => sum + r.score, 0);
        return Math.round(total / targetRecords.length);
      },

      getTotalDuration: (records) => {
        const targetRecords = records || get().records;
        return targetRecords.reduce((sum, r) => sum + r.totalDuration, 0);
      },

      getWeakRegions: (records) => {
        const targetRecords = records || get().records;
        if (targetRecords.length === 0) return [];

        const regionScores: Record<ToothRegion, number> = {
          outer: 0,
          inner: 0,
          occlusal: 0,
          lingual: 0,
        };
        const regionCounts: Record<ToothRegion, number> = {
          outer: 0,
          inner: 0,
          occlusal: 0,
          lingual: 0,
        };

        targetRecords.forEach((record) => {
          (Object.keys(record.regions) as ToothRegion[]).forEach((region) => {
            regionScores[region] += record.regions[region].cleanliness;
            regionCounts[region] += 1;
          });
        });

        const avgScores = (Object.keys(regionScores) as ToothRegion[])
          .filter((r) => regionCounts[r] > 0)
          .map((r) => ({
            region: r,
            avg: regionScores[r] / regionCounts[r],
          }))
          .sort((a, b) => a.avg - b.avg);

        return avgScores.filter((s) => s.avg < 70).map((s) => s.region);
      },

      getCommonIssues: (records) => {
        const targetRecords = records || get().records;
        if (targetRecords.length === 0) return [];

        const issueCounts: Record<string, number> = {};
        targetRecords.forEach((record) => {
          record.overallIssues.forEach((issue) => {
            issueCounts[issue] = (issueCounts[issue] || 0) + 1;
          });
        });

        return Object.entries(issueCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([issue]) => issue);
      },

      clearAllRecords: () => set({ records: [] }),
    }),
    {
      name: 'tooth_trainer_records',
    }
  )
);
