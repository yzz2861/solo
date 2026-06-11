import { create } from 'zustand';
import type { DeviceType } from '../types/devices';

type PanelType = 'properties' | 'risks' | 'history' | 'safety';

interface UIState {
  activePanel: PanelType;
  isPlacingDevice: boolean;
  placingDeviceType: DeviceType | null;
  showSaveModal: boolean;
  showExportModal: boolean;
  setActivePanel: (panel: PanelType) => void;
  startPlacingDevice: (type: DeviceType) => void;
  cancelPlacingDevice: () => void;
  toggleSaveModal: (show: boolean) => void;
  toggleExportModal: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: 'properties',
  isPlacingDevice: false,
  placingDeviceType: null,
  showSaveModal: false,
  showExportModal: false,

  setActivePanel: (panel) => set({ activePanel: panel }),

  startPlacingDevice: (type) => set({
    isPlacingDevice: true,
    placingDeviceType: type,
  }),

  cancelPlacingDevice: () => set({
    isPlacingDevice: false,
    placingDeviceType: null,
  }),

  toggleSaveModal: (show) => set({ showSaveModal: show }),
  toggleExportModal: (show) => set({ showExportModal: show }),
}));
