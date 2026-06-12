/**
 * AGV 排队回充模拟引擎
 *
 * 负责模拟 AGV 车队的工作、低电量返航、排队等待、充电、以及重新投入工作的完整生命周期。
 * 每一次 tick 推进仿真时间 dt * speed 分钟。
 */

import type {
  SimulationState,
  AgvVehicle,
  LayoutEntity,
  AgvParams,
  CorridorParams,
  AgvPathEntity,
  WaitZoneEntity,
  ChargerEntity,
  Vec2XZ,
} from '../types'
import { distance2D, clamp } from '../utils/geometry'
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
 * 获取 AGV 路径实体（取第一条）
 */
function getAgvPath(entities: LayoutEntity[]): AgvPathEntity | null {
  const paths = filterEntitiesByType(entities, 'agvPath')
  return paths.length > 0 ? paths[0] : null
}

/**
 * 获取等待区实体（取第一条）
 */
function getWaitZone(entities: LayoutEntity[]): WaitZoneEntity | null {
  const zones = filterEntitiesByType(entities, 'waitZone')
  return zones.length > 0 ? zones[0] : null
}

/**
 * 获取所有充电桩实体
 */
function getChargers(entities: LayoutEntity[]): ChargerEntity[] {
  return filterEntitiesByType(entities, 'charger')
}

/**
 * 在路径点上均匀分布获取位置
 */
function getPositionAlongPath(path: AgvPathEntity, index: number, total: number): Vec2XZ {
  const points = path.points
  if (points.length === 0) {
    return { x: 0, z: 0 }
  }
  if (points.length === 1) {
    return { ...points[0] }
  }

  // 按索引均匀分布在路径点上
  const pointIndex = Math.floor((index / total) * (points.length - 1))
  return { ...points[pointIndex] }
}

/**
 * 初始化 AGV 车队
 */
function initializeFleet(
  fleetSize: number,
  entities: LayoutEntity[],
  agvParams: AgvParams,
): AgvVehicle[] {
  const path = getAgvPath(entities)
  const agvList: AgvVehicle[] = []

  for (let i = 0; i < fleetSize; i++) {
    let position: Vec2XZ
    let pathIndex = 0

    if (path && path.points.length > 0) {
      // 均匀分布在路径上
      position = getPositionAlongPath(path, i, fleetSize)
      pathIndex = Math.floor((i / fleetSize) * (path.points.length - 1))
    } else {
      // 没有路径时随机分布在原点附近
      position = {
        x: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20,
      }
    }

    // 初始电量在 50%~100% 之间随机
    const battery = 50 + Math.random() * 50

    agvList.push({
      id: generateId('agv'),
      battery,
      state: 'working',
      position,
      rotationY: Math.random() * Math.PI * 2,
      pathIndex,
      queuePosition: -1,
    })
  }

  return agvList
}

/**
 * 沿路径移动 AGV
 */
function moveAlongPath(
  agv: AgvVehicle,
  path: AgvPathEntity,
  distance: number,
): { position: Vec2XZ; pathIndex: number; rotationY: number } {
  const points = path.points
  if (points.length < 2) {
    return { position: agv.position, pathIndex: agv.pathIndex, rotationY: agv.rotationY || 0 }
  }

  let remaining = distance
  let currentIndex = agv.pathIndex
  let currentPos = { ...agv.position }
  let rotationY = agv.rotationY || 0

  while (remaining > 0 && currentIndex < points.length - 1) {
    const nextPoint = points[currentIndex + 1]
    const distToNext = distance2D(currentPos, nextPoint)

    if (distToNext <= remaining) {
      // 到达下一个路径点
      currentPos = { ...nextPoint }
      remaining -= distToNext
      currentIndex++
    } else {
      // 向目标点移动部分距离
      const ratio = remaining / distToNext
      currentPos = {
        x: currentPos.x + (nextPoint.x - currentPos.x) * ratio,
        z: currentPos.z + (nextPoint.z - currentPos.z) * ratio,
      }
      remaining = 0
    }

    // 计算朝向（弧度）
    const dx = points[currentIndex + 1]?.x ?? currentPos.x - currentPos.x
    const dz = points[currentIndex + 1]?.z ?? currentPos.z - currentPos.z
    if (dx !== 0 || dz !== 0) {
      rotationY = Math.atan2(dx, dz)
    }
  }

  // 如果到达路径终点，回到起点循环
  if (currentIndex >= points.length - 1) {
    currentIndex = 0
    currentPos = { ...points[0] }
  }

  return { position: currentPos, pathIndex: currentIndex, rotationY }
}

