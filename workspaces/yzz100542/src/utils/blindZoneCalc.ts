import * as THREE from 'three'

export const TRUCK_LENGTH = 8
export const TRUCK_WIDTH = 2.5
export const CAB_LENGTH = 2.5
export const DRIVER_EYE_HEIGHT = 2.8
export const WHEELBASE = 5
export const MIN_TURN_RADIUS = 8

export const RIGHT_SIDE_DEPTH = 3
export const A_PILLAR_ANGLE_START = Math.PI / 5
export const A_PILLAR_ANGLE_END = Math.PI / 2.8
export const A_PILLAR_RANGE = 10
export const INNER_WHEEL_EXTRA = 1.8

export interface BlindZoneResult {
  sideZone: [number, number][]
  apillarZone: [number, number][]
  innerWheelZone: [number, number][]
  combined: [number, number][]
}

function rotatePoint(
  px: number,
  pz: number,
  cx: number,
  cz: number,
  angle: number
): [number, number] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = px - cx
  const dz = pz - cz
  return [cx + dx * cos - dz * sin, cz + dx * sin + dz * cos]
}

function transformToLocal(
  worldX: number,
  worldZ: number,
  truckX: number,
  truckZ: number,
  truckRotation: number
): [number, number] {
  return rotatePoint(worldX, worldZ, truckX, truckZ, -truckRotation)
}

function transformToWorld(
  localX: number,
  localZ: number,
  truckX: number,
  truckZ: number,
  truckRotation: number
): [number, number] {
  return rotatePoint(localX, localZ, truckX, truckZ, truckRotation)
}

export function calculateSideZone(
  truckX: number,
  truckZ: number,
  truckRotation: number
): [number, number][] {
  const hw = TRUCK_WIDTH / 2
  const localPoints: [number, number][] = [
    [hw, -CAB_LENGTH],
    [hw + RIGHT_SIDE_DEPTH, -CAB_LENGTH],
    [hw + RIGHT_SIDE_DEPTH, TRUCK_LENGTH - CAB_LENGTH],
    [hw, TRUCK_LENGTH - CAB_LENGTH],
  ]
  return localPoints.map(([lx, lz]) => transformToWorld(lx, lz, truckX, truckZ, truckRotation))
}

export function calculateAPillarZone(
  truckX: number,
  truckZ: number,
  truckRotation: number
): [number, number][] {
  const hw = TRUCK_WIDTH / 2
  const driverX = hw - 0.3
  const driverZ = -CAB_LENGTH + 0.5

  const points: [number, number][] = [[driverX, driverZ]]

  const steps = 8
  for (let i = 0; i <= steps; i++) {
    const angle = A_PILLAR_ANGLE_START + (A_PILLAR_ANGLE_END - A_PILLAR_ANGLE_START) * (i / steps)
    const px = driverX + Math.sin(angle) * A_PILLAR_RANGE
    const pz = driverZ - Math.cos(angle) * A_PILLAR_RANGE
    points.push([px, pz])
  }
  points.push([driverX, driverZ])

  return points.map(([lx, lz]) => transformToWorld(lx, lz, truckX, truckZ, truckRotation))
}

export function calculateInnerWheelZone(
  truckX: number,
  truckZ: number,
  truckRotation: number,
  turnAngle: number
): [number, number][] {
  if (turnAngle < 0.05) return []

  const hw = TRUCK_WIDTH / 2
  const startAngle = Math.PI / 2
  const endAngle = startAngle - turnAngle

  const rearInnerR = Math.sqrt(Math.max(0.01, MIN_TURN_RADIUS * MIN_TURN_RADIUS - WHEELBASE * WHEELBASE))
  const frontInnerR = MIN_TURN_RADIUS

  const turnCenterX = hw + MIN_TURN_RADIUS
  const turnCenterZ = -CAB_LENGTH + 1

  const points: [number, number][] = []
  const arcSteps = Math.max(8, Math.ceil(turnAngle * 10))

  for (let i = 0; i <= arcSteps; i++) {
    const a = startAngle - (turnAngle * i) / arcSteps
    points.push([
      turnCenterX + frontInnerR * Math.cos(a),
      turnCenterZ + frontInnerR * Math.sin(a),
    ])
  }

  for (let i = arcSteps; i >= 0; i--) {
    const a = startAngle - (turnAngle * i) / arcSteps
    points.push([
      turnCenterX + Math.max(0.5, rearInnerR - INNER_WHEEL_EXTRA) * Math.cos(a),
      turnCenterZ + Math.max(0.5, rearInnerR - INNER_WHEEL_EXTRA) * Math.sin(a),
    ])
  }

  return points.map(([lx, lz]) => transformToWorld(lx, lz, truckX, truckZ, truckRotation))
}

