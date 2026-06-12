import type { HexDirection, HexCoord } from '@/types/game';

export const HEX_DIRECTIONS: Record<HexDirection, HexCoord> = {
  ne: { q: 1, r: -1 },
  e: { q: 1, r: 0 },
  se: { q: 0, r: 1 },
  sw: { q: -1, r: 1 },
  w: { q: -1, r: 0 },
  nw: { q: 0, r: -1 },
};

export const ALL_DIRECTIONS: HexDirection[] = ['ne', 'e', 'se', 'sw', 'w', 'nw'];

export const HEX_SIZE = 32;

export function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * (1.5 * r);
  return { x, y };
}

export function pixelToHex(x: number, y: number): HexCoord {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / HEX_SIZE;
  const r = ((2 / 3) * y) / HEX_SIZE;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function hexNeighbor(q: number, r: number, direction: HexDirection): HexCoord {
  const d = HEX_DIRECTIONS[direction];
  return { q: q + d.q, r: r + d.r };
}

export function hexNeighbors(q: number, r: number): HexCoord[] {
  return ALL_DIRECTIONS.map(d => hexNeighbor(q, r, d));
}

export function getDirection(from: HexCoord, to: HexCoord): HexDirection | null {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  for (const dir of ALL_DIRECTIONS) {
    const d = HEX_DIRECTIONS[dir];
    if (d.q === dq && d.r === dr) return dir;
  }
  return null;
}

export function isAdjacent(a: HexCoord, b: HexCoord): boolean {
  return hexDistance(a, b) === 1;
}

export function hexCorners(cx: number, cy: number, size: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return corners;
}

export function getMapBounds(tiles: { q: number; r: number }[]): {
  minX: number; minY: number; maxX: number; maxY: number;
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of tiles) {
    const { x, y } = hexToPixel(t.q, t.r);
    minX = Math.min(minX, x - HEX_SIZE);
    minY = Math.min(minY, y - HEX_SIZE);
    maxX = Math.max(maxX, x + HEX_SIZE);
    maxY = Math.max(maxY, y + HEX_SIZE);
  }
  return { minX, minY, maxX, maxY };
}

export function moveInDirection(q: number, r: number, direction: HexDirection, steps: number): HexCoord {
  const d = HEX_DIRECTIONS[direction];
  return { q: q + d.q * steps, r: r + d.r * steps };
}
