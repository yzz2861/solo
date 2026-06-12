/**
 * 排队溢出禁区检测
 *
 * 负责检测 AGV（特别是排队和返航状态的车辆）是否进入各种禁区，
 * 包括消防门净空区、行人通道、禁区矩形，以及排队溢出是否阻挡叉车通道。
 */

import type {
  AgvVehicle,
  LayoutEntity,
  AgvParams,
  CorridorParams,
  OverflowWarning,
  OverflowWarningType,
  FireDoorEntity,
  PedestrianEntity,
  ForbiddenEntity,
  WaitZoneEntity,
  Vec2XZ,
} from '../types'
import { distance2D, pointInRect } from '../utils/geometry'
import { generateId } from '../utils/id'

// ---- 辅助函数 ----

/**
 * 从实体列表中筛选指定类型的实体
 */
function filterEntitiesByType<T extends LayoutEntity['type']>(
  entities: LayoutEntity[],
  type: T,
): Extract<LayoutEntity, { type: T }>[] {
  return entities.filter((e) => e.type === type) as Extract<LayoutEntity, { type: T }>[]
}

/**
 * 生成警告去重的 key：基于位置（四舍五入到 0.5 米）和类型
 */
function getWarningKey(type: OverflowWarningType, position: Vec2XZ): string {
  const roundedX = Math.round(position.x * 2) / 2
  const roundedZ = Math.round(position.z * 2) / 2
  return `${type}:${roundedX},${roundedZ}`
}

/**
 * 检查 AGV 是否在消防门净空圆内
 */
function checkFireDoor(
  agv: AgvVehicle,
  fireDoors: FireDoorEntity[],
  warnings: Map<string, OverflowWarning>,
): void {
  for (const door of fireDoors) {
    const dist = distance2D(agv.position, door.position)
    if (dist < door.clearanceRadius) {
      const key = getWarningKey('fireDoor', door.position)
      if (!warnings.has(key)) {
        warnings.set(key, {
          id: generateId('warn'),
          entityId: door.id,
          entityName: door.name,
          type: 'fireDoor',
          severity: 'danger',
          message: `AGV 阻挡消防门 "${door.name}" 净空区（距离 ${dist.toFixed(1)}m < ${door.clearanceRadius}m）`,
          position: { ...door.position },
          x: door.position.x,
          z: door.position.z,
        })
      }
    }
  }
}

/**
 * 检查 AGV 是否进入行人通道
 */
function checkPedestrianLane(
  agv: AgvVehicle,
  pedestrianLanes: PedestrianEntity[],
  warnings: Map<string, OverflowWarning>,
): void {
  for (const lane of pedestrianLanes) {
    const inside = pointInRect(
      agv.position.x,
      agv.position.z,
      lane.position.x,
      lane.position.z,
      lane.width,
      lane.length,
      lane.rotation,
    )
    if (inside) {
      const key = getWarningKey('pedestrian', lane.position)
      if (!warnings.has(key)) {
        warnings.set(key, {
          id: generateId('warn'),
          entityId: lane.id,
          entityName: lane.name,
          type: 'pedestrian',
          severity: 'warning',
          message: `AGV 进入行人通道 "${lane.name}"`,
          position: { ...lane.position },
          x: lane.position.x,
          z: lane.position.z,
        })
      }
    }
  }
}

/**
 * 检查 AGV 是否进入禁区
 */
function checkForbiddenZone(
  agv: AgvVehicle,
  forbiddenZones: ForbiddenEntity[],
  warnings: Map<string, OverflowWarning>,
): void {
  for (const zone of forbiddenZones) {
    const inside = pointInRect(
      agv.position.x,
      agv.position.z,
      zone.position.x,
      zone.position.z,
      zone.width,
      zone.depth,
      zone.rotation,
    )
    if (inside) {
      const key = getWarningKey('forbidden', zone.position)
      if (!warnings.has(key)) {
        warnings.set(key, {
          id: generateId('warn'),
          entityId: zone.id,
          entityName: zone.name,
          type: 'forbidden',
          severity: 'danger',
          message: `AGV 进入禁区 "${zone.name}"：${zone.reason}`,
          position: { ...zone.position },
          x: zone.position.x,
          z: zone.position.z,
        })
      }
    }
  }
}

/**
 * 检查排队溢出是否阻挡叉车通道
 *
 * 逻辑：
 * 1. 统计排队车辆数量（queuing + returning 状态）
 * 2. 如果超过等待区容量，计算溢出车辆
 * 3. 检查溢出车辆的 x-z 距离是否进入叉车通道范围
 */
