import { create } from 'zustand';
import type { StatisticsData } from '@/types';
import { StatisticsService } from '@/services/statisticsService';

interface StatsState {
  data: StatisticsData | null;
  isLoading: boolean;
  selectedYear: number;
  selectedMonth: number;
  loadData: () => Promise<void>;
  exportReport: () => Promise<void>;
  setYearMonth: (y: number, m: number) => void;
}

export const useStatsStore = create<StatsState>((set, get) => {
  const now = new Date();
  return {
    data: null,
    isLoading: false,
    selectedYear: now.getFullYear(),
    selectedMonth: now.getMonth() + 1,
    loadData: async () => {
      const { selectedYear, selectedMonth } = get();
      set({ isLoading: true });
      try {
        const data = await StatisticsService.getMonthlyData(selectedYear, selectedMonth);
        set({ data });
      } finally {
        set({ isLoading: false });
      }
    },
    exportReport: async () => {
      const { selectedYear, selectedMonth } = get();
      const blob = await StatisticsService.exportReport(selectedYear, selectedMonth);
      const mm = String(selectedMonth).padStart(2, '0');
      const filename = `农技问答月报-${selectedYear}-${mm}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    setYearMonth: (y, m) => set({ selectedYear: y, selectedMonth: m }),
  };
});
