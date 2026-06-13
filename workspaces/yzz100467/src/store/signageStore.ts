import { create } from 'zustand';
import type {
  Scheme,
  Sign,
  FloorPlan,
  ComplianceWarning,
  ConstructionRecord,
  SignType,
  UserRole,
  Vec3,
} from '@/types';
import { createFloorPlan } from '@/data/floorData';
import { FLOOR_LIST, SIGN_TEMPLATES } from '@/types';
import { runComplianceCheck } from '@/utils/complianceEngine';

const STORAGE_KEY = 'indoor-signage-schemes-v1';

interface SignageStore {
  schemes: Record<string, Scheme>;
  activeSchemeId: string | null;
  warnings: ComplianceWarning[];
  selectedSignId: string | null;
  focusSignId: string | null;
  isDragging: boolean;

  init: () => void;
  createScheme: (name: string) => string;
  deleteScheme: (id: string) => void;
  setActiveScheme: (id: string) => void;
  setCurrentFloor: (schemeId: string, floor: number) => void;
  setCurrentRole: (schemeId: string, role: UserRole) => void;

  addSign: (schemeId: string, floor: number, type: SignType, position: Vec3, zone?: string) => void;
  updateSign: (schemeId: string, floor: number, signId: string, patch: Partial<Sign>) => void;
  deleteSign: (schemeId: string, floor: number, signId: string) => void;
  selectSign: (signId: string | null) => void;
  focusSign: (signId: string | null) => void;
  setIsDragging: (v: boolean) => void;
  runCheck: (schemeId: string, floor: number) => void;

  updateConstructionRecord: (schemeId: string, signId: string, patch: Partial<ConstructionRecord>) => void;

  getActiveScheme: () => Scheme | null;
  getCurrentFloorPlan: () => FloorPlan | null;
  getCurrentSigns: () => Sign[];
}

function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

function buildDefaultScheme(name: string): Scheme {
  const floors: Record<number, FloorPlan> = {};
  FLOOR_LIST.forEach((f) => (floors[f] = createFloorPlan(f)));

  const scheme: Scheme = {
    id: uid('scheme'),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentFloor: 1,
    floors,
    signs: {},
    constructionRecords: {},
    currentRole: 'admin',
  };

  FLOOR_LIST.forEach((f) => {
    scheme.signs[f] = [];
  });

  const fp = floors[1];
  fp.rooms.forEach((room, idx) => {
    const tpl = SIGN_TEMPLATES.room_door;
    const sign: Sign = {
      id: uid('sign'),
      type: 'room_door',
      name: room.name,
      position: { x: room.doorPosition.x + 0.4, y: tpl.defaultElevation, z: room.doorPosition.z },
      rotationY: room.doorPosition.z < 10 ? 0 : Math.PI,
      width: tpl.defaultWidth,
      height: tpl.defaultHeight,
      roomId: room.id,
      zone: room.zone,
      material: 'acrylic',
      createdAt: Date.now() + idx,
    };
    scheme.signs[1].push(sign);
    scheme.constructionRecords[sign.id] = { signId: sign.id, status: 'pending' };
  });

  const elevatorSign: Sign = {
    id: uid('sign'),
    type: 'elevator_hall',
    name: `${1}F 楼层指示`,
    position: { x: 4, y: SIGN_TEMPLATES.elevator_hall.defaultElevation, z: 12 },
    rotationY: 0,
    width: SIGN_TEMPLATES.elevator_hall.defaultWidth,
    height: SIGN_TEMPLATES.elevator_hall.defaultHeight,
    zone: '公共区',
    material: 'metal',
    createdAt: Date.now() + 100,
  };
  scheme.signs[1].push(elevatorSign);
  scheme.constructionRecords[elevatorSign.id] = { signId: elevatorSign.id, status: 'pending' };

  const standing: Sign = {
    id: uid('sign'),
    type: 'floor_standing',
    name: '大厅导视牌',
    position: { x: 9, y: SIGN_TEMPLATES.floor_standing.defaultElevation, z: 12 },
    rotationY: 0,
    width: SIGN_TEMPLATES.floor_standing.defaultWidth,
    height: SIGN_TEMPLATES.floor_standing.defaultHeight,
    zone: '公共区',
    material: 'metal',
    createdAt: Date.now() + 101,
  };
  scheme.signs[1].push(standing);
  scheme.constructionRecords[standing.id] = { signId: standing.id, status: 'pending' };

  return scheme;
}

function loadFromStorage(): Record<string, Scheme> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveToStorage(schemes: Record<string, Scheme>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
  } catch {}
}

