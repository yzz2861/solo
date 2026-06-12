import type { Boat, GarbageType, GameStats, HexCoord, TurnRecord } from '@/types/game';
import { GARBAGE_CAPACITY_MULTIPLIER } from '@/types/level';

const BAG_CAPACITY = 10;

export function calculateStats(
  boats: Boat[],
  turnRecords: TurnRecord[],
  initialGarbagePositions: HexCoord[],
  finalGarbagePositions: HexCoord[]
): GameStats {
  const totalSalvaged = turnRecords.reduce((sum, tr) =>
    sum + tr.actions.reduce((a, b) => a + b.salvaged, 0), 0);
  const totalUnloadCount = turnRecords.reduce((sum, tr) =>
    sum + tr.actions.reduce((a, b) => a + b.unloaded, 0), 0);

  const perBoatSalvaged: Record<string, number> = {};
  const perBoatUnloadCount: Record<string, number> = {};
  for (const boat of boats) {
    perBoatSalvaged[boat.id] = 0;
    perBoatUnloadCount[boat.id] = 0;
  }
  for (const tr of turnRecords) {
    for (const action of tr.actions) {
      perBoatSalvaged[action.boatId] = (perBoatSalvaged[action.boatId] || 0) + action.salvaged;
      perBoatUnloadCount[action.boatId] = (perBoatUnloadCount[action.boatId] || 0) + action.unloaded;
    }
  }

  const perTypeSalvaged: Record<GarbageType, number> = {
    floating_plastic: 0,
    shoreline_foam: 0,
    large_debris: 0,
  };
  for (const tr of turnRecords) {
    for (const action of tr.actions) {
      if (action.salvagedType) {
        perTypeSalvaged[action.salvagedType] += action.salvaged;
      }
    }
  }

  const missedAreas = findMissedAreas(initialGarbagePositions, finalGarbagePositions, turnRecords);
  const wastedTrips = findWastedTrips(turnRecords);

  const totalLoad = boats.reduce((sum, b) => sum + b.currentLoad, 0);
  const bagEstimate = Math.ceil(totalSalvaged / BAG_CAPACITY);
  const bagRecommendation = Math.ceil(bagEstimate * 1.2);

  return {
    totalSalvaged,
    totalUnloadCount,
    perBoatSalvaged,
    perBoatUnloadCount,
    perTypeSalvaged,
    missedAreas,
    wastedTrips,
    bagEstimate,
    bagRecommendation,
  };
}

function findMissedAreas(
  initialPositions: HexCoord[],
  finalPositions: HexCoord[],
  _turnRecords: TurnRecord[]
): HexCoord[] {
  return finalPositions.map(p => ({ q: p.q, r: p.r }));
}

function findWastedTrips(
  turnRecords: TurnRecord[]
): { boatId: string; from: HexCoord; to: HexCoord }[] {
  const wasted: { boatId: string; from: HexCoord; to: HexCoord }[] = [];
  for (const tr of turnRecords) {
    const boatActions = new Map<string, { actions: typeof tr.actions }>();
    for (const action of tr.actions) {
      if (!boatActions.has(action.boatId)) {
        boatActions.set(action.boatId, { actions: [] });
      }
      boatActions.get(action.boatId)!.actions.push(action);
    }
    for (const [boatId, data] of boatActions) {
      for (const action of data.actions) {
        if (action.salvaged === 0 && action.unloaded === 0 && action.fromQ !== action.toQ) {
          wasted.push({
            boatId,
            from: { q: action.fromQ, r: action.fromR },
            to: { q: action.toQ, r: action.toR },
          });
        }
      }
    }
  }
  return wasted;
}

export function estimateBags(totalSalvaged: number): { estimate: number; recommendation: number } {
  const estimate = Math.ceil(totalSalvaged / BAG_CAPACITY);
  const recommendation = Math.ceil(estimate * 1.2);
  return { estimate, recommendation };
}

export function getBoatEffectiveSpeed(boat: Boat, isShallow: boolean): number {
  const loadRatio = boat.currentLoad / boat.capacity;
  let speed = boat.baseSpeed;
  if (loadRatio > 1) return 0;
  if (loadRatio > 0.8) speed = 1;
  if (isShallow) speed = Math.min(speed, 1);
  return speed;
}

export function canSalvage(boat: Boat, garbageType: GarbageType, amount: number): number {
  const multiplier = GARBAGE_CAPACITY_MULTIPLIER[garbageType];
  const required = amount * multiplier;
  const remaining = boat.capacity - boat.currentLoad;
  const canTake = Math.min(required, remaining);
  return Math.floor(canTake / multiplier);
}
