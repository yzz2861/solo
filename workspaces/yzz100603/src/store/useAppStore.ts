import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Chemical, ShiftRecord, CalculationParams } from '@/types';
import { mockUsers, mockChemicals, mockRecords } from '@/data/mockData';

interface AppState {
  currentUser: User | null;
  users: User[];
  chemicals: Chemical[];
  records: ShiftRecord[];
  currentParams: CalculationParams;

  setCurrentUser: (user: User | null) => void;
  addRecord: (record: ShiftRecord) => void;
  updateRecord: (id: string, updates: Partial<ShiftRecord>) => void;
  setCurrentParams: (params: Partial<CalculationParams>) => void;
  resetParams: () => void;
  markAsPrinted: (id: string) => void;
}

const defaultParams: CalculationParams = {
  poolVolume: null,
  currentChlorine: null,
  targetChlorine: null,
  chlorineUnit: 'mgL',
  ph: null,
  chemicalId: 'c1',
  chemicalConcentration: null,
  concentrationUnit: 'percent',
  dosingMethod: 'feeder',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      users: mockUsers,
      chemicals: mockChemicals,
      records: mockRecords,
      currentParams: defaultParams,

      setCurrentUser: (user) => set({ currentUser: user }),

      addRecord: (record) =>
        set((state) => ({
          records: [record, ...state.records],
        })),

      updateRecord: (id, updates) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      setCurrentParams: (params) =>
        set((state) => ({
          currentParams: { ...state.currentParams, ...params },
        })),

      resetParams: () => set({ currentParams: defaultParams }),

      markAsPrinted: (id) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, isPrinted: true } : r
          ),
        })),
    }),
    {
      name: 'pool-dosing-app',
      partialize: (state) => ({
        currentUser: state.currentUser,
        records: state.records,
        currentParams: state.currentParams,
      }),
    }
  )
);
