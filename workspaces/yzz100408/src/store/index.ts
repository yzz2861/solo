import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ChargingOrder, QueueRecord, ElectricityPrice, GunFault,
  HourlyMetric, AttributionResult, ShiftRecommendation,
  DataCategory, UploadedFile, ParsedDataSummary, PriceType,
} from '@/types';
import {
  mockOrders, mockQueueRecords, mockElectricityPrices,
  mockGunFaults, mockAnalysisDate, mockGunIds,
} from '@/data/mockData';
import { preprocessAll } from '@/engine/preprocessor';
import {
  computeHourlyMetrics, aggregateHourlyMetrics,
  computeShiftRecommendations,
} from '@/engine/metrics';
import { computeFullAttribution } from '@/engine/attribution';
import { formatDate, restoreDatesInOrders, restoreDatesInQueue, restoreDatesInFaults } from '@/utils/date';

export interface FilterState {
  selectedDate: string;
  selectedGuns: string[];
  selectedPriceTypes: PriceType[];
  selectedVehicleModels: string[];
  hourRange: [number, number];
}

interface AnalysisState {
  orders: ChargingOrder[];
  queueRecords: QueueRecord[];
  prices: ElectricityPrice[];
  faults: GunFault[];
  gunIds: string[];
  hourlyMetrics: HourlyMetric[];
  aggregatedMetrics: HourlyMetric[];
  attribution: AttributionResult | null;
  shiftRecommendations: ShiftRecommendation[];
  uploadedFiles: Record<DataCategory, UploadedFile | null>;
  parsedSummary: ParsedDataSummary | null;
  isUsingMockData: boolean;
  filters: FilterState;

  loadMockData: () => void;
  setData: (
    orders: ChargingOrder[],
    queueRecords: QueueRecord[],
    prices: ElectricityPrice[],
    faults: GunFault[]
  ) => void;
  runAnalysis: () => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  setUploadedFile: (category: DataCategory, file: UploadedFile | null) => void;
  clearAllData: () => void;
}

const defaultFilters: FilterState = {
  selectedDate: mockAnalysisDate,
  selectedGuns: [],
  selectedPriceTypes: [],
  selectedVehicleModels: [],
  hourRange: [0, 24],
};

