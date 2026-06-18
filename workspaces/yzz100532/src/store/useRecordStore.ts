import { create } from 'zustand';
import type { DrillRecord } from '../types';
import { db } from '../data/db';

export interface Timestamp {
  nodeId: string;
  time: number;
  event?: string;
}

export interface RecordState {
  records: DrillRecord[];
  currentRecord: DrillRecord | null;
  isRecording: boolean;
  elapsedTime: number;
  timestamps: Timestamp[];
}

export interface RecordActions {
  startRecording: (scenarioId: string, participantName: string) => void;
  stopRecording: (
    estimatedTime: number,
    score: number
  ) => Promise<DrillRecord | null>;
  addTimestamp: (nodeId: string, event?: string) => void;
  saveRecord: (record: DrillRecord) => Promise<string>;
  loadRecords: () => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  setCurrentRecord: (record: DrillRecord | null) => void;
  updateElapsedTime: (time: number) => void;
}

export type RecordStore = RecordState & RecordActions;

let recordingStartTime: number = 0;
let recordingInterval: ReturnType<typeof setInterval> | null = null;

export const useRecordStore = create<RecordStore>((set, get) => ({
  records: [],
  currentRecord: null,
  isRecording: false,
  elapsedTime: 0,
  timestamps: [],

  startRecording: (scenarioId: string, participantName: string) => {
    if (get().isRecording) return;

    recordingStartTime = Date.now();

    set(() => ({
      isRecording: true,
      elapsedTime: 0,
      timestamps: [],
      currentRecord: {
        id: `R-${Date.now()}`,
        scenarioId,
        participantName,
        actualTime: 0,
        estimatedTime: 0,
        score: 0,
        timestamps: [],
        completedAt: new Date().toISOString(),
      },
    }));

    recordingInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      set(() => ({ elapsedTime: elapsed }));
    }, 1000);
  },

  stopRecording: async (
    estimatedTime: number,
    score: number
  ): Promise<DrillRecord | null> => {
    const { isRecording, currentRecord, timestamps, elapsedTime } = get();

    if (!isRecording || !currentRecord) {
      return null;
    }

    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }

    const actualTime = elapsedTime;
    const completedAt = new Date().toISOString();

    const record: DrillRecord = {
      ...currentRecord,
      actualTime,
      estimatedTime,
      score,
      timestamps: [...timestamps],
      completedAt,
    };

    set(() => ({
      isRecording: false,
      currentRecord: record,
    }));

    try {
      await db.addRecord(record);
      set((state) => ({
        records: [record, ...state.records],
      }));
      return record;
    } catch (error) {
      console.error('Failed to save record:', error);
      return null;
    }
  },

  addTimestamp: (nodeId: string, event?: string) => {
    const { isRecording, timestamps, elapsedTime } = get();

    if (!isRecording) return;

    const timestamp: Timestamp = {
      nodeId,
      time: elapsedTime,
      event,
    };

    set(() => ({
      timestamps: [...timestamps, timestamp],
    }));
  },

  saveRecord: async (record: DrillRecord): Promise<string> => {
    const existing = await db.getRecordById(record.id);
    if (existing) {
      await db.updateRecord(record.id, record);
      set((state) => ({
        records: state.records.map((r) =>
          r.id === record.id ? record : r
        ),
        currentRecord:
          state.currentRecord?.id === record.id ? record : state.currentRecord,
      }));
      return record.id;
    } else {
      const id = await db.addRecord(record);
      set((state) => ({
        records: [record, ...state.records],
      }));
      return id;
    }
  },

  loadRecords: async (): Promise<void> => {
    try {
      const records = await db.getAllRecords();
      set(() => ({ records }));
    } catch (error) {
      console.error('Failed to load records:', error);
      set(() => ({ records: [] }));
    }
  },

  deleteRecord: async (id: string): Promise<void> => {
    try {
      await db.deleteRecord(id);
      set((state) => ({
        records: state.records.filter((r) => r.id !== id),
        currentRecord: state.currentRecord?.id === id ? null : state.currentRecord,
      }));
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  },

  setCurrentRecord: (record: DrillRecord | null) =>
    set(() => ({
      currentRecord: record,
    })),

  updateElapsedTime: (time: number) =>
    set(() => ({
      elapsedTime: time,
    })),
}));

export default useRecordStore;
