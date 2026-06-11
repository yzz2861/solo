import { Position, Guide, Entrance } from "@/types"

export const GUIDE_INFLUENCE_RADIUS = 2
const GUIDE_DISCOUNT_BASE = 0.45
const GUIDE_DISCOUNT_PER_TIER = 0.15

export function findPath(
  gridSize: { cols: number; rows: number },
  walls: Set<string>,
  start: Position,
  end: Position,
  blockedCells?: Set<string>,
  guides?: Guide[],
  passengerEntranceId?: string,
  entrances?: Entrance[]
): Position[] | null {
  const key = (p: Position) => `${p.x},${p.y}`

  if (key(start) === key(end)) return []
  if (walls.has(key(end)) || (blockedCells && blockedCells.has(key(end)))) return null

  const openSet: Map<string, { pos: Position; g: number; f: number; parent: Position | null }> = new Map()
  const closedSet: Set<string> = new Set()

  const h = (p: Position) => Math.abs(p.x - end.x) + Math.abs(p.y - end.y)
  openSet.set(key(start), { pos: start, g: 0, f: h(start), parent: null })

  const dirs: Position[] = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]

  while (openSet.size > 0) {
    let currentKey = ""
    let currentNode: { pos: Position; g: number; f: number; parent: Position | null } | null = null
    for (const [k, v] of openSet) {
      if (!currentNode || v.f < currentNode.f) {
        currentKey = k
        currentNode = v
      }
    }

    if (currentKey === key(end)) {
      const path: Position[] = []
      let node = currentNode
      while (node && node.parent) {
        path.unshift(node.pos)
        const parentKey = key(node.parent)
        node = openSet.get(parentKey) || null
        if (!node) break
      }
      return path
    }

    openSet.delete(currentKey)
    closedSet.add(currentKey)

    for (const dir of dirs) {
      const nx = currentNode!.pos.x + dir.x
      const ny = currentNode!.pos.y + dir.y
      const nPos = { x: nx, y: ny }
      const nKey = key(nPos)

      if (nx < 0 || ny < 0 || nx >= gridSize.cols || ny >= gridSize.rows) continue
      if (walls.has(nKey) || closedSet.has(nKey)) continue
      if (blockedCells && blockedCells.has(nKey)) continue

      let stepCost = 1.0
      if (guides && guides.length > 0) {
        let bestDiscount = GUIDE_DISCOUNT_BASE
        for (const guide of guides) {
          const manhattan = Math.abs(nx - guide.x) + Math.abs(ny - guide.y)
          if (manhattan <= guide.influenceRadius) {
            const tier = guide.influenceRadius - manhattan
            const discount = GUIDE_DISCOUNT_BASE + tier * GUIDE_DISCOUNT_PER_TIER
            if (discount > bestDiscount) {
              if (passengerEntranceId && guide.targetEntranceId && passengerEntranceId === guide.targetEntranceId) {
                bestDiscount = Math.min(discount + 0.1, 0.7)
              } else {
                bestDiscount = discount
              }
            }
          }
        }
        stepCost = 1.0 - bestDiscount
      }

      const g = currentNode!.g + stepCost
      const existing = openSet.get(nKey)
      if (existing && g >= existing.g) continue

      openSet.set(nKey, { pos: nPos, g, f: g + h(nPos), parent: currentNode!.pos })
    }
  }

  return null
}

export function buildWallSet(walls: Position[], fences: Array<{ x: number; y: number }>): Set<string> {
  const s = new Set<string>()
  for (const w of walls) s.add(`${w.x},${w.y}`)
  for (const f of fences) s.add(`${f.x},${f.y}`)
  return s
}

export function buildBlockedCells(
  escalators: Array<{ id: string; x: number; y: number }>,
  escalatorStates: Record<string, boolean>,
  closedExits: Record<string, boolean>,
  exits: Array<{ id: string; x: number; y: number }>
): Set<string> {
  const s = new Set<string>()
  for (const esc of escalators) {
    if (!escalatorStates[esc.id]) {
      s.add(`${esc.x},${esc.y}`)
    }
  }
  for (const ext of exits) {
    if (closedExits[ext.id]) {
      s.add(`${ext.x},${ext.y}`)
    }
  }
  return s
}

export function isInGuideRange(
  x: number,
  y: number,
  guides: Guide[],
  radius?: number
): Guide | null {
  const r = radius ?? GUIDE_INFLUENCE_RADIUS
  let nearest: Guide | null = null
  let nearestDist = Infinity
  for (const g of guides) {
    const dist = Math.abs(x - g.x) + Math.abs(y - g.y)
    if (dist <= r && dist < nearestDist) {
      nearest = g
      nearestDist = dist
    }
  }
  return nearest
}

export function getGuideInfluenceDiscount(
  x: number,
  y: number,
  guides: Guide[],
  passengerEntranceId?: string
): number {
  let bestDiscount = 0
  for (const g of guides) {
    const dist = Math.abs(x - g.x) + Math.abs(y - g.y)
    if (dist <= g.influenceRadius) {
      const tier = g.influenceRadius - dist
      let discount = GUIDE_DISCOUNT_BASE + tier * GUIDE_DISCOUNT_PER_TIER
      if (passengerEntranceId && g.targetEntranceId && passengerEntranceId === g.targetEntranceId) {
        discount = Math.min(discount + 0.1, 0.7)
      }
      if (discount > bestDiscount) bestDiscount = discount
    }
  }
  return bestDiscount
}

export function buildGuideInfluenceGrid(
  guides: Guide[],
  cols: number,
  rows: number
): number[][] {
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (const g of guides) {
    for (let dy = -g.influenceRadius; dy <= g.influenceRadius; dy++) {
      for (let dx = -g.influenceRadius; dx <= g.influenceRadius; dx++) {
        const x = g.x + dx
        const y = g.y + dy
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue
        const dist = Math.abs(dx) + Math.abs(dy)
        if (dist <= g.influenceRadius) {
          const tier = g.influenceRadius - dist
          grid[y][x] += GUIDE_DISCOUNT_BASE + tier * GUIDE_DISCOUNT_PER_TIER
        }
      }
    }
  }
  return grid
}
