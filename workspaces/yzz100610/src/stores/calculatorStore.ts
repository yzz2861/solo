import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CalculationInput,
  CalculationResult,
  ViewMode,
  CompressionUnit,
  PalletType,
  HumidityCondition,
} from '@/types/calculation';
import { calculateStack, convertToKgf, getHumidityAvoidanceInfo } from '@/utils/calculationEngine';

interface RouteNote {
  id: string;
  name: string;
  days: number;
  notes: string;
  createdAt: number;
}

interface CalculatorState {
  viewMode: ViewMode;
  input: CalculationInput;
  result: CalculationResult | null;
  routeNotes: RouteNote[];
  setViewMode: (mode: ViewMode) => void;
  setBoxWeight: (value: number) => void;
  setBoxCompression: (value: number) => void;
  setCompressionUnit: (unit: CompressionUnit) => void;
  setStackLayers: (layers: number) => void;
  setPalletType: (type: PalletType) => void;
  setHumidityCondition: (condition: HumidityCondition) => void;
  setTransportDays: (days: number) => void;
  setRouteName: (name: string) => void;
  setRouteNotes: (notes: string) => void;
  calculate: () => void;
  addRouteNote: (note: Omit<RouteNote, 'id' | 'createdAt'>) => void;
  removeRouteNote: (id: string) => void;
  getHumidityWarnings: () => string[];
}

const defaultInput: CalculationInput = {
  boxWeight: 15,
  boxCompression: 300,
  compressionUnit: 'kgf',
  stackLayers: 5,
  palletType: 'wood',
  humidityCondition: 'normal',
  transportDays: 3,
  routeName: '',
  routeNotes: '',
};

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set, get) => ({
      viewMode: 'procurement',
      input: defaultInput,
      result: null,
      routeNotes: [],

      setViewMode: (mode) => set({ viewMode: mode }),

      setBoxWeight: (value) => {
        set((state) => ({ input: { ...state.input, boxWeight: value } }));
        get().calculate();
      },

      setBoxCompression: (value) => {
        set((state) => ({ input: { ...state.input, boxCompression: value } }));
        get().calculate();
      },

      setCompressionUnit: (unit) => {
        set((state) => ({ input: { ...state.input, compressionUnit: unit } }));
        get().calculate();
      },

      setStackLayers: (layers) => {
        set((state) => ({ input: { ...state.input, stackLayers: Math.max(1, layers) } }));
        get().calculate();
      },

      setPalletType: (type) => {
        set((state) => ({ input: { ...state.input, palletType: type } }));
        get().calculate();
      },

      setHumidityCondition: (condition) => {
        set((state) => ({ input: { ...state.input, humidityCondition: condition } }));
        get().calculate();
      },

      setTransportDays: (days) => {
        set((state) => ({ input: { ...state.input, transportDays: Math.max(0, days) } }));
        get().calculate();
      },

      setRouteName: (name) => {
        set((state) => ({ input: { ...state.input, routeName: name } }));
      },

      setRouteNotes: (notes) => {
        set((state) => ({ input: { ...state.input, routeNotes: notes } }));
      },

      calculate: () => {
        const { input } = get();
        if (input.boxWeight > 0 && input.boxCompression > 0 && input.stackLayers >= 1) {
          const result = calculateStack(input);
          set({ result });
        } else {
          set({ result: null });
        }
      },

      addRouteNote: (note) => {
        const newNote: RouteNote = {
          ...note,
          id: Date.now().toString(),
          createdAt: Date.now(),
        };
        set((state) => ({ routeNotes: [...state.routeNotes, newNote] }));
      },

      removeRouteNote: (id) => {
        set((state) => ({
          routeNotes: state.routeNotes.filter((n) => n.id !== id),
        }));
      },

      getHumidityWarnings: () => {
        const { input } = get();
        const compressionKgf = convertToKgf(input.boxCompression, input.compressionUnit);
        const palletFactor = 1.0;
        return getHumidityAvoidanceInfo(input.boxWeight, compressionKgf * palletFactor);
      },
    }),
    {
      name: 'carton-stack-calculator',
      partialize: (state) => ({
        input: state.input,
        routeNotes: state.routeNotes,
        viewMode: state.viewMode,
      }),
    }
  )
);
