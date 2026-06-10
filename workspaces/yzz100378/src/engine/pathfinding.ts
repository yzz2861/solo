import { Position } from "@/types"

export function findPath(
  gridSize: { cols: number; rows: number },
  walls: Set<string>,
  start: Position,
  end: Position,
  blockedCells?: Set<string>
): Position[] | null {
  const key = (p: Position) => `${p.x},${p.y}`

  if (key(start) === key(end)) return []
  if (walls.has(key(end)) || (blockedCells && blockedCells.has(key(end)))) return null

  const openSet: Map<string, { pos: Position; g: number; f: number; parent: Position | null }> = new Map()
  const closedSet: Set<string> = new Set()

  const startKey = key(start)
  const h = (p: Position) => Math.abs(p.x - end.x) + Math.abs(p.y - end.y)
  openSet.set(startKey, { pos: start, g: 0, f: h(start), parent: null })

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

      const g = currentNode!.g + 1
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
