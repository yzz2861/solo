import { create } from 'zustand';
import type { BufferInput, BufferResult, ConcentrationUnit, VolumeUnit } from '@/types';
import { calculate } from '@/engine/calculate';

interface BufferStore {
  input: BufferInput;
  result: BufferResult | null;
  showSteps: boolean;
  setInput: (field: keyof BufferInput, value: string | number) => void;
  calculateResult: () => void;
  resetInput: () => void;
  toggleSteps: () => void;
}

const defaultInput: BufferInput = {
  acidName: '',
  baseName: '',
  pKa: 4.76,
  acidConcentration: 0.1,
  acidConcentrationUnit: 'mol/L' as ConcentrationUnit,
  baseConcentration: 0.1,
  baseConcentrationUnit: 'mol/L' as ConcentrationUnit,
  targetPH: 4.76,
  targetVolume: 100,
  targetVolumeUnit: 'mL' as VolumeUnit,
};

export const useBufferStore = create<BufferStore>((set, get) => ({
  input: { ...defaultInput },
  result: null,
  showSteps: false,
  setInput: (field, value) => {
    set((state) => ({
      input: { ...state.input, [field]: value },
    }));
  },
  calculateResult: () => {
    const { input } = get();
    const result = calculate(input);
    set({ result });
  },
  resetInput: () => {
    set({ input: { ...defaultInput }, result: null, showSteps: false });
  },
  toggleSteps: () => {
    set((state) => ({ showSteps: !state.showSteps }));
  },
}));
