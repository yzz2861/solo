import type { HexCoord } from '@/types/game';
import { hexNeighbors, hexDistance } from './hex';

interface AStarNode {
  q: number;
  r: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export function findPath(
  start: HexCoord,
  end: HexCoord,
  blocked: Set<string>,
  maxSteps: number = 20
): HexCoord[] {
  if (start.q === end.q && start.r === end.r) return [start];
  const startKey = `${start.q},${start.r}`;
  const endKey = `${end.q},${end.r}`;
  if (blocked.has(endKey)) return [];

  const open: AStarNode[] = [{
    q: start.q, r: start.r, g: 0,
    h: hexDistance(start, end), f: hexDistance(start, end),
    parent: null
  }];
  const closed = new Set<string>();
  const gScores = new Map<string, number>();
  gScores.set(startKey, 0);

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const currentKey = `${current.q},${current.r}`;

    if (current.q === end.q && current.r === end.r) {
      const path: HexCoord[] = [];
      let node: AStarNode | null = current;
      while (node) {
        path.unshift({ q: node.q, r: node.r });
        node = node.parent;
      }
      return path.slice(0, maxSteps + 1);
    }

    closed.add(currentKey);

    if (current.g >= maxSteps) continue;

    const neighbors = hexNeighbors(current.q, current.r);
    for (const n of neighbors) {
      const nKey = `${n.q},${n.r}`;
      if (blocked.has(nKey) || closed.has(nKey)) continue;

      const g = current.g + 1;
      const existingG = gScores.get(nKey);
      if (existingG !== undefined && g >= existingG) continue;

      const h = hexDistance(n, end);
      const node: AStarNode = { q: n.q, r: n.r, g, h, f: g + h, parent: current };
      gScores.set(nKey, g);

      const existingIdx = open.findIndex(o => o.q === n.q && o.r === n.r);
      if (existingIdx >= 0) {
        open[existingIdx] = node;
      } else {
        open.push(node);
      }
    }
  }

  return [];
}

export function validateRoute(
  route: HexCoord[],
  blocked: Set<string>,
  maxSteps: number
): { valid: boolean; reason: string } {
  if (route.length === 0) return { valid: true, reason: '' };
  if (route.length > maxSteps + 1) return { valid: false, reason: '路线超过最大步数' };
  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const curr = route[i];
    if (hexDistance(prev, curr) !== 1) {
      return { valid: false, reason: `第${i}步不相邻` };
    }
    const key = `${curr.q},${curr.r}`;
    if (blocked.has(key)) {
      return { valid: false, reason: `第${i}步进入危险区` };
    }
  }
  return { valid: true, reason: '' };
}
