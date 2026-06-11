import { Passenger, Position, Guide } from "@/types"
import { isInGuideRange, GUIDE_INFLUENCE_RADIUS } from "./pathfinding"

export const CELL_CAPACITY = 4
export const GUIDE_CAPACITY_BOOST_PER_TIER = 2

export function getCellKey(x: number, y: number): string {
  return `${Math.floor(x)},${Math.floor(y)}`
}

export function getCellCapacityWithGuides(
  x: number,
  y: number,
  guides: Guide[]
): number {
  let capacity = CELL_CAPACITY
  const gx = Math.floor(x)
  const gy = Math.floor(y)
  const guide = isInGuideRange(gx, gy, guides)
  if (guide) {
    const dist = Math.abs(gx - guide.x) + Math.abs(gy - guide.y)
    const tier = guide.influenceRadius - dist
    capacity += GUIDE_CAPACITY_BOOST_PER_TIER + tier
  }
  return capacity
}

export function buildDensityMap(passengers: Passenger[]): Map<string, number> {
  const density = new Map<string, number>()
  for (const p of passengers) {
    if (p.state === "exited") continue
    const key = getCellKey(p.x, p.y)
    density.set(key, (density.get(key) || 0) + 1)
  }
  return density
}

export function getCongestedCells(
  passengers: Passenger[],
  guides?: Guide[]
): Set<string> {
  const density = buildDensityMap(passengers)
  const congested = new Set<string>()
  for (const [key, count] of density) {
    const [x, y] = key.split(",").map(Number)
    const cap = guides ? getCellCapacityWithGuides(x, y, guides) : CELL_CAPACITY
    if (count > cap) {
      congested.add(key)
    }
  }
  return congested
}

export function isCellCongested(
  passengers: Passenger[],
  x: number,
  y: number,
  guides?: Guide[]
): boolean {
  const density = buildDensityMap(passengers)
  const count = density.get(getCellKey(x, y)) || 0
  const cap = guides ? getCellCapacityWithGuides(x, y, guides) : CELL_CAPACITY
  return count > cap
}

export function buildCongestionHeatmap(
  passengers: Passenger[],
  cols: number,
  rows: number
): number[][] {
  const heatmap: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
  const density = buildDensityMap(passengers)
  for (const [key, count] of density) {
    const [x, y] = key.split(",").map(Number)
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      heatmap[y][x] = count
    }
  }
  return heatmap
}

export function getGuidedPassengerCount(passengers: Passenger[], guides: Guide[]): number {
  let count = 0
  for (const p of passengers) {
    if (p.state === "exited") continue
    const guide = isInGuideRange(Math.floor(p.x), Math.floor(p.y), guides)
    if (guide) count++
  }
  return count
}
