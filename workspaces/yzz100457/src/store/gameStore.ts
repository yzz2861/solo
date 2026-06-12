import { create } from 'zustand';
import type { Boat, CurrentZone, DangerZone, GarbagePatch, GamePhase, GameStats, HexCoord, SupplyPoint, TurnRecord, BoatAction, GarbageMovement } from '@/types/game';
import type { Level, LevelTile } from '@/types/level';
import { applyCurrents } from '@/utils/current';
import { getBoatEffectiveSpeed, canSalvage, calculateStats } from '@/utils/estimation';
import { findTile, hexCoordKey } from '@/types/level';
import { GARBAGE_CAPACITY_MULTIPLIER } from '@/types/level';
import { isAdjacent, hexDistance } from '@/utils/hex';
import { findPath } from '@/utils/pathfinding';

const RESULT_STORAGE_KEY = 'ocean_cleanup_last_result';

interface GameState {
  level: Level | null;
  boats: Boat[];
  garbage: GarbagePatch[];
  currents: CurrentZone[];
  supplyPoints: SupplyPoint[];
  dangerZones: DangerZone[];
  tiles: LevelTile[];
  phase: GamePhase;
  currentTurn: number;
  totalTurns: number;
  selectedBoatId: string | null;
  turnRecords: TurnRecord[];
  stats: GameStats | null;
  validTileKeys: Set<string>;
  initialGarbageCount: number;

  loadLevel: (level: Level) => void;
  selectBoat: (boatId: string | null) => void;
  addRoutePoint: (q: number, r: number) => void;
  removeLastRoutePoint: (boatId: string) => void;
  clearRoute: (boatId: string) => void;
  confirmPlanning: () => void;
  executeTurn: () => void;
  applyCurrentPhase: () => void;
  checkEnd: () => void;
  resetGame: () => void;
  getBlockedSet: () => Set<string>;
  saveResult: () => void;
  loadResult: (levelId: string) => { turnRecords: TurnRecord[]; stats: GameStats; initialGarbageCount: number } | null;
}

