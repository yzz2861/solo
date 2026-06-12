import type { CurrentZone, GarbagePatch, HexDirection, GarbageMovement } from '@/types/game';
import { HEX_DIRECTIONS, hexNeighbor } from './hex';

export function applyCurrents(
  garbage: GarbagePatch[],
  currents: CurrentZone[],
  validTiles: Set<string>
): { moved: GarbagePatch[]; movements: GarbageMovement[] } {
  const movements: GarbageMovement[] = [];
  const moved = garbage.map(g => {
    if (g.type !== 'floating_plastic') return g;
    const applicableCurrents = currents.filter(c => c.q === g.q && c.r === g.r);
    if (applicableCurrents.length === 0) return g;
    const netDir = combineCurrents(applicableCurrents);
    if (!netDir) return g;
    let newQ = g.q;
    let newR = g.r;
    const steps = Math.min(applicableCurrents.reduce((max, c) => Math.max(max, c.strength), 0), 2);
    for (let i = 0; i < steps; i++) {
      const next = hexNeighbor(newQ, newR, netDir);
      if (validTiles.has(`${next.q},${next.r}`)) {
        newQ = next.q;
        newR = next.r;
      } else {
        break;
      }
    }
    if (newQ !== g.q || newR !== g.r) {
      movements.push({ garbageId: g.id, fromQ: g.q, fromR: g.r, toQ: newQ, toR: newR });
      return { ...g, q: newQ, r: newR };
    }
    return g;
  });
  return { moved, movements };
}

function combineCurrents(currents: CurrentZone[]): HexDirection | null {
  if (currents.length === 0) return null;
  if (currents.length === 1) return currents[0].direction;
  let dx = 0;
  let dy = 0;
  for (const c of currents) {
    const d = HEX_DIRECTIONS[c.direction];
    const px = Math.sqrt(3) * d.q + (Math.sqrt(3) / 2) * d.r;
    const py = 1.5 * d.r;
    dx += px * c.strength;
    dy += py * c.strength;
  }
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const sector = ((angle + 210) % 360 + 360) % 360;
  const dirs: HexDirection[] = ['nw', 'w', 'sw', 'se', 'e', 'ne'];
  const idx = Math.round(sector / 60) % 6;
  return dirs[idx];
}

export function getCurrentsAt(q: number, r: number, currents: CurrentZone[]): CurrentZone[] {
  return currents.filter(c => c.q === q && c.r === r);
}
