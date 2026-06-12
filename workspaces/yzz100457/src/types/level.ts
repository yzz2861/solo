import type { HexDirection, GarbageType, TerrainType, CurrentZone, GarbagePatch, SupplyPoint, DangerZone, Boat, HexCoord } from './game';

export interface LevelTile {
  q: number;
  r: number;
  terrain: TerrainType;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  totalTurns: number;
  tiles: LevelTile[];
  currents: CurrentZone[];
  garbage: GarbagePatch[];
  supplyPoints: SupplyPoint[];
  dangerZones: DangerZone[];
  boats: Omit<Boat, 'currentLoad' | 'route'>[];
  isPreset: boolean;
  createdAt: number;
}

export type EditorTool = 'terrain' | 'current' | 'garbage' | 'supply' | 'danger' | 'boat' | 'eraser';

export interface EditorState {
  level: Level;
  activeTool: EditorTool;
  terrainBrush: TerrainType;
  currentDirection: HexDirection;
  currentStrength: number;
  garbageType: GarbageType;
  garbageAmount: number;
  dangerReason: string;
  boatCapacity: number;
  boatName: string;
  boatColor: string;
}

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  water: '#1a5276',
  shallow: '#2e86c1',
  coast: '#e8d5b7',
  land: '#5d4e37',
};

export const GARBAGE_COLORS: Record<GarbageType, string> = {
  floating_plastic: '#2ecc71',
  shoreline_foam: '#ecf0f1',
  large_debris: '#e67e22',
};

export const GARBAGE_LABELS: Record<GarbageType, string> = {
  floating_plastic: '漂浮塑料',
  shoreline_foam: '靠岸泡沫',
  large_debris: '大件垃圾',
};

export const GARBAGE_CAPACITY_MULTIPLIER: Record<GarbageType, number> = {
  floating_plastic: 1,
  shoreline_foam: 1,
  large_debris: 3,
};

export const DIRECTION_LABELS: Record<HexDirection, string> = {
  ne: '东北',
  e: '东',
  se: '东南',
  sw: '西南',
  w: '西',
  nw: '西北',
};

export const BOAT_COLORS = ['#00d4aa', '#ff6b35', '#9b59b6', '#f1c40f', '#3498db'];

export const DEFAULT_TILE_TERRAIN: TerrainType = 'water';

export function createEmptyLevel(): Level {
  const tiles: LevelTile[] = [];
  for (let r = 0; r < 8; r++) {
    for (let q = 0; q < 10; q++) {
      tiles.push({ q, r, terrain: 'water' });
    }
  }
  return {
    id: `level_${Date.now()}`,
    name: '新关卡',
    description: '',
    width: 10,
    height: 8,
    totalTurns: 10,
    tiles,
    currents: [],
    garbage: [],
    supplyPoints: [],
    dangerZones: [],
    boats: [],
    isPreset: false,
    createdAt: Date.now(),
  };
}

export function levelToHexCoord(tiles: LevelTile[]): Set<string> {
  const set = new Set<string>();
  for (const t of tiles) {
    set.add(`${t.q},${t.r}`);
  }
  return set;
}

export function findTile(tiles: LevelTile[], q: number, r: number): LevelTile | undefined {
  return tiles.find(t => t.q === q && t.r === r);
}

export function nextGarbageId(): string {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function nextBoatId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function hexCoordKey(q: number, r: number): string {
  return `${q},${r}`;
}
