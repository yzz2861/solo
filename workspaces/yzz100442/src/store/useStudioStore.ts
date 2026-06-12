import { create } from 'zustand';
import type { StudioDevice } from '@/types/device';
import type { StudioScheme } from '@/types/scheme';
import type { Alert } from '@/types/alert';
import { defaultSchemes } from '@/data/defaultSchemes';
import { generateId } from '@/data/defaultDevices';
import {
  loadSchemesFromStorage,
  saveSchemesToStorage,
  loadCurrentSchemeIdFromStorage,
  saveCurrentSchemeIdToStorage,
  exportSchemeToJson,
  importSchemeFromJson,
  downloadJsonFile,
  generateSchemeId,
} from '@/utils/scheme';
import { runDetection } from '@/utils/detection';

interface StudioState {
  devices: StudioDevice[];
  selectedId: string | null;
  studioSize: { width: number; depth: number };

  currentScheme: StudioScheme | null;
  schemes: StudioScheme[];

  alerts: Alert[];

  showFrustum: boolean;
  showLightRange: boolean;
  showGrid: boolean;

  history: StudioDevice[][];
  historyIndex: number;

  addDevice: (device: StudioDevice) => void;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, updates: Partial<StudioDevice>) => void;
  selectDevice: (id: string | null) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  saveScheme: (name: string, productType: string, description: string) => void;
  loadScheme: (id: string) => void;
  deleteScheme: (id: string) => void;
  updateSchemeMeta: (id: string, updates: Partial<StudioScheme>) => void;
  exportScheme: (id: string) => void;
  importScheme: (json: string) => void;
  createNewScheme: () => void;

  runDetection: () => void;

  setShowFrustum: (show: boolean) => void;
  setShowLightRange: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;

  init: () => void;
}

const initialScheme = defaultSchemes[0];