export function calculateAllBlindZones(
  truckX: number,
  truckZ: number,
  truckRotation: number,
  turnAngle: number
): BlindZoneResult {
  const sideZone = calculateSideZone(truckX, truckZ, truckRotation)
  const apillarZone = calculateAPillarZone(truckX, truckZ, truckRotation)
  const innerWheelZone = calculateInnerWheelZone(truckX, truckZ, truckRotation, turnAngle)
  const combined = [...sideZone, ...apillarZone, ...innerWheelZone]

  return { sideZone, apillarZone, innerWheelZone, combined }
}

export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  if (polygon.length < 3) return false
  let inside = false
  const [px, pz] = point
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i]
    const [xj, zj] = polygon[j]
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function isPointInBlindZone(
  point: [number, number],
  blindZones: BlindZoneResult
): boolean {
  return (
    isPointInPolygon(point, blindZones.sideZone) ||
    isPointInPolygon(point, blindZones.apillarZone) ||
    (blindZones.innerWheelZone.length > 0 && isPointInPolygon(point, blindZones.innerWheelZone))
  )
}

export function polygonsOverlap(
  poly1: [number, number][],
  poly2: [number, number][]
): boolean {
  for (const point of poly1) {
    if (isPointInPolygon(point, poly2)) return true
  }
  for (const point of poly2) {
    if (isPointInPolygon(point, poly1)) return true
  }
  return false
}

export function getWalkwayPolygon(
  wx: number,
  wz: number,
  rotation: number,
  width: number,
  length: number
): [number, number][] {
  const hw = width / 2
  const hl = length / 2
  const localPoints: [number, number][] = [
    [-hw, -hl],
    [hw, -hl],
    [hw, hl],
    [-hw, hl],
  ]
  return localPoints.map(([lx, lz]) => rotatePoint(lx, lz, 0, 0, rotation)).map(([rx, rz]) => [
    rx + wx,
    rz + wz,
  ])
}

export function checkLineOfSightBlocked(
  driverWorldX: number,
  driverWorldZ: number,
  targetWorldX: number,
  targetWorldZ: number,
  barriers: Array<{ x: number; z: number; rotation: number; length: number }>
): boolean {
  const dx = targetWorldX - driverWorldX
  const dz = targetWorldZ - driverWorldZ
  const dist = Math.sqrt(dx * dx + dz * dz)
  if (dist < 0.1) return false

  const dirX = dx / dist
  const dirZ = dz / dist

  for (const barrier of barriers) {
    const barrierHalfLen = barrier.length / 2
    const cos = Math.cos(barrier.rotation)
    const sin = Math.sin(barrier.rotation)
    const endX1 = barrier.x - cos * barrierHalfLen
    const endZ1 = barrier.z - sin * barrierHalfLen
    const endX2 = barrier.x + cos * barrierHalfLen
    const endZ2 = barrier.z + sin * barrierHalfLen

    const apX = driverWorldX
    const apZ = driverWorldZ
    const adX = dirX
    const adZ = dirZ

    const bpX = endX1
    const bpZ = endZ1
    const bdX = endX2 - endX1
    const bdZ = endZ2 - endZ1

    const denom = adX * bdZ - adZ * bdX
    if (Math.abs(denom) < 0.0001) continue

    const t = ((bpX - apX) * bdZ - (bpZ - apZ) * bdX) / denom
    const u = ((bpX - apX) * adZ - (bpZ - apZ) * adX) / denom

    if (t > 0 && t < dist && u >= 0 && u <= 1) return true
  }

  return false
}

export { transformToLocal, transformToWorld, rotatePoint }
