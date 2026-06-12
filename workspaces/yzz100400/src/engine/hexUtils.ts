const SQRT3 = Math.sqrt(3);

export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function parseHexKey(key: string): { q: number; r: number } {
  const parts = key.split(",");
  return { q: parseInt(parts[0], 10), r: parseInt(parts[1], 10) };
}

export function hexNeighbors(q: number, r: number): { q: number; r: number }[] {
  return [
    { q: q + 1, r: r },
    { q: q - 1, r: r },
    { q: q, r: r + 1 },
    { q: q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 },
  ];
}

export function hexDistance(
  a: { q: number; r: number },
  b: { q: number; r: number }
): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  );
}

export function hexToPixel(
  q: number,
  r: number,
  size: number
): { x: number; y: number } {
  return {
    x: size * (SQRT3 * q + (SQRT3 / 2) * r),
    y: size * ((3 / 2) * r),
  };
}

export function pixelToHex(
  x: number,
  y: number,
  size: number
): { q: number; r: number } {
  const fq = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const fr = ((2 / 3) * y) / size;
  return cubeRound(fq, fr);
}

function cubeRound(fq: number, fr: number): { q: number; r: number } {
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);

  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);

  if (dq > dr && dq > ds) {
    q = -r - s;
  } else if (dr > ds) {
    r = -q - s;
  }

  return { q, r };
}

export function generateHexGrid(
  width: number,
  height: number
): { q: number; r: number }[] {
  const result: { q: number; r: number }[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const q = col - Math.floor(row / 2);
      const r = row;
      result.push({ q, r });
    }
  }
  return result;
}

export function hexCorners(
  cx: number,
  cy: number,
  size: number
): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: cx + size * Math.cos(angleRad),
      y: cy + size * Math.sin(angleRad),
    });
  }
  return corners;
}