export const useGameStore = create<GameState>((set, get) => ({
  level: null,
  boats: [],
  garbage: [],
  currents: [],
  supplyPoints: [],
  dangerZones: [],
  tiles: [],
  phase: 'planning',
  currentTurn: 1,
  totalTurns: 10,
  selectedBoatId: null,
  turnRecords: [],
  stats: null,
  validTileKeys: new Set(),
  initialGarbageCount: 0,

  loadLevel: (level: Level) => {
    const boats: Boat[] = level.boats.map(b => ({
      ...b,
      currentLoad: 0,
      route: [],
    }));
    const validTileKeys = new Set<string>();
    for (const t of level.tiles) {
      if (t.terrain !== 'land') {
        validTileKeys.add(hexCoordKey(t.q, t.r));
      }
    }
    const initialGarbageCount = level.garbage.reduce((sum, g) => sum + g.amount, 0);
    set({
      level,
      boats,
      garbage: [...level.garbage],
      currents: [...level.currents],
      supplyPoints: [...level.supplyPoints],
      dangerZones: [...level.dangerZones],
      tiles: [...level.tiles],
      phase: 'planning',
      currentTurn: 1,
      totalTurns: level.totalTurns,
      selectedBoatId: boats.length > 0 ? boats[0].id : null,
      turnRecords: [],
      stats: null,
      validTileKeys,
      initialGarbageCount,
    });
  },

  selectBoat: (boatId: string | null) => set({ selectedBoatId: boatId }),

  addRoutePoint: (q: number, r: number) => {
    const state = get();
    if (state.phase !== 'planning') return;
    if (!state.selectedBoatId) return;
    const tile = findTile(state.tiles, q, r);
    if (!tile || tile.terrain === 'land') return;
    if (state.dangerZones.some(d => d.q === q && d.r === r)) return;

    const blocked = state.getBlockedSet();
    if (blocked.has(`${q},${r}`)) return;

    set({
      boats: state.boats.map(b => {
        if (b.id !== state.selectedBoatId) return b;
        const tile = findTile(state.tiles, q, r);
        const isShallow = tile?.terrain === 'shallow';
        const effectiveSpeed = getBoatEffectiveSpeed(b, isShallow);
        const maxSteps = Math.max(effectiveSpeed, 1);

        if (b.route.length === 0) {
          const start = { q: b.q, r: b.r };
          const end = { q, r };
          const path = findPath(start, end, blocked, maxSteps);
          if (path.length >= 2) {
            return { ...b, route: path };
          }
          return b;
        }

        const lastPoint = b.route[b.route.length - 1];
        if (!isAdjacent(lastPoint, { q, r })) {
          const path = findPath(lastPoint, { q, r }, blocked, maxSteps - (b.route.length - 1));
          if (path.length >= 2 && b.route.length - 1 + path.length - 1 <= maxSteps) {
            return { ...b, route: [...b.route.slice(0, -1), ...path] };
          }
          return b;
        }
        if (b.route.length - 1 >= maxSteps) return b;
        return { ...b, route: [...b.route, { q, r }] };
      }),
    });
  },

  removeLastRoutePoint: (boatId: string) => {
    set({
      boats: get().boats.map(b => {
        if (b.id !== boatId || b.route.length <= 1) return b;
        return { ...b, route: b.route.slice(0, -1) };
      }),
    });
  },

  clearRoute: (boatId: string) => {
    set({
      boats: get().boats.map(b => {
        if (b.id !== boatId) return b;
        return { ...b, route: [] };
      }),
    });
  },

  confirmPlanning: () => {
    set({ phase: 'executing' });
    get().executeTurn();
  },

  executeTurn: () => {
    const state = get();
    const actions: BoatAction[] = [];
    let updatedBoats = [...state.boats];
    let updatedGarbage = [...state.garbage];

    for (const boat of updatedBoats) {
      if (boat.route.length < 2) continue;

      let currentLoad = boat.currentLoad;
      let currentQ = boat.q;
      let currentR = boat.r;

      for (let i = 1; i < boat.route.length; i++) {
        const next = boat.route[i];
        const fromQ = currentQ;
        const fromR = currentR;
        currentQ = next.q;
        currentR = next.r;

        let salvaged = 0;
        let salvagedType: string | null = null;

        const garbageAtPos = updatedGarbage.filter(g => g.q === currentQ && g.r === currentR);
        for (const g of garbageAtPos) {
          if (currentLoad >= boat.capacity) break;
          const canTake = canSalvage({ ...boat, currentLoad }, g.type, g.amount);
          if (canTake > 0) {
            const capacityNeeded = canTake * GARBAGE_CAPACITY_MULTIPLIER[g.type];
            currentLoad += capacityNeeded;
            salvaged += canTake;
            salvagedType = g.type;
            updatedGarbage = updatedGarbage.map(gg =>
              gg.id === g.id ? { ...gg, amount: gg.amount - canTake } : gg
            ).filter(gg => gg.amount > 0);
          }
        }

        let unloaded = 0;
        const isSupply = state.supplyPoints.some(s => s.q === currentQ && s.r === currentR);
        if (isSupply && currentLoad > 0) {
          unloaded = currentLoad;
          currentLoad = 0;
        }

        if (salvaged > 0 || unloaded > 0 || fromQ !== currentQ || fromR !== currentR) {
          actions.push({
            boatId: boat.id,
            fromQ, fromR,
            toQ: currentQ, toR: currentR,
            salvaged, salvagedType: salvagedType as any,
            unloaded,
          });
        }
      }

      updatedBoats = updatedBoats.map(b =>
        b.id === boat.id ? { ...b, q: currentQ, r: currentR, currentLoad, route: [] } : b
      );
    }

    const turnRecord: TurnRecord = {
      turn: state.currentTurn,
      phase: 'executing',
      actions,
      movements: [],
      garbageState: [...updatedGarbage],
      boatStates: updatedBoats.map(b => ({ ...b })),
    };

    const newRecords = [...state.turnRecords, turnRecord];

    set({
      boats: updatedBoats,
      garbage: updatedGarbage,
      phase: 'current',
      turnRecords: newRecords,
    });

    setTimeout(() => get().applyCurrentPhase(), 300);
  },

  applyCurrentPhase: () => {
    const state = get();
    const { moved, movements } = applyCurrents(state.garbage, state.currents, state.validTileKeys);

    const lastRecord = state.turnRecords[state.turnRecords.length - 1];
    if (lastRecord) {
      lastRecord.movements = movements;
      lastRecord.phase = 'current';
    }

    set({
      garbage: moved,
      turnRecords: [...state.turnRecords],
      phase: 'checking',
    });

    setTimeout(() => get().checkEnd(), 200);
  },

  checkEnd: () => {
    const state = get();
    const allGarbageGone = state.garbage.length === 0;
    const turnsExhausted = state.currentTurn >= state.totalTurns;

    if (allGarbageGone || turnsExhausted) {
      const initialPositions = (state.level?.garbage || []).map(g => ({ q: g.q, r: g.r }));
      const finalPositions = state.garbage.map(g => ({ q: g.q, r: g.r }));
      const stats = calculateStats(state.boats, state.turnRecords, initialPositions, finalPositions);
      set({ phase: 'ended', stats });
      setTimeout(() => get().saveResult(), 50);
      return;
    }

    set({
      phase: 'planning',
      currentTurn: state.currentTurn + 1,
    });
  },

  resetGame: () => {
    const state = get();
    if (state.level) {
      state.loadLevel(state.level);
    }
  },

  getBlockedSet: () => {
    const state = get();
    const blocked = new Set<string>();
    for (const d of state.dangerZones) {
      blocked.add(`${d.q},${d.r}`);
    }
    for (const t of state.tiles) {
      if (t.terrain === 'land') {
        blocked.add(`${t.q},${t.r}`);
      }
    }
    return blocked;
  },

  saveResult: () => {
    const state = get();
    if (!state.level || !state.stats) return;
    try {
      const result = {
        levelId: state.level.id,
        turnRecords: state.turnRecords,
        stats: state.stats,
        initialGarbageCount: state.initialGarbageCount,
        timestamp: Date.now(),
      };
      localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result));
    } catch {}
  },

  loadResult: (levelId: string) => {
    try {
      const data = localStorage.getItem(RESULT_STORAGE_KEY);
      if (!data) return null;
      const result = JSON.parse(data);
      if (result.levelId !== levelId) return null;
      return result;
    } catch {
      return null;
    }
  },
}));
