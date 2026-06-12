import { create } from "zustand";
import type { PlaygroundComponent, RiskItem, Scheme, ComponentType, LengthUnit } from "@/types";
import { COMPONENT_DEFAULTS } from "@/types";
import { detectRisks } from "@/utils/riskDetection";

interface PlaygroundState {
  components: PlaygroundComponent[];
  selectedId: string | null;
  risks: RiskItem[];
  schemeName: string;
  maxHeight: number;
  bufferRange: number;
  globalUnit: LengthUnit;

  addComponent: (type: ComponentType) => void;
  removeComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  updatePosition: (id: string, x: number, y: number, z: number) => void;
  updateDimensions: (id: string, width: number, height: number, depth: number) => void;
  updateBufferZone: (id: string, buffer: number) => void;
  updateUnit: (id: string, unit: LengthUnit) => void;
  updateName: (id: string, name: string) => void;
  updateGlobalUnit: (unit: LengthUnit) => void;
  setSchemeName: (name: string) => void;
  setMaxHeight: (h: number) => void;
  setBufferRange: (r: number) => void;
  recalculateRisks: () => void;
  saveScheme: () => void;
  loadScheme: (scheme: Scheme) => void;
  loadSchemes: () => Scheme[];
  deleteScheme: (id: string) => void;
  clearScene: () => void;
}

let nextId = 1;

const STORAGE_SCHEMES_KEY = "playground_schemes";
const STORAGE_CURRENT_KEY = "playground_current";

export const usePlaygroundStore = create<PlaygroundState>((set, get) => ({
  components: [],
  selectedId: null,
  risks: [],
  schemeName: "未命名方案",
  maxHeight: 300,
  bufferRange: 100,
  globalUnit: "cm",

  addComponent: (type) => {
    const defaults = COMPONENT_DEFAULTS[type];
    const count = get().components.filter((c) => c.type === type).length + 1;
    const comp: PlaygroundComponent = {
      id: `comp_${nextId++}_${Date.now()}`,
      type,
      position: { x: 0, y: 0, z: 0 },
      dimensions: { ...defaults.dimensions },
      bufferZone: type === "softpad" ? 30 : 0,
      unit: get().globalUnit,
      name: `${defaults.label} ${count}`,
    };
    const newComponents = [...get().components, comp];
    const newRisks = detectRisks(newComponents, get().maxHeight, get().bufferRange);
    set({ components: newComponents, risks: newRisks });
  },

  removeComponent: (id) => {
    const newComponents = get().components.filter((c) => c.id !== id);
    const newRisks = detectRisks(newComponents, get().maxHeight, get().bufferRange);
    set({
      components: newComponents,
      risks: newRisks,
      selectedId: get().selectedId === id ? null : get().selectedId,
    });
  },

  selectComponent: (id) => set({ selectedId: id }),

  updatePosition: (id, x, y, z) => {
    const newComponents = get().components.map((c) =>
      c.id === id ? { ...c, position: { x, y, z } } : c
    );
    const newRisks = detectRisks(newComponents, get().maxHeight, get().bufferRange);
    set({ components: newComponents, risks: newRisks });
  },

  updateDimensions: (id, width, height, depth) => {
    const newComponents = get().components.map((c) =>
      c.id === id ? { ...c, dimensions: { width, height, depth } } : c
    );
    const newRisks = detectRisks(newComponents, get().maxHeight, get().bufferRange);
    set({ components: newComponents, risks: newRisks });
  },

  updateBufferZone: (id, buffer) => {
    const newComponents = get().components.map((c) =>
      c.id === id ? { ...c, bufferZone: buffer } : c
    );
    const newRisks = detectRisks(newComponents, get().maxHeight, get().bufferRange);
    set({ components: newComponents, risks: newRisks });
  },

  updateUnit: (id, unit) => {
    const newComponents = get().components.map((c) =>
      c.id === id ? { ...c, unit } : c
    );
    const newRisks = detectRisks(newComponents, get().maxHeight, get().bufferRange);
    set({ components: newComponents, risks: newRisks });
  },

  updateName: (id, name) => {
    set({
      components: get().components.map((c) =>
        c.id === id ? { ...c, name } : c
      ),
    });
  },

  updateGlobalUnit: (unit) => {
    const newComponents = get().components.map((c) => ({ ...c, unit }));
    set({ components: newComponents, globalUnit: unit });
  },

  setSchemeName: (name) => set({ schemeName: name }),
  setMaxHeight: (h) => {
    const newRisks = detectRisks(get().components, h, get().bufferRange);
    set({ maxHeight: h, risks: newRisks });
  },
  setBufferRange: (r) => {
    const newRisks = detectRisks(get().components, get().maxHeight, r);
    set({ bufferRange: r, risks: newRisks });
  },

  recalculateRisks: () => {
    const { components, maxHeight, bufferRange } = get();
    set({ risks: detectRisks(components, maxHeight, bufferRange) });
  },

  saveScheme: () => {
    const { components, schemeName, maxHeight, bufferRange } = get();
    const scheme: Scheme = {
      id: `scheme_${Date.now()}`,
      name: schemeName,
      components,
      maxHeight,
      bufferRange,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const existing: Scheme[] = JSON.parse(localStorage.getItem(STORAGE_SCHEMES_KEY) || "[]");
    existing.push(scheme);
    localStorage.setItem(STORAGE_SCHEMES_KEY, JSON.stringify(existing));
    localStorage.setItem(STORAGE_CURRENT_KEY, JSON.stringify(scheme));
  },

  loadScheme: (scheme) => {
    set({
      components: scheme.components,
      schemeName: scheme.name,
      maxHeight: scheme.maxHeight,
      bufferRange: scheme.bufferRange,
      selectedId: null,
    });
    const newRisks = detectRisks(scheme.components, scheme.maxHeight, scheme.bufferRange);
    set({ risks: newRisks });
  },

  loadSchemes: () => {
    return JSON.parse(localStorage.getItem(STORAGE_SCHEMES_KEY) || "[]") as Scheme[];
  },

  deleteScheme: (id) => {
    const existing: Scheme[] = JSON.parse(localStorage.getItem(STORAGE_SCHEMES_KEY) || "[]");
    const filtered = existing.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_SCHEMES_KEY, JSON.stringify(filtered));
  },

  clearScene: () => {
    set({ components: [], selectedId: null, risks: [], schemeName: "未命名方案" });
  },
}));
