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
  AnomalyType,
} from '@/types';
import {
  computeShortageIndex,
  computeTransferSuggestions,
  computeOverdueList,
  computeRainStopDelay,
  computeTimeRainMatrix,
  detectAnomalies,
  computeCleaningTasks,
  computeMonthlyReport,
} from '@/engine';

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
  generateMonthlyReport: (
    points: UmbrellaPoint[],
    records: BorrowRecord[],
    weather: WeatherRecord[],
    period: string
  ) => void;
}

type AnalysisStore = AnalysisState & AnalysisActions;

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  result: null,
  cleaningTasks: [],
  monthlyReport: null,
  freePenaltyMinutes: 30,
  computing: false,

  runFullAnalysis: (points, records, weather) => {
    set({ computing: true });

    const freeMin = get().freePenaltyMinutes;
    const shortageIndex = computeShortageIndex(points, records, weather);
    const transferSuggestions = computeTransferSuggestions(points, shortageIndex);
    const overdueList = computeOverdueList(records, points, freeMin);
    const rainStopDelay = computeRainStopDelay(records, weather);
    const timeRainMatrix = computeTimeRainMatrix(records, weather, points);
    const anomalies = detectAnomalies(records, weather, points);
    const cleaningTasks = computeCleaningTasks(points, shortageIndex);

    const result: AnalysisResult = {
      shortageIndex,
      transferSuggestions,
      overdueList,
      rainStopDelay,
      timeRainMatrix,
      anomalies,
    };

    set({ result, cleaningTasks, computing: false });
  },

  setFreePenaltyMinutes: (n) => {
    set({ freePenaltyMinutes: n });
  },

  updateOverdueFee: (recordId, newFeeBreakdown, waiveFlag) =>
    set((state) => {
      if (!state.result) return state;
      return {
        result: {
          ...state.result,
          overdueList: state.result.overdueList.map((item) =>
            item.recordId === recordId
              ? {
                  ...item,
                  feeBreakdown: newFeeBreakdown,
                  totalFee: waiveFlag ? 0 : newFeeBreakdown.baseFee + newFeeBreakdown.tieredFee.reduce((s, t) => s + t.amount, 0) + newFeeBreakdown.crossPointFee - newFeeBreakdown.discount,
                }
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
          transferSuggestions: state.result.transferSuggestions.filter(
            (s) => s.id !== suggestionId
          ),
        },
      };
    }),

  markCleaningTaskDone: (taskId, actualRefill) =>
    set((state) => ({
      cleaningTasks: state.cleaningTasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: true }
          : task
      ),
    })),

  generateMonthlyReport: (points, records, weather, period) => {
    const report = computeMonthlyReport(points, records, weather, period);
    set({ monthlyReport: report });
  },
}));
