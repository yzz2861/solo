import { create } from 'zustand';
import type {
  DrainageInput,
  DrainageResult,
  CalculationRecord,
  LengthUnit,
  RainfallUnit,
  DrainPosition,
} from '@/types';
import { calculateDrainage } from '@/utils/calculation';
import { validateInput } from '@/utils/validation';
import {
  generateContractorReport,
  generateOwnerReport,
  generateDisclosureForm,
} from '@/utils/reportGenerator';
import {
  loadRecords,
  addRecord,
  updateRecord,
  deleteRecord,
  getRecordById,
  generateRecordId,
} from '@/utils/storage';
import { exportDisclosureForm } from '@/utils/export';

interface CalculationState {
  input: DrainageInput;
  result: DrainageResult | null;
  records: CalculationRecord[];
  currentRecordId: string | null;
  projectName: string;
  setLength: (value: number) => void;
  setLengthUnit: (unit: LengthUnit) => void;
  setWidth: (value: number) => void;
  setWidthUnit: (unit: LengthUnit) => void;
  setSlope: (value: number) => void;
  setRainfallIntensity: (value: number) => void;
  setRainfallUnit: (unit: RainfallUnit) => void;
  setDrainCount: (value: number) => void;
  setDrainDiameter: (value: number) => void;
  setDrainBlocked: (blocked: boolean) => void;
  setDrainPositions: (positions: DrainPosition[]) => void;
  setProjectName: (name: string) => void;
  calculate: () => void;
  saveRecord: () => CalculationRecord | null;
  loadRecord: (id: string) => void;
  removeRecord: (id: string) => void;
  loadAllRecords: () => void;
  setInputFromRecord: (record: DrainageInput) => void;
  exportDisclosure: (recordId: string) => void;
  resetInput: () => void;
}

const defaultInput: DrainageInput = {
  length: 6,
  lengthUnit: 'm',
  width: 3,
  widthUnit: 'm',
  slope: 3,
  rainfallIntensity: 120,
  rainfallUnit: 'mm/h',
  drainCount: 2,
  drainDiameter: 100,
  drainBlocked: false,
  drainPositions: [],
};

export const useCalculationStore = create<CalculationState>((set, get) => ({
  input: defaultInput,
  result: null,
  records: [],
  currentRecordId: null,
  projectName: '',

  setLength: (value) => set((state) => ({
    input: { ...state.input, length: value },
  })),

  setLengthUnit: (unit) => set((state) => ({
    input: { ...state.input, lengthUnit: unit },
  })),

  setWidth: (value) => set((state) => ({
    input: { ...state.input, width: value },
  })),

  setWidthUnit: (unit) => set((state) => ({
    input: { ...state.input, widthUnit: unit },
  })),

  setSlope: (value) => set((state) => ({
    input: { ...state.input, slope: value },
  })),

  setRainfallIntensity: (value) => set((state) => ({
    input: { ...state.input, rainfallIntensity: value },
  })),

  setRainfallUnit: (unit) => set((state) => ({
    input: { ...state.input, rainfallUnit: unit },
  })),

  setDrainCount: (value) => set((state) => ({
    input: { ...state.input, drainCount: value },
  })),

  setDrainDiameter: (value) => set((state) => ({
    input: { ...state.input, drainDiameter: value },
  })),

  setDrainBlocked: (blocked) => set((state) => ({
    input: { ...state.input, drainBlocked: blocked },
  })),

  setDrainPositions: (positions) => set((state) => ({
    input: { ...state.input, drainPositions: positions },
  })),

  setProjectName: (name) => set({ projectName: name }),

  calculate: () => {
    const { input } = get();
    const result = calculateDrainage(input);
    const warnings = validateInput(input);
    set({ result: { ...result, warnings } });
  },

  saveRecord: () => {
    const { input, result, projectName, currentRecordId } = get();
    if (!result) return null;

    const warnings = validateInput(input);
    const resultWithWarnings = { ...result, warnings };
    const recordId = currentRecordId || generateRecordId();
    const contractorReport = JSON.stringify(generateContractorReport(input, resultWithWarnings));
    const ownerReport = JSON.stringify(generateOwnerReport(input, resultWithWarnings, recordId));

    const newRecord: CalculationRecord = {
      ...input,
      id: recordId,
      result: resultWithWarnings,
      contractorReport,
      ownerReport,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectName,
      parentId: currentRecordId ? currentRecordId : undefined,
    };

    const records = currentRecordId
      ? updateRecord(newRecord)
      : addRecord(newRecord);

    set({ records, currentRecordId: recordId });
    return newRecord;
  },

  loadRecord: (id) => {
    const record = getRecordById(id);
    if (record) {
      set({
        input: {
          length: record.length,
          lengthUnit: record.lengthUnit,
          width: record.width,
          widthUnit: record.widthUnit,
          slope: record.slope,
          rainfallIntensity: record.rainfallIntensity,
          rainfallUnit: record.rainfallUnit,
          drainCount: record.drainCount,
          drainDiameter: record.drainDiameter,
          drainBlocked: record.drainBlocked,
          drainPositions: record.drainPositions,
        },
        result: record.result,
        currentRecordId: id,
        projectName: record.projectName || '',
      });
    }
  },

  removeRecord: (id) => {
    const records = deleteRecord(id);
    set({ records });
    if (get().currentRecordId === id) {
      set({ currentRecordId: null });
    }
  },

  loadAllRecords: () => {
    const records = loadRecords();
    set({ records });
  },

  setInputFromRecord: (record) => {
    set({
      input: { ...record },
      currentRecordId: null,
      result: null,
    });
  },

  exportDisclosure: (recordId) => {
    const { records, projectName } = get();
    const record = records.find((r) => r.id === recordId);
    if (record) {
      const form = generateDisclosureForm(record, projectName || record.projectName || '未命名项目');
      exportDisclosureForm(form, projectName || record.projectName || '未命名项目');
    }
  },

  resetInput: () => {
    set({
      input: defaultInput,
      result: null,
      currentRecordId: null,
    });
  },
}));
