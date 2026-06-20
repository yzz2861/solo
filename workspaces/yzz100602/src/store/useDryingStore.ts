import { create } from 'zustand';
import type { DryingParams, DryingResult, DryingRecord, ReportMode, ValidationWarning } from '@/types';
import { calculateDrying } from '@/utils/calculator';
import { validateParams, hasErrors } from '@/utils/validation';
import { getAllRecords, saveRecord, deleteRecord, generateRecordId, formatDate } from '@/utils/storage';

interface DryingState {
  params: DryingParams;
  result: DryingResult | null;
  warnings: ValidationWarning[];
  reportMode: ReportMode;
  records: DryingRecord[];
  setParam: <K extends keyof DryingParams>(key: K, value: DryingParams[K]) => void;
  setParams: (params: Partial<DryingParams>) => void;
  setReportMode: (mode: ReportMode) => void;
  calculate: () => void;
  saveRecord: (actualMoisture: number, actualTime: number, notes: string) => boolean;
  deleteRecord: (id: string) => void;
  loadRecords: () => void;
  useRecordParams: (record: DryingRecord) => void;
  resetParams: () => void;
}

const defaultParams: DryingParams = {
  materialName: '',
  weight: 0,
  initialMoisture: 0,
  targetMoisture: 0,
  temperature: 60,
  airFlow: 500,
  ambientHumidity: 60,
};

export const useDryingStore = create<DryingState>((set, get) => ({
  params: defaultParams,
  result: null,
  warnings: [],
  reportMode: 'worker',
  records: [],

  setParam: (key, value) => {
    set((state) => {
      const newParams = { ...state.params, [key]: value };
      const warnings = validateParams(newParams);
      const canCalculate = !hasErrors(warnings) &&
        newParams.weight > 0 &&
        newParams.initialMoisture > 0 &&
        newParams.targetMoisture > 0 &&
        newParams.initialMoisture > newParams.targetMoisture &&
        newParams.temperature > 0;

      let result = state.result;
      if (canCalculate) {
        result = calculateDrying(newParams);
      }

      return { params: newParams, warnings, result };
    });
  },

  setParams: (params) => {
    set((state) => {
      const newParams = { ...state.params, ...params };
      const warnings = validateParams(newParams);
      return { params: newParams, warnings };
    });
  },

  setReportMode: (mode) => {
    set({ reportMode: mode });
  },

  calculate: () => {
    const { params, warnings } = get();
    if (hasErrors(warnings)) return;
    const result = calculateDrying(params);
    set({ result });
  },

  saveRecord: (actualMoisture, actualTime, notes) => {
    const { params, result } = get();
    if (!result) return false;

    const record: DryingRecord = {
      id: generateRecordId(),
      date: formatDate(),
      params: { ...params },
      result: { ...result },
      actualMoisture,
      actualTime,
      notes,
    };

    saveRecord(record);
    set((state) => ({ records: [record, ...state.records] }));
    return true;
  },

  deleteRecord: (id) => {
    deleteRecord(id);
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
  },

  loadRecords: () => {
    const records = getAllRecords();
    set({ records });
  },

  useRecordParams: (record) => {
    set({
      params: { ...record.params },
      result: { ...record.result },
      warnings: validateParams(record.params),
    });
  },

  resetParams: () => {
    set({
      params: defaultParams,
      result: null,
      warnings: [],
    });
  },
}));