/**
 * 朝目标点移动
 */
function moveTowardTarget(
  agv: AgvVehicle,
  target: Vec2XZ,
  distance: number,
): { position: Vec2XZ; rotationY: number; arrived: boolean } {
  const dist = distance2D(agv.position, target)
  let newPos: Vec2XZ
  let arrived = false

  if (dist <= distance) {
    newPos = { ...target }
    arrived = true
  } else {
    const ratio = distance / dist
    newPos = {
      x: agv.position.x + (target.x - agv.position.x) * ratio,
      z: agv.position.z + (target.z - agv.position.z) * ratio,
    }
  }

  // 计算朝向
  const dx = target.x - agv.position.x
  const dz = target.z - agv.position.z
  const rotationY = dx !== 0 || dz !== 0 ? Math.atan2(dx, dz) : agv.rotationY || 0

  return { position: newPos, rotationY, arrived }
}

/**
 * 更新排队位置
 */
function updateQueuePositions(
  agvList: AgvVehicle[],
  waitZone: WaitZoneEntity | null,
): AgvVehicle[] {
  if (!waitZone) return agvList

  // 获取所有在排队或返航中的车辆，按到达等待区的顺序（这里用 battery 低的在前模拟优先级）
  const queuingOrReturning = agvList.filter(
    (a) => a.state === 'queuing' || a.state === 'returning',
  )

  // 按电量从低到高排序（电量越低优先级越高）
  queuingOrReturning.sort((a, b) => a.battery - b.battery)

  // 更新 queuePosition
  return agvList.map((agv) => {
    if (agv.state === 'queuing' || agv.state === 'returning') {
      const idx = queuingOrReturning.findIndex((a) => a.id === agv.id)
      return { ...agv, queuePosition: idx }
    }
    return { ...agv, queuePosition: -1 }
  })
}

// ---- 主函数 ----

/**
 * 执行一次仿真步进
 *
 * @param state 当前仿真状态
 * @param entities 布局实体列表
 * @param agvParams AGV 车辆参数
 * @param corridorParams 通道参数
 * @param dt 时间步长（秒），实际仿真时间为 dt * speed 分钟
 * @returns 更新后的仿真状态
 */
