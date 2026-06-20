import { create } from 'zustand';
import type {
  InputParams,
  FillHistoryRecord,
  ViewMode,
  VolumeUnit,
} from '@/types/water-tower';
import { genId } from '@/utils/water-calc';

const HISTORY_KEY = 'water-tower-history-v1';
const PARAMS_KEY = 'water-tower-params-v1';
const VIEW_KEY = 'water-tower-view-v1';

interface WaterStore {
  params: InputParams;
  viewMode: ViewMode;
  history: FillHistoryRecord[];
  pendingRecordId: string | null;
  showRecordModal: boolean;
  recordModalMode: 'start' | 'stop' | null;

  setParams: (partial: Partial<InputParams>) => void;
  resetParams: () => void;
  setViewMode: (mode: ViewMode) => void;

  loadAll: () => void;
  saveHistory: () => void;
  saveParams: () => void;

  startNewRecord: (params: InputParams, estimated: FillHistoryRecord['estimatedResult']) => void;
  openRecordModal: (mode: 'start' | 'stop', recordId?: string) => void;
  closeRecordModal: () => void;

  updateRecordStartTime: (recordId: string, time: number, engineerName: string) => void;
  updateRecordStopTime: (
    recordId: string,
    time: number,
    stopLevel: number,
    stopLevelType: 'percent' | 'volume',
    stopLevelUnit: VolumeUnit,
    notes: string,
    actualFillMinutes: number,
    actualFlowLpm: number,
    estimateAccuracyPct: number,
  ) => void;
  deleteRecord: (id: string) => void;
  clearHistory: () => void;
}

const defaultParams: InputParams = {
  tankCapacity: 200,
  tankCapacityUnit: 'ton',
  currentWaterLevel: 35,
  currentLevelType: 'percent',
  currentLevelUnit: 'ton',
  targetWaterLevel: 90,
  targetLevelType: 'percent',
  targetLevelUnit: 'ton',
  pumpFlowRate: 25,
  pumpFlowUnit: 'tph',
  pipeLoss: 15,
  pipeLossType: 'percent',
  concurrentUsage: 5,
  concurrentUsageUnit: 'tph',
  morningPeakTime: '07:00',
};

const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const useWaterStore = create<WaterStore>((set, get) => ({
  params: defaultParams,
  viewMode: 'engineer',
  history: [],
  pendingRecordId: null,
  showRecordModal: false,
  recordModalMode: null,

  setParams: (partial) => {
    set((s) => ({ params: { ...s.params, ...partial } }));
    get().saveParams();
  },
  resetParams: () => {
    set({ params: defaultParams });
    get().saveParams();
  },
  setViewMode: (mode) => {
    set({ viewMode: mode });
    localStorage.setItem(VIEW_KEY, mode);
  },

  loadAll: () => {
    const savedParams = loadFromStorage<InputParams | null>(PARAMS_KEY, null);
    const savedHistory = loadFromStorage<FillHistoryRecord[]>(HISTORY_KEY, []);
    const savedView = loadFromStorage<ViewMode>(VIEW_KEY, 'engineer');
    set({
      params: savedParams || defaultParams,
      history: savedHistory,
      viewMode: savedView,
    });
  },
  saveHistory: () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(get().history));
  },
  saveParams: () => {
    localStorage.setItem(PARAMS_KEY, JSON.stringify(get().params));
  },

  startNewRecord: (params, estimated) => {
    const newRecord: FillHistoryRecord = {
      id: genId(),
      createdAt: Date.now(),
      paramsSnapshot: JSON.parse(JSON.stringify(params)),
      estimatedResult: estimated,
      actualStartTime: null,
      actualStopTime: null,
      actualFillMinutes: null,
      actualStopLevel: null,
      actualStopLevelType: null,
      actualStopLevelUnit: null,
      actualFlowLpm: null,
      estimateAccuracyPct: null,
      notes: '',
      engineerName: '',
      status: 'running',
    };
    set((s) => ({
      history: [newRecord, ...s.history].slice(0, 50),
      pendingRecordId: newRecord.id,
      showRecordModal: true,
      recordModalMode: 'start',
    }));
    get().saveHistory();
  },
  openRecordModal: (mode, recordId) => {
    set((s) => ({
      showRecordModal: true,
      recordModalMode: mode,
      pendingRecordId: recordId ?? s.pendingRecordId,
    }));
  },
  closeRecordModal: () => {
    set({ showRecordModal: false, recordModalMode: null });
  },

  updateRecordStartTime: (recordId, time, engineerName) => {
    set((s) => ({
      history: s.history.map((r) =>
        r.id === recordId
          ? {
              ...r,
              actualStartTime: time,
              engineerName,
              status: 'running',
            }
          : r,
      ),
      showRecordModal: false,
      recordModalMode: null,
    }));
    get().saveHistory();
  },
  updateRecordStopTime: (
    recordId,
    time,
    stopLevel,
    stopLevelType,
    stopLevelUnit,
    notes,
    actualFillMinutes,
    actualFlowLpm,
    estimateAccuracyPct,
  ) => {
    set((s) => ({
      history: s.history.map((r) =>
        r.id === recordId
          ? {
              ...r,
              actualStopTime: time,
              actualFillMinutes,
              actualStopLevel: stopLevel,
              actualStopLevelType: stopLevelType,
              actualStopLevelUnit: stopLevelUnit,
              actualFlowLpm,
              estimateAccuracyPct,
              notes,
              status: 'completed',
            }
          : r,
      ),
      showRecordModal: false,
      recordModalMode: null,
      pendingRecordId: null,
    }));
    get().saveHistory();
  },
  deleteRecord: (id) => {
    set((s) => ({ history: s.history.filter((r) => r.id !== id) }));
    get().saveHistory();
  },
  clearHistory: () => {
    set({ history: [] });
    localStorage.removeItem(HISTORY_KEY);
  },
}));
