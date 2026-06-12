import { create } from "zustand";
import type { BridgeModule, AnchorPoint, EnvironmentParams, SafetyWarning, Scheme } from "@/types";

interface StoreState {
  modules: BridgeModule[];
  anchors: AnchorPoint[];
  envParams: EnvironmentParams;
  warnings: SafetyWarning[];
  schemes: Scheme[];
  currentUnit: "m" | "ft";
  selectedModuleId: string | null;
  selectedAnchorId: string | null;
}

interface StoreActions {
  addModule: (module: BridgeModule) => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, updates: Partial<BridgeModule>) => void;
  addAnchor: (anchor: AnchorPoint) => void;
  removeAnchor: (id: string) => void;
  updateAnchor: (id: string, updates: Partial<AnchorPoint>) => void;
  setEnvParams: (params: Partial<EnvironmentParams>) => void;
  setWarnings: (warnings: SafetyWarning[]) => void;
  setUnit: (unit: "m" | "ft") => void;
  setSelectedModule: (id: string | null) => void;
  setSelectedAnchor: (id: string | null) => void;
  saveScheme: (name: string, thumbnail: string) => void;
  loadScheme: (id: string) => void;
  deleteScheme: (id: string) => void;
  clearAll: () => void;
}

const initialState: StoreState = {
  modules: [],
  anchors: [],
  envParams: {
    windDirection: 0,
    windSpeed: 5,
    waveDirection: 0,
    waveHeight: 0.3,
    visitorCount: 20,
    visitorWeight: 75,
  },
  warnings: [],
  schemes: [],
  currentUnit: "m",
  selectedModuleId: null,
  selectedAnchorId: null,
};

export const useStore = create<StoreState & StoreActions>()((set) => ({
  ...initialState,

  addModule: (module) =>
    set((state) => ({ modules: [...state.modules, module] })),

  removeModule: (id) =>
    set((state) => ({ modules: state.modules.filter((m) => m.id !== id) })),

  updateModule: (id, updates) =>
    set((state) => ({
      modules: state.modules.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  addAnchor: (anchor) =>
    set((state) => ({ anchors: [...state.anchors, anchor] })),

  removeAnchor: (id) =>
    set((state) => ({ anchors: state.anchors.filter((a) => a.id !== id) })),

  updateAnchor: (id, updates) =>
    set((state) => ({
      anchors: state.anchors.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  setEnvParams: (params) =>
    set((state) => ({ envParams: { ...state.envParams, ...params } })),

  setWarnings: (warnings) => set({ warnings }),

  setUnit: (unit) => set({ currentUnit: unit }),

  setSelectedModule: (id) => set({ selectedModuleId: id }),

  setSelectedAnchor: (id) => set({ selectedAnchorId: id }),

  saveScheme: (name, thumbnail) =>
    set((state) => ({
      schemes: [
        ...state.schemes,
        {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          modules: [...state.modules],
          anchors: [...state.anchors],
          envParams: { ...state.envParams },
          warnings: [...state.warnings],
          thumbnail,
        },
      ],
    })),

  loadScheme: (id) =>
    set((state) => {
      const scheme = state.schemes.find((s) => s.id === id);
      if (!scheme) return state;
      return {
        modules: [...scheme.modules],
        anchors: [...scheme.anchors],
        envParams: { ...scheme.envParams },
        warnings: [...scheme.warnings],
        selectedModuleId: null,
        selectedAnchorId: null,
      };
    }),

  deleteScheme: (id) =>
    set((state) => ({ schemes: state.schemes.filter((s) => s.id !== id) })),

  clearAll: () => set({ ...initialState, schemes: [] }),
}));
