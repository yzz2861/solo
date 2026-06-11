import { create } from 'zustand';
import type { DeviceType } from '../types/devices';
import type { Risk, SafetySettings } from '../types/safety';
import { filterRisksByDeviceType } from '../utils/safetyEngine';

interface SafetyState {
  filterType: DeviceType | 'all';
  setRiskFilter: (type: DeviceType | 'all') => void;
  getFilteredRisks: (risks: Risk[]) => Risk[];
}

export const useSafetyStore = create<SafetyState>((set, get) => ({
  filterType: 'all',

  setRiskFilter: (type) => set({ filterType: type }),

  getFilteredRisks: (risks) => {
    const { filterType } = get();
    return filterRisksByDeviceType(risks, filterType);
  },
}));