function checkQueueOverflow(
  agvList: AgvVehicle[],
  waitZone: WaitZoneEntity | null,
  corridorParams: CorridorParams,
  agvParams: AgvParams,
  warnings: Map<string, OverflowWarning>,
): void {
  if (!waitZone) return

  // 统计排队中车辆
  const queuingAgvs = agvList.filter((a) => a.state === 'queuing' || a.state === 'returning')
  const queueLength = queuingAgvs.length
  const capacity = waitZone.capacity

  // 检查是否溢出
  if (queueLength > capacity) {
    const overflowCount = queueLength - capacity

    // 找出溢出的车辆（queuePosition >= capacity 的）
    const overflowAgvs = queuingAgvs.filter((a) => a.queuePosition >= capacity)

    for (const agv of overflowAgvs) {
      // 计算相对于等待区的 x 方向距离（排队方向假设沿 x 轴负方向延伸）
      const dx = waitZone.position.x - agv.position.x
      const dz = Math.abs(waitZone.position.z - agv.position.z)

      // 叉车通道宽度检测：假设叉车通道在等待区的 z 方向两侧
      // 如果车辆在 z 方向偏离等待区中心超过一定距离，视为阻挡叉车通道
      const forkliftClearance = corridorParams.forkliftWidth / 2 + agvParams.widthMeters / 2
      const mainCorridorEdge = corridorParams.mainCorridorWidth / 2

      // 检查是否进入叉车通道区域
      // 这里简化判断：如果 z 方向距离超过主通道一半但小于叉车通道边缘
      const inForkliftZone = dz > mainCorridorEdge && dz < mainCorridorEdge + corridorParams.forkliftWidth

      // 或者 x 方向排队过长，延伸到了其他区域
      const queueExtendTooFar = dx > capacity * 2.5 // 每辆车占 2.5 米

      if (inForkliftZone || queueExtendTooFar) {
        const key = getWarningKey('forklift', agv.position)
        if (!warnings.has(key)) {
          warnings.set(key, {
            id: generateId('warn'),
            entityId: waitZone.id,
            entityName: waitZone.name,
            type: 'forklift',
            severity: 'danger',
            message: `排队溢出阻挡叉车通道：队列长度 ${queueLength} > 容量 ${capacity}，溢出 ${overflowCount} 辆`,
            position: { ...agv.position },
            x: agv.position.x,
            z: agv.position.z,
            relatedEntityIds: overflowAgvs.map((a) => a.id),
          })
        }
      }
    }
  }
}

// ---- 主函数 ----

/**
 * 检测 AGV 排队溢出和禁区违规
 *
 * @param agvList AGV 车辆列表
 * @param entities 布局实体列表
 * @param corridorParams 通道参数
 * @param agvParams AGV 车辆参数
 * @returns 溢出警告列表（已去重）
 */
export function detectOverflows(
  agvList: AgvVehicle[],
  entities: LayoutEntity[],
  corridorParams: CorridorParams,
  agvParams: AgvParams,
): OverflowWarning[] {
  // 使用 Map 进行去重，key 为 类型+位置
  const warnings = new Map<string, OverflowWarning>()

  // 获取相关实体
  const fireDoors = filterEntitiesByType(entities, 'fireDoor')
  const pedestrianLanes = filterEntitiesByType(entities, 'pedestrian')
  const forbiddenZones = filterEntitiesByType(entities, 'forbidden')
  const waitZone = filterEntitiesByType(entities, 'waitZone')[0] || null

  // 遍历所有 AGV（重点关注 queuing 和 returning 状态）
  for (const agv of agvList) {
    // 只检查非工作状态的车辆，因为工作状态的车辆应该在路径上
    // 但为了安全起见，也可以检查所有车辆
    if (agv.state === 'working' || agv.state === 'charging' || agv.state === 'done') {
      continue
    }

    // 检查消防门
    checkFireDoor(agv, fireDoors, warnings)

    // 检查行人通道
    checkPedestrianLane(agv, pedestrianLanes, warnings)

    // 检查禁区
    checkForbiddenZone(agv, forbiddenZones, warnings)
  }

  // 检查排队溢出是否阻挡叉车通道
  checkQueueOverflow(agvList, waitZone, corridorParams, agvParams, warnings)

  // 转换为数组返回
  return Array.from(warnings.values())
}