export function tickSimulation(
  state: SimulationState,
  entities: LayoutEntity[],
  agvParams: AgvParams,
  corridorParams: CorridorParams,
  dt: number,
): SimulationState {
  // 1. 根据场景确定车队规模
  const fleetSize = state.scenario === 'peak' ? agvParams.peakCount : agvParams.offPeakCount

  // 2. 如果车队为空或规模不符，重新初始化
  let agvList = [...state.agvList]
  if (agvList.length !== fleetSize) {
    agvList = initializeFleet(fleetSize, entities, agvParams)
  }

  // 3. 仿真时间增量（分钟）
  const simMinutes = dt * state.speed
  const path = getAgvPath(entities)
  const waitZone = getWaitZone(entities)
  const chargers = getChargers(entities)

  // 假设 AGV 移动速度为 1.5 m/s，每分钟移动 90 米
  const moveDistancePerMinute = 90
  const moveDistance = moveDistancePerMinute * simMinutes

  // 4. 电量消耗速率：满电按 8 小时（480 分钟）工作时间计算
  const batteryDrainPerMinute = 100 / 480
  const batteryDrain = batteryDrainPerMinute * simMinutes

  // 5. 充电速率：chargeMinutes 分钟充满
  const batteryChargePerMinute = 100 / agvParams.chargeMinutes
  const batteryCharge = batteryChargePerMinute * simMinutes

  // 6. 获取空闲充电桩
  const occupiedChargerIds = new Set(
    agvList.filter((a) => a.state === 'charging').map((a) => a.id),
  )
  const freeChargers = chargers.filter((c) => !c.occupied)

  // 7. 更新每辆 AGV
  agvList = agvList.map((agv) => {
    let newAgv = { ...agv }

    // ---- 状态处理 ----
    switch (agv.state) {
      case 'working': {
        // a. 消耗电量
        newAgv.battery = clamp(newAgv.battery - batteryDrain, 0, 100)

        // b. 电量低于阈值，切换为返航
        if (newAgv.battery <= agvParams.lowBatteryThreshold) {
          newAgv.state = 'returning'
        } else if (path) {
          // 沿路径移动
          const moveResult = moveAlongPath(newAgv, path, moveDistance)
          newAgv.position = moveResult.position
          newAgv.pathIndex = moveResult.pathIndex
          newAgv.rotationY = moveResult.rotationY
        }
        break
      }

      case 'returning': {
        // 继续消耗电量
        newAgv.battery = clamp(newAgv.battery - batteryDrain * 0.5, 0, 100)

        // 朝等待区移动
        if (waitZone) {
          const target = waitZone.position
          const moveResult = moveTowardTarget(newAgv, target, moveDistance)
          newAgv.position = moveResult.position
          newAgv.rotationY = moveResult.rotationY

          // c. 到达等待区附近，切换为排队
          if (moveResult.arrived || distance2D(newAgv.position, target) < 1) {
            newAgv.state = 'queuing'
          }
        }
        break
      }

      case 'queuing': {
        // 排队中缓慢消耗电量
        newAgv.battery = clamp(newAgv.battery - batteryDrain * 0.1, 0, 100)

        // d. 如果是队首且有空闲充电桩，开始充电
        if (newAgv.queuePosition === 0 && freeChargers.length > 0) {
          newAgv.state = 'charging'
          // 占用一个充电桩
          const charger = freeChargers.shift()
          if (charger) {
            newAgv.position = { ...charger.position }
          }
        } else if (waitZone) {
          // 根据排队位置调整在等待区的位置
          const queueOffset = newAgv.queuePosition * 2.5 // 每辆车占 2.5 米
          const target = {
            x: waitZone.position.x - queueOffset,
            z: waitZone.position.z,
          }
          const moveResult = moveTowardTarget(newAgv, target, moveDistance * 0.5)
          newAgv.position = moveResult.position
          newAgv.rotationY = moveResult.rotationY
        }
        break
      }

      case 'charging': {
        // e. 充电中电量匀速回升
        newAgv.battery = clamp(newAgv.battery + batteryCharge, 0, 100)

        // 充满后切换为完成
        if (newAgv.battery >= 100) {
          newAgv.state = 'done'
        }
        break
      }

      case 'done': {
        // 充电完成，切换回工作状态
        newAgv.state = 'working'
        newAgv.queuePosition = -1
        // 回到路径上的最近点
        if (path && path.points.length > 0) {
          let nearestIdx = 0
          let nearestDist = Infinity
          path.points.forEach((p, idx) => {
            const d = distance2D(newAgv.position, p)
            if (d < nearestDist) {
              nearestDist = d
              nearestIdx = idx
            }
          })
          newAgv.pathIndex = nearestIdx
          newAgv.position = { ...path.points[nearestIdx] }
        }
        break
      }
    }

    return newAgv
  })

  // 8. 更新排队位置
  agvList = updateQueuePositions(agvList, waitZone)

  // 9. 更新充电桩占用状态（同步到 entities 引用由外部处理）

  return {
    ...state,
    time: state.time + simMinutes,
    agvList,
  }
}
