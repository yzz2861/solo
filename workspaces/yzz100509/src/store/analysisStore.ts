import { create } from 'zustand';
import type {
  AnalysisResult,
  OverdueItem,
  TransferSuggestion,
  CleaningTask,
  MonthlyReport,
  UmbrellaPoint,
  BorrowRecord,
  WeatherRecord,
  FeeBreakdown,
} from '@/types';

interface AnalysisState {
  result: AnalysisResult | null;
  cleaningTasks: CleaningTask[];
  monthlyReport: MonthlyReport | null;
  freePenaltyMinutes: number;
  computing: boolean;
}

interface AnalysisActions {
  runFullAnalysis: (
    points: UmbrellaPoint[],
    records: BorrowRecord[],
    weather: WeatherRecord[]
  ) => void;
  setFreePenaltyMinutes: (n: number) => void;
  updateOverdueFee: (
    recordId: string,
    newFeeBreakdown: FeeBreakdown,
    waiveFlag: boolean
  ) => void;
  markTransferConfirmed: (suggestionId: string) => void;
  markCleaningTaskDone: (taskId: string, actualRefill: number) => void;
  generateMonthlyReport: (period: string) => void;
}

type AnalysisStore = AnalysisState & AnalysisActions;

const createEmptyResult = (): AnalysisResult => ({
  generatedAt: new Date().toISOString(),
  summary: {
    totalPoints: 0,
    totalUmbrellas: 0,
    currentlyBorrowed: 0,
    activeOverdue: 0,
    anomalyCount: 0,
  },
  overdueItems: [] as OverdueItem[],
  transferSuggestions: [] as TransferSuggestion[],
  rainStopDelays: [],
  timeRainMatrix: [],
  recommendedActions: [],
});

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  result: null,
  cleaningTasks: [],
  monthlyReport: null,
  freePenaltyMinutes: 30,
  computing: false,

  runFullAnalysis: (points, records, weather) => {
    set({ computing: true });
    // 占位：后续分析引擎填入真正实现
    const result = createEmptyResult();
    result.summary.totalPoints = points.length;
    result.summary.totalUmbrellas = points.reduce((s, p) => s + p.totalUmbrellas, 0);
    result.summary.currentlyBorrowed = records.filter(
      (r) => r.status === 'borrowing' || r.status === 'overdue'
    ).length;
    result.summary.activeOverdue = records.filter((r) => r.status === 'overdue').length;
    set({ result, computing: false });
  },

  setFreePenaltyMinutes: (n) => set({ freePenaltyMinutes: n }),

  updateOverdueFee: (recordId, newFeeBreakdown, waiveFlag) =>
    set((state) => {
      if (!state.result) return state;
      return {
        result: {
          ...state.result,
          overdueItems: state.result.overdueItems.map((item) =>
            item.recordId === recordId
              ? { ...item, feeBreakdown: newFeeBreakdown, waived: waiveFlag }
              : item
          ),
        },
      };
    }),

  markTransferConfirmed: (suggestionId) =>
    set((state) => {
      if (!state.result) return state;
      return {
        result: {
          ...state.result,
          transferSuggestions: state.result.transferSuggestions.map((s) =>
            s.id === suggestionId
              ? { ...s, confirmed: true, confirmedAt: new Date().toISOString() }
              : s
          ),
        },
      };
    }),

  markCleaningTaskDone: (taskId, actualRefill) =>
    set((state) => ({
      cleaningTasks: state.cleaningTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              done: true,
              doneAt: new Date().toISOString(),
              actualRefill,
            }
          : task
      ),
    })),

  generateMonthlyReport: (period) => {
    // 占位：后续实现真正的月度报告生成
    const report: MonthlyReport = {
      period,
      totalBorrows: 0,
      totalReturns: 0,
      totalOverdue: 0,
      totalPenalty: 0,
      newBorrowers: 0,
      topPoints: [],
      weatherCorrelation: { rainyDayBorrows: 0, sunnyDayBorrows: 0 },
      anomaliesCount: 0,
      cleaningTasksCompleted: 0,
      generatedAt: new Date().toISOString(),
    };
    set({ monthlyReport: report });
  },
}));
