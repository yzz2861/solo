import type { RadiusEntry } from '@/types';

export const bilinearInterpolateCapacity = (
  table: RadiusEntry[],
  armLength: number,
  radius: number
): number | null => {
  const armLengths = Array.from(new Set(table.map(e => e.armLength))).sort((a, b) => a - b);
  if (armLengths.length === 0) return null;

  if (armLength < armLengths[0]) return null;
  if (armLength > armLengths[armLengths.length - 1]) {
    armLength = armLengths[armLengths.length - 1];
  }

  let a0 = armLengths[0], a1 = armLengths[armLengths.length - 1];
  for (let i = 0; i < armLengths.length - 1; i++) {
    if (armLength >= armLengths[i] && armLength <= armLengths[i + 1]) {
      a0 = armLengths[i];
      a1 = armLengths[i + 1];
      break;
    }
  }

  const getCapacityAtArm = (al: number, r: number): number | null => {
    const entries = table.filter(e => e.armLength === al).sort((a, b) => a.radius - b.radius);
    if (entries.length === 0) return null;

    if (r <= entries[0].radius) return entries[0].capacity;
    if (r >= entries[entries.length - 1].radius) return null;

    for (let i = 0; i < entries.length - 1; i++) {
      if (r >= entries[i].radius && r <= entries[i + 1].radius) {
        const t = (r - entries[i].radius) / (entries[i + 1].radius - entries[i].radius);
        return entries[i].capacity + t * (entries[i + 1].capacity - entries[i].capacity);
      }
    }
    return null;
  };

  const c0 = getCapacityAtArm(a0, radius);
  const c1 = getCapacityAtArm(a1, radius);

  if (c0 === null && c1 === null) return null;
  if (a0 === a1) return c0 ?? c1;

  const t = (armLength - a0) / (a1 - a0);
  if (c0 === null) return c1;
  if (c1 === null) return c0;
  return c0 + t * (c1 - c0);
};

export const getMaxSafeRadius = (
  table: RadiusEntry[],
  armLength: number,
  capacity: number
): number => {
  const armLengths = Array.from(new Set(table.map(e => e.armLength))).sort((a, b) => a - b);
  if (armLengths.length === 0) return 0;

  const al = Math.min(armLength, armLengths[armLengths.length - 1]);
  const entries = table
    .filter(e => Math.abs(e.armLength - al) < 0.01 || e.armLength <= al)
    .sort((a, b) => b.armLength - a.armLength);

  const closestEntries = entries.length > 0
    ? entries.filter(e => e.armLength === entries[0].armLength).sort((a, b) => a.radius - b.radius)
    : [];

  let maxR = 0;
  for (const e of closestEntries) {
    if (e.capacity >= capacity) {
      maxR = Math.max(maxR, e.radius);
    }
  }
  return maxR;
};
