import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BoxItem, CalculationReport, LayerResult, ShelfConfig, WarningItem } from '@/types';
import { calculateAllLayers, calculateTotalWeight } from '@/utils/calculator';
import { generateWarnings } from '@/utils/warningEngine';
import { buildReport } from '@/utils/reportExporter';

const DEFAULT_SHELF: ShelfConfig = {
  id: 'shelf-default',
  name: 'A区小家电货架',
  layerCount: 5,
  layerWidth_cm: 120,
  layerDepth_cm: 60,
  layerMaxWeight_kg: 150,
  singleItemLimit_kg: 25,
};

const SAMPLE_BOXES: BoxItem[] = [
  { id: 'b1', layerIndex: 0, name: '电饭煲(豪华版)', weight: 6.5, weightUnit: 'kg', length_cm: 42, width_cm: 32, height_cm: 28, quantity: 8, positionZone: 'tl' },
  { id: 'b2', layerIndex: 0, name: '电水壶', weight: 4.2, weightUnit: 'kg', length_cm: 24, width_cm: 18, height_cm: 24, quantity: 12, positionZone: 'tr' },
  { id: 'b3', layerIndex: 0, name: '烤箱(小型)', weight: 12, weightUnit: 'kg', length_cm: 38, width_cm: 28, height_cm: 22, quantity: 3, positionZone: 'mc' },
  { id: 'b4', layerIndex: 1, name: '微波炉', weight: 28, weightUnit: 'jin', length_cm: 50, width_cm: 36, height_cm: 28, quantity: 6, positionZone: 'mc' },
  { id: 'b5', layerIndex: 1, name: '空气炸锅', weight: 5.5, weightUnit: 'kg', length_cm: 32, width_cm: 28, height_cm: 32, quantity: 8, positionZone: 'ml' },
  { id: 'b6', layerIndex: 2, name: '养生壶套装', weight: 3.8, weightUnit: 'kg', length_cm: 26, width_cm: 20, height_cm: 26, quantity: 15, positionZone: 'tc' },
  { id: 'b7', layerIndex: 2, name: '咖啡机', weight: 18, weightUnit: 'lb', length_cm: 34, width_cm: 24, height_cm: 34, quantity: 5, positionZone: 'bc' },
  { id: 'b8', layerIndex: 3, name: '破壁料理机', weight: 35, weightUnit: 'jin', length_cm: 28, width_cm: 24, height_cm: 42, quantity: 10, positionZone: 'mr' },
  { id: 'b9', layerIndex: 4, name: '多士炉', weight: 2.4, weightUnit: 'kg', length_cm: 30, width_cm: 18, height_cm: 20, quantity: 20, positionZone: 'bl' },
  { id: 'b10', layerIndex: 4, name: '电压力锅', weight: 8, weightUnit: 'kg', length_cm: 36, width_cm: 36, height_cm: 32, quantity: 9, positionZone: 'br' },
];

interface AppState {
  shelf: ShelfConfig;
  boxes: BoxItem[];
  layerResults: LayerResult[];
  warnings: WarningItem[];
  lastReport: CalculationReport | null;
  setShelf: (s: Partial<ShelfConfig>) => void;
  addBox: () => void;
  updateBox: (id: string, patch: Partial<BoxItem>) => void;
  removeBox: (id: string) => void;
  recalculate: () => void;
  buildAndSaveReport: () => CalculationReport;
  resetToSample: () => void;
  clearBoxes: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      shelf: DEFAULT_SHELF,
      boxes: SAMPLE_BOXES,
      layerResults: calculateAllLayers(DEFAULT_SHELF, SAMPLE_BOXES),
      warnings: generateWarnings(DEFAULT_SHELF, SAMPLE_BOXES, calculateAllLayers(DEFAULT_SHELF, SAMPLE_BOXES)),
      lastReport: null,

      setShelf: (patch) =>
        set((s) => {
          const newShelf = { ...s.shelf, ...patch };
          if (newShelf.layerCount < 1) newShelf.layerCount = 1;
          if (newShelf.layerCount > 20) newShelf.layerCount = 20;
          const layerResults = calculateAllLayers(newShelf, s.boxes);
          const warnings = generateWarnings(newShelf, s.boxes, layerResults);
          return { shelf: newShelf, layerResults, warnings };
        }),

      addBox: () =>
        set((s) => {
          const newBox: BoxItem = {
            id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            layerIndex: 0,
            name: '新货物',
            weight: 1,
            weightUnit: 'kg',
            length_cm: 30,
            width_cm: 20,
            height_cm: 20,
            quantity: 1,
            positionZone: 'mc',
          };
          const boxes = [...s.boxes, newBox];
          const layerResults = calculateAllLayers(s.shelf, boxes);
          const warnings = generateWarnings(s.shelf, boxes, layerResults);
          return { boxes, layerResults, warnings };
        }),

      updateBox: (id, patch) =>
        set((s) => {
          const boxes = s.boxes.map((b) =>
            b.id === id
              ? {
                  ...b,
                  ...patch,
                  layerIndex:
                    patch.layerIndex !== undefined
                      ? Math.min(Math.max(patch.layerIndex, 0), s.shelf.layerCount - 1)
                      : b.layerIndex,
                }
              : b
          );
          const layerResults = calculateAllLayers(s.shelf, boxes);
          const warnings = generateWarnings(s.shelf, boxes, layerResults);
          return { boxes, layerResults, warnings };
        }),

      removeBox: (id) =>
        set((s) => {
          const boxes = s.boxes.filter((b) => b.id !== id);
          const layerResults = calculateAllLayers(s.shelf, boxes);
          const warnings = generateWarnings(s.shelf, boxes, layerResults);
          return { boxes, layerResults, warnings };
        }),

      recalculate: () =>
        set((s) => {
          const layerResults = calculateAllLayers(s.shelf, s.boxes);
          const warnings = generateWarnings(s.shelf, s.boxes, layerResults);
          return { layerResults, warnings };
        }),

      buildAndSaveReport: () => {
        const state = get();
        const report = buildReport(
          state.shelf,
          state.boxes,
          state.layerResults,
          state.warnings,
          state.lastReport?.version || 0
        );
        set({ lastReport: report });
        return report;
      },

      resetToSample: () =>
        set(() => {
          const layerResults = calculateAllLayers(DEFAULT_SHELF, SAMPLE_BOXES);
          const warnings = generateWarnings(DEFAULT_SHELF, SAMPLE_BOXES, layerResults);
          return {
            shelf: DEFAULT_SHELF,
            boxes: SAMPLE_BOXES,
            layerResults,
            warnings,
          };
        }),

      clearBoxes: () =>
        set((s) => {
          const layerResults = calculateAllLayers(s.shelf, []);
          const warnings = generateWarnings(s.shelf, [], layerResults);
          return { boxes: [], layerResults, warnings };
        }),
    }),
    {
      name: 'shelf-load-app-v1',
      partialize: (state) => ({
        shelf: state.shelf,
        boxes: state.boxes,
        lastReport: state.lastReport,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.layerResults = calculateAllLayers(state.shelf, state.boxes);
          state.warnings = generateWarnings(state.shelf, state.boxes, state.layerResults);
        }
      },
    }
  )
);
