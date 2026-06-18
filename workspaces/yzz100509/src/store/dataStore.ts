import { create } from 'zustand';
import type { UmbrellaPoint, BorrowRecord, WeatherRecord, AnomalyEvent } from '@/types';
import { mockPoints, mockRecords, mockWeather, mockAnomalies } from '@/data';

interface DataState {
  points: UmbrellaPoint[];
  records: BorrowRecord[];
  weather: WeatherRecord[];
  anomalies: AnomalyEvent[];
  loaded: boolean;
}

interface DataActions {
  loadMockData: () => void;
  setPoints: (points: UmbrellaPoint[]) => void;
  setRecords: (records: BorrowRecord[]) => void;
  setWeather: (weather: WeatherRecord[]) => void;
  addAnomaly: (e: AnomalyEvent) => void;
  updateAnomaly: (id: string, patch: Partial<AnomalyEvent>) => void;
  markImportComplete: () => void;
}

type DataStore = DataState & DataActions;

export const useDataStore = create<DataStore>((set) => ({
  points: [],
  records: [],
  weather: [],
  anomalies: [],
  loaded: false,

  loadMockData: () => {
    set({
      points: [...mockPoints],
      records: [...mockRecords],
      weather: [...mockWeather],
      anomalies: [...mockAnomalies],
      loaded: true,
    });
  },

  setPoints: (points) => set({ points }),

  setRecords: (records) => set({ records }),

  setWeather: (weather) => set({ weather }),

  addAnomaly: (e) =>
    set((state) => ({
      anomalies: [...state.anomalies, e],
    })),

  updateAnomaly: (id, patch) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    })),

  markImportComplete: () => set({ loaded: true }),
}));
