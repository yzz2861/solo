import type {
  TidalCurve,
  TidalStep,
  TidalWindow,
  HexCellState,
  HexCoord,
  WindowStatus,
} from "@/types/game";
import { hexKey, hexDistance } from "@/engine/hexUtils";

export function getWaterLevelAtTurn(
  curve: TidalCurve,
  turn: number
): number {
  const steps = curve.steps;
  if (steps.length === 0) return 0;

  if (turn <= steps[0].turn) return steps[0].waterLevel;
  if (turn >= steps[steps.length - 1].turn) return steps[steps.length - 1].waterLevel;

  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i];
    const b = steps[i + 1];
    if (turn >= a.turn && turn <= b.turn) {
      const t = (turn - a.turn) / (b.turn - a.turn);
      return a.waterLevel + t * (b.waterLevel - a.waterLevel);
    }
  }

  return steps[steps.length - 1].waterLevel;
}

export function updateCellWaterLevels(
  cells: Map<string, HexCellState>,
  waterLevel: number
): Map<string, HexCellState> {
  const result = new Map<string, HexCellState>();
  for (const [key, cell] of cells) {
    const currentWaterLevel = waterLevel;
    const isSubmerged = currentWaterLevel >= cell.baseElevation;
    result.set(key, { ...cell, currentWaterLevel, isSubmerged });
  }
  return result;
}

export function checkTidalWindow(
  window: TidalWindow,
  currentTurn: number
): WindowStatus {
  if (currentTurn < window.startTurn) return "optimal";
  if (currentTurn >= window.startTurn && currentTurn <= window.endTurn - 2) return "optimal";
  if (currentTurn >= window.endTurn - 2 && currentTurn < window.endTurn) return "closing";
  return "missed";
}

function isPassable(cell: HexCellState): boolean {
  return !cell.isSubmerged && cell.terrain !== "rock";
}

function findReachableCells(
  start: HexCoord,
  cells: Map<string, HexCellState>
): Set<string> {
  const visited = new Set<string>();
  const queue: HexCoord[] = [start];
  visited.add(hexKey(start.q, start.r));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = hexKey(current.q, current.r);
    const currentCell = cells.get(currentKey);
    if (!currentCell || !isPassable(currentCell)) continue;

    const directions = [
      { q: 1, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: 1 },
      { q: 0, r: -1 },
      { q: 1, r: -1 },
      { q: -1, r: 1 },
    ];

    for (const dir of directions) {
      const nq = current.q + dir.q;
      const nr = current.r + dir.r;
      const nKey = hexKey(nq, nr);
      if (visited.has(nKey)) continue;
      const neighbor = cells.get(nKey);
      if (!neighbor) continue;
      visited.add(nKey);
      if (isPassable(neighbor)) {
        queue.push({ q: nq, r: nr });
      }
    }
  }

  return visited;
}

export function findTidalWindowsForRoute(
  start: HexCoord,
  safeZones: HexCoord[],
  cells: Map<string, HexCellState>,
  curve: TidalCurve,
  currentTurn: number
): TidalWindow[] {
  const windows: TidalWindow[] = [];

  const maxTurn = curve.steps[curve.steps.length - 1].turn;
  const startKey = hexKey(start.q, start.r);

  for (const zone of safeZones) {
    const zoneKey = hexKey(zone.q, zone.r);
    let startTurn = -1;
    let endTurn = -1;
    let wasReachable = false;

    for (let turn = currentTurn; turn <= maxTurn; turn++) {
      const waterLevel = getWaterLevelAtTurn(curve, turn);
      const updatedCells = updateCellWaterLevels(cells, waterLevel);

      const startCell = updatedCells.get(startKey);
      if (!startCell || !isPassable(startCell)) continue;

      const reachable = findReachableCells(start, updatedCells);
      const reachableNow = reachable.has(zoneKey);

      if (reachableNow) {
        if (!wasReachable) {
          startTurn = turn;
        }
        endTurn = turn;
        wasReachable = true;
      } else if (wasReachable) {
        windows.push({
          startTurn,
          endTurn,
          description: `Route to safe zone (${zone.q},${zone.r})`,
          affectedCells: [zoneKey],
        });
        wasReachable = false;
      }
    }

    if (wasReachable) {
      windows.push({
        startTurn,
        endTurn,
        description: `Route to safe zone (${zone.q},${zone.r})`,
        affectedCells: [zoneKey],
      });
    }
  }

  return windows;
}