export const useSignageStore = create<SignageStore>((set, get) => ({
  schemes: {},
  activeSchemeId: null,
  warnings: [],
  selectedSignId: null,
  focusSignId: null,
  isDragging: false,

  init: () => {
    const stored = loadFromStorage();
    if (Object.keys(stored).length === 0) {
      const demo = buildDefaultScheme('A座办公楼导视方案');
      const schemes = { [demo.id]: demo };
      saveToStorage(schemes);
      set({ schemes, activeSchemeId: demo.id });
      get().runCheck(demo.id, demo.currentFloor);
    } else {
      const ids = Object.keys(stored);
      set({ schemes: stored, activeSchemeId: ids[0] });
      const sch = stored[ids[0]];
      get().runCheck(ids[0], sch.currentFloor);
    }
  },

  createScheme: (name) => {
    const scheme = buildDefaultScheme(name);
    const schemes = { ...get().schemes, [scheme.id]: scheme };
    saveToStorage(schemes);
    set({ schemes, activeSchemeId: scheme.id });
    get().runCheck(scheme.id, scheme.currentFloor);
    return scheme.id;
  },

  deleteScheme: (id) => {
    const { [id]: _, ...rest } = get().schemes;
    saveToStorage(rest);
    const remainIds = Object.keys(rest);
    set({
      schemes: rest,
      activeSchemeId: remainIds[0] ?? null,
      warnings: [],
      selectedSignId: null,
    });
  },

  setActiveScheme: (id) => {
    set({ activeSchemeId: id, selectedSignId: null, warnings: [] });
    const sch = get().schemes[id];
    if (sch) get().runCheck(id, sch.currentFloor);
  },

  setCurrentFloor: (schemeId, floor) => {
    const schemes = { ...get().schemes };
    if (schemes[schemeId]) {
      schemes[schemeId] = { ...schemes[schemeId], currentFloor: floor, updatedAt: Date.now() };
      saveToStorage(schemes);
      set({ schemes, selectedSignId: null });
      get().runCheck(schemeId, floor);
    }
  },

  setCurrentRole: (schemeId, role) => {
    const schemes = { ...get().schemes };
    if (schemes[schemeId]) {
      schemes[schemeId] = { ...schemes[schemeId], currentRole: role, updatedAt: Date.now() };
      saveToStorage(schemes);
      set({ schemes });
    }
  },

  addSign: (schemeId, floor, type, position, zone) => {
    const schemes = { ...get().schemes };
    const sch = schemes[schemeId];
    if (!sch) return;
    const tpl = SIGN_TEMPLATES[type];
    const sign: Sign = {
      id: uid('sign'),
      type,
      name: `${tpl.label}-${sch.signs[floor].length + 1}`,
      position: { ...position, y: tpl.defaultElevation },
      rotationY: 0,
      width: tpl.defaultWidth,
      height: tpl.defaultHeight,
      zone: zone || '公共区',
      material: 'acrylic',
      createdAt: Date.now(),
    };
    sch.signs[floor] = [...sch.signs[floor], sign];
    sch.constructionRecords[sign.id] = { signId: sign.id, status: 'pending' };
    sch.updatedAt = Date.now();
    saveToStorage(schemes);
    set({ schemes, selectedSignId: sign.id });
    get().runCheck(schemeId, floor);
  },

  updateSign: (schemeId, floor, signId, patch) => {
    const schemes = { ...get().schemes };
    const sch = schemes[schemeId];
    if (!sch) return;
    sch.signs[floor] = sch.signs[floor].map((s) =>
      s.id === signId ? { ...s, ...patch, position: patch.position ? { ...s.position, ...patch.position } : s.position } : s
    );
    sch.updatedAt = Date.now();
    saveToStorage(schemes);
    set({ schemes });
  },

  deleteSign: (schemeId, floor, signId) => {
    const schemes = { ...get().schemes };
    const sch = schemes[schemeId];
    if (!sch) return;
    sch.signs[floor] = sch.signs[floor].filter((s) => s.id !== signId);
    delete sch.constructionRecords[signId];
    sch.updatedAt = Date.now();
    saveToStorage(schemes);
    set({
      schemes,
      selectedSignId: get().selectedSignId === signId ? null : get().selectedSignId,
    });
    get().runCheck(schemeId, floor);
  },

  selectSign: (signId) => set({ selectedSignId: signId }),
  focusSign: (signId) => set({ focusSignId: signId }),
  setIsDragging: (v) => set({ isDragging: v }),

  runCheck: (schemeId, floor) => {
    const sch = get().schemes[schemeId];
    if (!sch) return;
    const fp = sch.floors[floor];
    const signs = sch.signs[floor] || [];
    const warnings = runComplianceCheck(signs, fp);
    set({ warnings });
  },

  updateConstructionRecord: (schemeId, signId, patch) => {
    const schemes = { ...get().schemes };
    const sch = schemes[schemeId];
    if (!sch) return;
    sch.constructionRecords[signId] = { ...sch.constructionRecords[signId], ...patch };
    sch.updatedAt = Date.now();
    saveToStorage(schemes);
    set({ schemes });
  },

  getActiveScheme: () => {
    const id = get().activeSchemeId;
    return id ? get().schemes[id] ?? null : null;
  },
  getCurrentFloorPlan: () => {
    const sch = get().getActiveScheme();
    return sch ? sch.floors[sch.currentFloor] ?? null : null;
  },
  getCurrentSigns: () => {
    const sch = get().getActiveScheme();
    return sch ? sch.signs[sch.currentFloor] ?? [] : [];
  },
}));
