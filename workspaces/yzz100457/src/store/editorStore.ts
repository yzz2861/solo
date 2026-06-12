import { create } from 'zustand';
import type { EditorTool, EditorState } from '@/types/level';
import { createEmptyLevel, nextGarbageId, nextBoatId, findTile, hexCoordKey } from '@/types/level';
import { BOAT_COLORS } from '@/types/level';
import type { CurrentZone, GarbagePatch, SupplyPoint, DangerZone, GarbageType, HexDirection, TerrainType } from '@/types/game';

interface EditorStore extends EditorState {
  createNew: () => void;
  loadLevel: (level: any) => void;
  setActiveTool: (tool: EditorTool) => void;
  setTerrainBrush: (terrain: TerrainType) => void;
  setCurrentDirection: (dir: HexDirection) => void;
  setCurrentStrength: (s: number) => void;
  setGarbageType: (t: GarbageType) => void;
  setGarbageAmount: (a: number) => void;
  setDangerReason: (r: string) => void;
  setBoatCapacity: (c: number) => void;
  setBoatName: (n: string) => void;
  setLevelName: (n: string) => void;
  setLevelDescription: (d: string) => void;
  setTotalTurns: (t: number) => void;
  handleHexClick: (q: number, r: number) => void;
  handleHexDrag: (q: number, r: number) => void;
  removeElementAt: (q: number, r: number) => void;
  getLevel: () => any;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  level: createEmptyLevel(),
  activeTool: 'terrain',
  terrainBrush: 'water',
  currentDirection: 'e',
  currentStrength: 1,
  garbageType: 'floating_plastic',
  garbageAmount: 5,
  dangerReason: '危险水域',
  boatCapacity: 15,
  boatName: '',
  boatColor: BOAT_COLORS[0],

  createNew: () => set({ level: createEmptyLevel() }),

  loadLevel: (level: any) => set({ level: { ...level, isPreset: false } }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setTerrainBrush: (terrain) => set({ terrainBrush: terrain }),
  setCurrentDirection: (dir) => set({ currentDirection: dir }),
  setCurrentStrength: (s) => set({ currentStrength: s }),
  setGarbageType: (t) => set({ garbageType: t }),
  setGarbageAmount: (a) => set({ garbageAmount: a }),
  setDangerReason: (r) => set({ dangerReason: r }),
  setBoatCapacity: (c) => set({ boatCapacity: c }),
  setBoatName: (n) => set({ boatName: n }),
  setLevelName: (n) => set({ level: { ...get().level, name: n } }),
  setLevelDescription: (d) => set({ level: { ...get().level, description: d } }),
  setTotalTurns: (t) => set({ level: { ...get().level, totalTurns: t } }),

  handleHexClick: (q, r) => {
    const state = get();
    const level = { ...state.level };

    switch (state.activeTool) {
      case 'terrain': {
        const tiles = level.tiles.map(t =>
          t.q === q && t.r === r ? { ...t, terrain: state.terrainBrush } : t
        );
        set({ level: { ...level, tiles } });
        break;
      }
      case 'current': {
        const existing = level.currents.findIndex(c => c.q === q && c.r === r);
        const newCurrent: CurrentZone = { q, r, direction: state.currentDirection, strength: state.currentStrength };
        const currents = [...level.currents];
        if (existing >= 0) {
          currents[existing] = newCurrent;
        } else {
          currents.push(newCurrent);
        }
        set({ level: { ...level, currents } });
        break;
      }
      case 'garbage': {
        const existingIdx = level.garbage.findIndex(g => g.q === q && g.r === r && g.type === state.garbageType);
        const garbage = [...level.garbage];
        if (existingIdx >= 0) {
          garbage[existingIdx] = { ...garbage[existingIdx], amount: garbage[existingIdx].amount + state.garbageAmount };
        } else {
          garbage.push({ id: nextGarbageId(), q, r, type: state.garbageType, amount: state.garbageAmount });
        }
        set({ level: { ...level, garbage } });
        break;
      }
      case 'supply': {
        if (!level.supplyPoints.some(s => s.q === q && s.r === r)) {
          const supplyPoints = [...level.supplyPoints, { q, r, name: `补给点${level.supplyPoints.length + 1}` }];
          set({ level: { ...level, supplyPoints } });
        }
        break;
      }
      case 'danger': {
        if (!level.dangerZones.some(d => d.q === q && d.r === r)) {
          const dangerZones = [...level.dangerZones, { q, r, reason: state.dangerReason }];
          set({ level: { ...level, dangerZones } });
        }
        break;
      }
      case 'boat': {
        const boatCount = level.boats.length;
        const colorIdx = boatCount % BOAT_COLORS.length;
        const name = state.boatName || `船只${boatCount + 1}`;
        const boat = {
          id: nextBoatId(),
          name,
          capacity: state.boatCapacity,
          currentLoad: 0,
          q, r,
          baseSpeed: 2,
          color: BOAT_COLORS[colorIdx],
        };
        const boats = [...level.boats, boat];
        set({ level: { ...level, boats }, boatName: '' });
        break;
      }
      case 'eraser': {
        state.removeElementAt(q, r);
        break;
      }
    }
  },

  handleHexDrag: (q, r) => {
    const state = get();
    if (state.activeTool === 'terrain') {
      const level = { ...state.level };
      const tiles = level.tiles.map(t =>
        t.q === q && t.r === r ? { ...t, terrain: state.terrainBrush } : t
      );
      set({ level: { ...level, tiles } });
    }
  },

  removeElementAt: (q, r) => {
    const state = get();
    const level = { ...state.level };
    set({
      level: {
        ...level,
        currents: level.currents.filter(c => !(c.q === q && c.r === r)),
        garbage: level.garbage.filter(g => !(g.q === q && g.r === r)),
        supplyPoints: level.supplyPoints.filter(s => !(s.q === q && s.r === r)),
        dangerZones: level.dangerZones.filter(d => !(d.q === q && d.r === r)),
        boats: level.boats.filter(b => !(b.q === q && b.r === r)),
      },
    });
  },

  getLevel: () => {
    const state = get();
    return {
      ...state.level,
      boats: state.level.boats.map(b => ({
        id: b.id,
        name: b.name,
        capacity: b.capacity,
        currentLoad: 0,
        q: b.q,
        r: b.r,
        baseSpeed: b.baseSpeed,
        color: b.color,
      })),
    };
  },
}));
