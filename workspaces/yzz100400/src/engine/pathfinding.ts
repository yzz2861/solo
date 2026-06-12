import type { HexCoord, HexCellState } from "@/types/game";
import { hexKey, hexNeighbors, hexDistance } from "@/engine/hexUtils";

function movementCost(cell: HexCellState): number {
  switch (cell.terrain) {
    case "deep":
      return 1;
    case "shallow":
      return 2;
    case "reef":
      return 1.5;
    case "safe":
      return 1;
    case "rock":
      return Infinity;
  }
}

export function getAccessibleNeighbors(
  pos: HexCoord,
  cells: Map<string, HexCellState>
): HexCoord[] {
  return hexNeighbors(pos.q, pos.r).filter((n) => {
    const key = hexKey(n.q, n.r);
    const cell = cells.get(key);
    if (!cell) return false;
    if (cell.isSubmerged) return false;
    if (cell.terrain === "rock") return false;
    return true;
  });
}

export function findPath(
  start: HexCoord,
  goal: HexCoord,
  cells: Map<string, HexCellState>,
  waterLevel: number
): HexCoord[] {
  const startKey = hexKey(start.q, start.r);
  const goalKey = hexKey(goal.q, goal.r);

  const startCell = cells.get(startKey);
  if (!startCell || startCell.isSubmerged) return [];
  const goalCell = cells.get(goalKey);
  if (!goalCell || goalCell.isSubmerged) return [];

  const openSet = new Set<string>([startKey]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(startKey, 0);
  fScore.set(startKey, hexDistance(start, goal));

  while (openSet.size > 0) {
    let currentKey = "";
    let currentF = Infinity;
    for (const key of openSet) {
      const f = fScore.get(key) ?? Infinity;
      if (f < currentF) {
        currentF = f;
        currentKey = key;
      }
    }

    if (currentKey === goalKey) {
      const path: HexCoord[] = [];
      let k: string | undefined = currentKey;
      while (k !== undefined) {
        const [q, r] = k.split(",").map(Number);
        path.unshift({ q, r });
        k = cameFrom.get(k);
      }
      return path;
    }

    openSet.delete(currentKey);

    const [cq, cr] = currentKey.split(",").map(Number);
    const neighbors = hexNeighbors(cq, cr);

    for (const neighbor of neighbors) {
      const nKey = hexKey(neighbor.q, neighbor.r);
      const nCell = cells.get(nKey);
      if (!nCell || nCell.isSubmerged) continue;

      const cost = movementCost(nCell);
      if (cost === Infinity) continue;

      const tentativeG = (gScore.get(currentKey) ?? Infinity) + cost;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + hexDistance(neighbor, goal));
        openSet.add(nKey);
      }
    }
  }

  return [];
}

export function isReachable(
  start: HexCoord,
  goal: HexCoord,
  cells: Map<string, HexCellState>,
  waterLevel: number
): boolean {
  return findPath(start, goal, cells, waterLevel).length > 0;
}

export function estimateTravelTime(path: HexCoord[]): number {
  if (path.length <= 1) return 0;
  return path.length - 1;
}
