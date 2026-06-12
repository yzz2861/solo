import { create } from 'zustand';
import type {
  SensorInput,
  ETResult,
  ValidationWarning,
  DailyRecord,
  WeeklySummary,
} from '../../shared/types';
import { validateInputs, getConservativeFactor } from '../utils/validator';
import { computeET } from '../utils/etEngine';
import {
  loadRecords,
  saveDailyRecord,
  updateActualIrrigation,
  getWeeklySummary,
} from '../utils/storage';

interface IrrigationState {
  todayDate: string;
  input: SensorInput;
  warnings: ValidationWarning[];
  result: ETResult | null;
  isCalculating: boolean;
  records: DailyRecord[];
  weeklySummary: WeeklySummary | null;

  setInput: <K extends keyof SensorInput>(key: K, value: SensorInput[K]) => void;
  runCalculate: () => ETResult | null;
  persistTodayRecord: () => DailyRecord | null;
  backfillActual: (date: string, actual: number | null, note?: string) => void;
  refreshRecords: () => void;
  loadWeeklySummary: (date?: string) => void;
  reset: () => void;
}

const defaultInput = (): SensorInput => ({
  temperature: null,
  temperatureRaw: null,
  humidity: null,
  humidityPrevious: null,
  radiation: null,
  radiationRaw: null,
  wind: null,
  windRaw: null,
  cropStage: null,
  soilMoisture: null,
  soilMoistureRaw: null,
  irrigationEfficiency: 0.8,
  irrigationMethod: 'drip',
});

const todayStr = () => new Date().toISOString().slice(0, 10);

export const useIrrigationStore = create<IrrigationState>((set, get) => ({
  todayDate: todayStr(),
  input: defaultInput(),
  warnings: [],
  result: null,
  isCalculating: false,
  records: loadRecords(),
  weeklySummary: null,

  setInput: <K extends keyof SensorInput>(key: K, value: SensorInput[K]) => {
    const nextInput = { ...get().input, [key]: value };
    const warnings = validateInputs(nextInput);
    set({ input: nextInput, warnings });
  },

  runCalculate: () => {
    const { input, warnings, todayDate } = get();
    set({ isCalculating: true });
    const totalFactor = getConservativeFactor(warnings);
    const result = computeET(input, warnings, totalFactor);

    const records = saveDailyRecord({
      date: todayDate,
      input,
      result,
      actualIrrigation:
        get().records.find((r) => r.date === todayDate)?.actualIrrigation ?? null,
      note: get().records.find((r) => r.date === todayDate)?.note ?? '',
      createdAt: Date.now(),
    });

    set({ result, isCalculating: false, records });
    return result;
  },

  persistTodayRecord: () => {
    const { input, result, todayDate, records } = get();
    if (!result) return null;
    const existing = records.find((r) => r.date === todayDate);
    const record: DailyRecord = {
      date: todayDate,
      input,
      result,
      actualIrrigation: existing?.actualIrrigation ?? null,
      note: existing?.note ?? '',
      createdAt: Date.now(),
    };
    const updated = saveDailyRecord(record);
    set({ records: updated });
    return record;
  },

  backfillActual: (date, actual, note) => {
    const updated = updateActualIrrigation(date, actual, note);
    set({ records: updated });
  },

  refreshRecords: () => set({ records: loadRecords() }),

  loadWeeklySummary: (date) => {
    const d = date ?? get().todayDate;
    set({ weeklySummary: getWeeklySummary(d) });
  },

  reset: () => {
    set({ input: defaultInput(), warnings: [], result: null });
  },
}));
