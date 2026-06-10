import { Passenger, Position } from "@/types"

export const CELL_CAPACITY = 4

export function getCellKey(x: number, y: number): string {
  return `${Math.floor(x)},${Math.floor(y)}`
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

export function getCongestedCells(passengers: Passenger[]): Set<string> {
  const density = buildDensityMap(passengers)
  const congested = new Set<string>()
  for (const [key, count] of density) {
    if (count > CELL_CAPACITY) {
      congested.add(key)
    }
  }
  return congested
}

export function isCellCongested(passengers: Passenger[], x: number, y: number): boolean {
  const density = buildDensityMap(passengers)
  return (density.get(getCellKey(x, y)) || 0) > CELL_CAPACITY
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
