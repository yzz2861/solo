import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import type {
  PublicToilet,
  InspectionRecord,
  CleaningRecord,
  PassengerFlow,
  Complaint,
  Alias,
  WeatherRecord,
  Activity,
  ThresholdConfig,
} from '../types';
import { generateAllMockData } from '../data/mockData';
import { aggregateByHour, type HourlyAggregate } from '../utils/normalize';
import { DEFAULT_THRESHOLD } from '../utils/heatmap';

interface AppState {
  toilets: PublicToilet[];
  inspections: InspectionRecord[];
  cleaningRecords: CleaningRecord[];
  passengerFlows: PassengerFlow[];
  complaints: Complaint[];
  aliases: Alias[];
  weather: WeatherRecord[];
  activities: Activity[];
  hourlyData: HourlyAggregate[];
  thresholdConfig: ThresholdConfig;
  selectedDate: string;
  selectedHour: number;
  isPlaying: boolean;
  selectedToiletId: string | null;

  initMockData: () => void;
  setSelectedDate: (date: string) => void;
  setSelectedHour: (hour: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setSelectedToiletId: (id: string | null) => void;
  setThresholdConfig: (config: Partial<ThresholdConfig>) => void;
  addInspection: (record: InspectionRecord) => void;
  addCleaningRecord: (record: CleaningRecord) => void;
  addPassengerFlow: (flow: PassengerFlow) => void;
  addComplaint: (complaint: Complaint) => void;
  addAlias: (alias: Alias) => void;
  removeAlias: (aliasId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      toilets: [],
      inspections: [],
      cleaningRecords: [],
      passengerFlows: [],
      complaints: [],
      aliases: [],
      weather: [],
      activities: [],
      hourlyData: [],
      thresholdConfig: DEFAULT_THRESHOLD,
      selectedDate: dayjs().format('YYYY-MM-DD'),
      selectedHour: dayjs().hour(),
      isPlaying: false,
      selectedToiletId: null,

      initMockData: () => {
        const mockData = generateAllMockData(7);
        const hourlyData = aggregateByHour(
          mockData.toilets,
          mockData.inspections,
          mockData.cleaningRecords,
          mockData.passengerFlows,
          mockData.complaints
        );
        set({
          toilets: mockData.toilets,
          inspections: mockData.inspections,
          cleaningRecords: mockData.cleaningRecords,
          passengerFlows: mockData.passengerFlows,
          complaints: mockData.complaints,
          aliases: mockData.aliases,
          weather: mockData.weather,
          activities: mockData.activities,
          hourlyData,
        });
      },

      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedHour: (hour) => set({ selectedHour: hour }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setSelectedToiletId: (id) => set({ selectedToiletId: id }),

      setThresholdConfig: (config) =>
        set((state) => ({
          thresholdConfig: { ...state.thresholdConfig, ...config },
        })),

      addInspection: (record) =>
        set((state) => {
          const newInspections = [record, ...state.inspections];
          const newHourlyData = aggregateByHour(
            state.toilets,
            newInspections,
            state.cleaningRecords,
            state.passengerFlows,
            state.complaints
          );
          return { inspections: newInspections, hourlyData: newHourlyData };
        }),

      addCleaningRecord: (record) =>
        set((state) => {
          const newRecords = [record, ...state.cleaningRecords];
          const newHourlyData = aggregateByHour(
            state.toilets,
            state.inspections,
            newRecords,
            state.passengerFlows,
            state.complaints
          );
          return { cleaningRecords: newRecords, hourlyData: newHourlyData };
        }),

      addPassengerFlow: (flow) =>
        set((state) => {
          const newFlows = [flow, ...state.passengerFlows];
          const newHourlyData = aggregateByHour(
            state.toilets,
            state.inspections,
            state.cleaningRecords,
            newFlows,
            state.complaints
          );
          return { passengerFlows: newFlows, hourlyData: newHourlyData };
        }),

      addComplaint: (complaint) =>
        set((state) => {
          const newComplaints = [complaint, ...state.complaints];
          const newHourlyData = aggregateByHour(
            state.toilets,
            state.inspections,
            state.cleaningRecords,
            state.passengerFlows,
            newComplaints
          );
          return { complaints: newComplaints, hourlyData: newHourlyData };
        }),

      addAlias: (alias) =>
        set((state) => ({
          aliases: [...state.aliases, alias],
        })),

      removeAlias: (aliasId) =>
        set((state) => ({
          aliases: state.aliases.filter((a) => a.id !== aliasId),
        })),
    }),
    {
      name: 'toilet-heatmap-storage',
      partialize: (state) => ({
        toilets: state.toilets,
        inspections: state.inspections,
        cleaningRecords: state.cleaningRecords,
        passengerFlows: state.passengerFlows,
        complaints: state.complaints,
        aliases: state.aliases,
        weather: state.weather,
        activities: state.activities,
        thresholdConfig: state.thresholdConfig,
      }),
    }
  )
);
