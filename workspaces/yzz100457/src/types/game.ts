export type HexDirection = 'ne' | 'e' | 'se' | 'sw' | 'w' | 'nw';

export type GarbageType = 'floating_plastic' | 'shoreline_foam' | 'large_debris';

export type TerrainType = 'water' | 'shallow' | 'coast' | 'land';

export type GamePhase = 'planning' | 'executing' | 'current' | 'checking' | 'ended';

export interface HexCoord {
  q: number;
  r: number;
}

export interface CurrentZone {
  q: number;
  r: number;
  direction: HexDirection;
  strength: number;
}

export interface GarbagePatch {
  id: string;
  q: number;
  r: number;
  type: GarbageType;
  amount: number;
}

export interface SupplyPoint {
  q: number;
  r: number;
  name: string;
}

export interface DangerZone {
  q: number;
  r: number;
  reason: string;
}

export interface Boat {
  id: string;
  name: string;
  capacity: number;
  currentLoad: number;
  q: number;
  r: number;
  baseSpeed: number;
  route: HexCoord[];
  color: string;
}

export interface BoatAction {
  boatId: string;
  fromQ: number;
  fromR: number;
  toQ: number;
  toR: number;
  salvaged: number;
  salvagedType: GarbageType | null;
  unloaded: number;
}

export interface GarbageMovement {
  garbageId: string;
  fromQ: number;
  fromR: number;
  toQ: number;
  toR: number;
}

export interface TurnRecord {
  turn: number;
  phase: GamePhase;
  actions: BoatAction[];
  movements: GarbageMovement[];
  garbageState: GarbagePatch[];
  boatStates: Boat[];
}

export interface GameStats {
  totalSalvaged: number;
  totalUnloadCount: number;
  perBoatSalvaged: Record<string, number>;
  perBoatUnloadCount: Record<string, number>;
  perTypeSalvaged: Record<GarbageType, number>;
  missedAreas: HexCoord[];
  wastedTrips: { boatId: string; from: HexCoord; to: HexCoord }[];
  bagEstimate: number;
  bagRecommendation: number;
}
