import { create } from 'zustand';
import {
  HeatLoadInput,
  HeatLoadResult,
  SimulationResult,
  calculateHeatLoad,
  simulateImprovement,
} from '@/utils/heatLoadCalc';
import { WarningInfo, checkWarnings } from '@/utils/unitConverter';

const defaultInput: HeatLoadInput = {
  volume: 200,
  targetTemp: -18,
  ambientTemp: 32,
  ambientHumidity: 75,
  doorWidth: 2.0,
  doorHeight: 2.5,
  openCount: 20,
  avgOpenDuration: 180,
  goodsTemp: 5,
  goodsWeight: 2000,
};

interface CalculationStore {
  input: HeatLoadInput;
  result: HeatLoadResult | null;
  simulation: SimulationResult | null;
  warnings: WarningInfo[];
  setInput: (patch: Partial<HeatLoadInput>) => void;
  calculate: () => void;
  simulate: (reducedCount: number, reducedDuration: number) => void;
  reset: () => void;
}

export const useCalcStore = create<CalculationStore>((set, get) => ({
  input: { ...defaultInput },
  result: null,
  simulation: null,
  warnings: [],

  setInput: (patch) => {
    const newInput = { ...get().input, ...patch };
    const deltaT = Math.abs(newInput.ambientTemp - newInput.targetTemp);
    const warnings = checkWarnings(
      newInput.avgOpenDuration,
      newInput.ambientHumidity,
      deltaT
    );
    set({ input: newInput, warnings });
  },

  calculate: () => {
    const input = get().input;
    const result = calculateHeatLoad(input);
    set({ result, simulation: null });
  },

  simulate: (reducedCount: number, reducedDuration: number) => {
    const { input, result } = get();
    if (!result) return;
    const simulation = simulateImprovement(input, result, reducedCount, reducedDuration);
    set({ simulation });
  },

  reset: () => {
    set({
      input: { ...defaultInput },
      result: null,
      simulation: null,
      warnings: [],
    });
  },
}));