export const useStudioStore = create<StudioState>((set, get) => ({
  devices: initialScheme.devices,
  selectedId: null,
  studioSize: initialScheme.studioSize,

  currentScheme: initialScheme,
  schemes: defaultSchemes,

  alerts: [],

  showFrustum: true,
  showLightRange: true,
  showGrid: true,

  history: [initialScheme.devices],
  historyIndex: 0,

  addDevice: (device) => {
    set((state) => {
      const newDevices = [...state.devices, device];
      return {
        devices: newDevices,
        selectedId: device.id,
      };
    });
    get().pushHistory();
    get().runDetection();
  },

  removeDevice: (id) => {
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
    get().pushHistory();
    get().runDetection();
  },

  updateDevice: (id, updates) => {
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === id ? ({ ...d, ...updates } as StudioDevice) : d
      ),
    }));
    get().runDetection();
  },

  selectDevice: (id) => {
    set({ selectedId: id });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      set({
        devices: state.history[newIndex],
        historyIndex: newIndex,
      });
      get().runDetection();
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      set({
        devices: state.history[newIndex],
        historyIndex: newIndex,
      });
      get().runDetection();
    }
  },

  pushHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.devices]);
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  saveScheme: (name, productType, description) => {
    const state = get();
    const now = Date.now();

    if (state.currentScheme) {
      const updatedScheme: StudioScheme = {
        ...state.currentScheme,
        name,
        productType,
        description,
        devices: [...state.devices],
        studioSize: { ...state.studioSize },
        updatedAt: now,
      };

      const newSchemes = state.schemes.map((s) =>
        s.id === state.currentScheme!.id ? updatedScheme : s
      );

      set({
        schemes: newSchemes,
        currentScheme: updatedScheme,
      });

      saveSchemesToStorage(newSchemes);
    } else {
      const newScheme: StudioScheme = {
        id: generateSchemeId(),
        name,
        productType,
        description,
        createdAt: now,
        updatedAt: now,
        devices: [...state.devices],
        studioSize: { ...state.studioSize },
      };

      const newSchemes = [...state.schemes, newScheme];

      set({
        schemes: newSchemes,
        currentScheme: newScheme,
      });

      saveSchemesToStorage(newSchemes);
      saveCurrentSchemeIdToStorage(newScheme.id);
    }
  },

  loadScheme: (id) => {
    const scheme = get().schemes.find((s) => s.id === id);
    if (scheme) {
      set({
        devices: [...scheme.devices],
        studioSize: { ...scheme.studioSize },
        currentScheme: scheme,
        selectedId: null,
        history: [[...scheme.devices]],
        historyIndex: 0,
      });
      saveCurrentSchemeIdToStorage(id);
      get().runDetection();
    }
  },

  deleteScheme: (id) => {
    set((state) => {
      const newSchemes = state.schemes.filter((s) => s.id !== id);
      saveSchemesToStorage(newSchemes);

      if (state.currentScheme?.id === id) {
        const firstScheme = newSchemes[0] || null;
        return {
          schemes: newSchemes,
          currentScheme: firstScheme,
          devices: firstScheme ? [...firstScheme.devices] : [],
          studioSize: firstScheme ? { ...firstScheme.studioSize } : { width: 10, depth: 8 },
        };
      }

      return { schemes: newSchemes };
    });
    get().runDetection();
  },

  updateSchemeMeta: (id, updates) => {
    set((state) => {
      const newSchemes = state.schemes.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
      );
      saveSchemesToStorage(newSchemes);
      return {
        schemes: newSchemes,
        currentScheme:
          state.currentScheme?.id === id
            ? { ...state.currentScheme, ...updates }
            : state.currentScheme,
      };
    });
  },

  exportScheme: (id) => {
    const scheme = get().schemes.find((s) => s.id === id);
    if (scheme) {
      const json = exportSchemeToJson(scheme);
      downloadJsonFile(`${scheme.name}.json`, json);
    }
  },

  importScheme: (json) => {
    const scheme = importSchemeFromJson(json);
    if (scheme) {
      scheme.id = generateSchemeId();
      scheme.createdAt = Date.now();
      scheme.updatedAt = Date.now();
      scheme.name = `${scheme.name} (导入)`;

      set((state) => {
        const newSchemes = [...state.schemes, scheme];
        saveSchemesToStorage(newSchemes);
        return { schemes: newSchemes };
      });
    }
  },

  createNewScheme: () => {
    const newScheme: StudioScheme = {
      id: generateSchemeId(),
      name: '新方案',
      productType: '通用',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      devices: [],
      studioSize: { width: 10, depth: 8 },
    };

    set((state) => {
      const newSchemes = [...state.schemes, newScheme];
      saveSchemesToStorage(newSchemes);
      return {
        schemes: newSchemes,
        currentScheme: newScheme,
        devices: [],
        studioSize: { width: 10, depth: 8 },
        selectedId: null,
        history: [[]],
        historyIndex: 0,
      };
    });
    saveCurrentSchemeIdToStorage(newScheme.id);
    get().runDetection();
  },

  runDetection: () => {
    const alerts = runDetection(get().devices);
    set({ alerts });
  },

  setShowFrustum: (show) => set({ showFrustum: show }),
  setShowLightRange: (show) => set({ showLightRange: show }),
  setShowGrid: (show) => set({ showGrid: show }),

  init: () => {
    const storedSchemes = loadSchemesFromStorage();
    const currentSchemeId = loadCurrentSchemeIdFromStorage();

    let schemes = storedSchemes.length > 0 ? storedSchemes : defaultSchemes;
    let currentScheme: StudioScheme | null = null;

    if (currentSchemeId) {
      currentScheme = schemes.find((s) => s.id === currentSchemeId) || null;
    }

    if (!currentScheme && schemes.length > 0) {
      currentScheme = schemes[0];
    }

    if (storedSchemes.length === 0) {
      saveSchemesToStorage(defaultSchemes);
    }

    set({
      schemes,
      currentScheme,
      devices: currentScheme ? [...currentScheme.devices] : [],
      studioSize: currentScheme ? { ...currentScheme.studioSize } : { width: 10, depth: 8 },
      history: currentScheme ? [[...currentScheme.devices]] : [[]],
      historyIndex: 0,
    });

    get().runDetection();
  },
}));