const emptySummary: ParsedDataSummary = {
  orders: { count: 0, dateRange: ['', ''], anomalies: [] },
  queue: { count: 0, dateRange: ['', ''], anomalies: [] },
  prices: { count: 0, periods: [], anomalies: [] },
  faults: { count: 0, affectedGuns: [], anomalies: [] },
};

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      orders: [],
      queueRecords: [],
      prices: [],
      faults: [],
      gunIds: [],
      hourlyMetrics: [],
      aggregatedMetrics: [],
      attribution: null,
      shiftRecommendations: [],
      uploadedFiles: { orders: null, queue: null, prices: null, faults: null },
      parsedSummary: null,
      isUsingMockData: false,
      filters: defaultFilters,

      loadMockData: () => {
        const orders = restoreDatesInOrders(JSON.parse(JSON.stringify(mockOrders)));
        const faults = restoreDatesInFaults(JSON.parse(JSON.stringify(mockGunFaults)));
        const queueRecordsData = restoreDatesInQueue(JSON.parse(JSON.stringify(mockQueueRecords)));
        const processed = preprocessAll(orders, faults, JSON.parse(JSON.stringify(mockElectricityPrices)));
        const metrics = computeHourlyMetrics(
          processed.orders,
          queueRecordsData,
          processed.faults,
          processed.prices,
          mockAnalysisDate,
          mockGunIds
        );
        const agg = aggregateHourlyMetrics(metrics);
        const attribution = computeFullAttribution(processed.orders, processed.faults, metrics);
        const shifts = computeShiftRecommendations(agg);
        const vehicleModels = Array.from(new Set(mockOrders.map(o => o.vehicleModel)));

        set({
          orders: processed.orders,
          queueRecords: queueRecordsData,
          prices: processed.prices,
          faults: processed.faults,
          gunIds: mockGunIds,
          hourlyMetrics: metrics,
          aggregatedMetrics: agg,
          attribution,
          shiftRecommendations: shifts,
          isUsingMockData: true,
          filters: { ...defaultFilters, selectedDate: mockAnalysisDate, selectedVehicleModels: vehicleModels },
        });
      },

      setData: (orders, queueRecords, prices, faults) => {
        const processed = preprocessAll(orders, faults, prices);
        const uniqueGuns = Array.from(new Set([
          ...processed.orders.map(o => o.gunId),
          ...processed.faults.map(f => f.gunId),
        ])).sort();
        const dates = Array.from(new Set([
          ...processed.orders.map(o => formatDate(o.queueStartTime)),
          ...queueRecords.map(q => formatDate(q.timestamp)),
        ])).sort();
        const vehicleModels = Array.from(new Set(processed.orders.map(o => o.vehicleModel)));

        const summary: ParsedDataSummary = {
          orders: {
            count: processed.orders.length,
            dateRange: [dates[0] || '', dates[dates.length - 1] || ''],
            anomalies: processed.orders.filter(o => o.leftEarly).length > 0
              ? [`发现 ${processed.orders.filter(o => o.leftEarly).length} 笔提前离开订单`]
              : [],
          },
          queue: {
            count: queueRecords.length,
            dateRange: [dates[0] || '', dates[dates.length - 1] || ''],
            anomalies: [],
          },
          prices: {
            count: processed.prices.length,
            periods: Array.from(new Set(processed.prices.map(p => p.priceType))),
            anomalies: [],
          },
          faults: {
            count: processed.faults.length,
            affectedGuns: Array.from(new Set(processed.faults.map(f => f.gunId))),
            anomalies: processed.faults.filter(f => f.mergedFromMultiple).length > 0
              ? [`合并了 ${processed.faults.filter(f => f.mergedFromMultiple).length} 组重复故障`]
              : [],
          },
        };

        set({
          orders: processed.orders,
          queueRecords,
          prices: processed.prices,
          faults: processed.faults,
          gunIds: uniqueGuns,
          parsedSummary: summary,
          isUsingMockData: false,
          filters: {
            ...defaultFilters,
            selectedDate: dates[0] || formatDate(new Date()),
            selectedVehicleModels: vehicleModels,
            selectedGuns: uniqueGuns,
          },
        });
        get().runAnalysis();
      },

      runAnalysis: () => {
        const { orders, queueRecords, prices, faults, filters, gunIds } = get();
        if (orders.length === 0) return;

        const metrics = computeHourlyMetrics(
          orders, queueRecords, faults, prices,
          filters.selectedDate, gunIds.length > 0 ? gunIds : mockGunIds
        );
        const agg = aggregateHourlyMetrics(metrics);
        const attribution = computeFullAttribution(orders, faults, metrics);
        const shifts = computeShiftRecommendations(agg);

        set({
          hourlyMetrics: metrics,
          aggregatedMetrics: agg,
          attribution,
          shiftRecommendations: shifts,
        });
      },

      setFilter: (key, value) => {
        set(state => {
          const newFilters = { ...state.filters, [key]: value };
          if (key === 'selectedDate') {
            setTimeout(() => get().runAnalysis(), 0);
          }
          return { filters: newFilters };
        });
      },

      resetFilters: () => {
        set({ filters: defaultFilters });
        get().runAnalysis();
      },

      setUploadedFile: (category, file) => {
        set(state => ({
          uploadedFiles: { ...state.uploadedFiles, [category]: file },
        }));
      },

      clearAllData: () => {
        set({
          orders: [],
          queueRecords: [],
          prices: [],
          faults: [],
          gunIds: [],
          hourlyMetrics: [],
          aggregatedMetrics: [],
          attribution: null,
          shiftRecommendations: [],
          uploadedFiles: { orders: null, queue: null, prices: null, faults: null },
          parsedSummary: null,
          isUsingMockData: false,
          filters: defaultFilters,
        });
        void emptySummary;
      },
    }),
    {
      name: 'charging-queue-analysis-store',
      partialize: state => ({
        filters: state.filters,
      }),
    }
  )
);
