/**
 * useLayoutStore
 *
 * AGV 充电布局系统的全局 Zustand Store，负责：
 *   1. 场景实体管理（增删改查 + 选中态）
 *   2. AGV / 通道参数管理与校验
 *   3. 模拟运行状态控制
 *   4. 布局方案持久化（localStorage）与对比
 *   5. UI 状态（工具栏模式、弹窗开关等）
 */
import { create } from 'zustand'

import type {
  AgvParams,
  BaseEntity,
  CorridorParams,
  LayoutEntity,
  LayoutEntityType,
  LayoutScheme,
  OverflowWarning,
  SchemeMetrics,
  SchemeScenarioType,
  SimScenario,
  SimulationState,
  ToolMode,
} from '../types'
import { generateId } from '../utils/id'
import { validateAgvParams, validateCorridorParams } from './validators'

// ---------------------------------------------------------------------------
// 默认值常量
// ---------------------------------------------------------------------------

const DEFAULT_AGV_PARAMS: AgvParams = {
  // 与需求中的 length/width 对应：架构文档使用 lengthMeters/widthMeters
  lengthMeters: 1.2,
  widthMeters: 0.8,
  turningRadius: 1.0,
  chargeMinutes: 30,
  lowBatteryThreshold: 20,
  peakCount: 20,
  offPeakCount: 8,
}

const DEFAULT_CORRIDOR_PARAMS: CorridorParams = {
  mainCorridorWidth: 4.0,
  forkliftWidth: 1.8,
  fireClearance: 1.5,
}

const DEFAULT_SIM_STATE: SimulationState = {
  running: false,
  speed: 1,
  time: 0,
  scenario: 'offPeak',
  agvList: [],
  overflowWarnings: [],
}

const SCHEMES_STORAGE_KEY = 'agv_schemes'

// ---------------------------------------------------------------------------
// 工具模式 -> 默认实体类型的映射（给 addEntity 提供合理默认值）
// ---------------------------------------------------------------------------
const TOOL_TO_ENTITY: Record<Exclude<ToolMode, 'select'>, LayoutEntityType> = {
  'add-charger': 'charger',
  'add-wait': 'waitZone',
  'add-ped': 'pedestrian',
  'add-door': 'fireDoor',
  'add-path': 'agvPath',
  'add-forbidden': 'forbidden',
}

// ---------------------------------------------------------------------------
// 持久化辅助
// ---------------------------------------------------------------------------

function readSchemesFromStorage(): LayoutScheme[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SCHEMES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as LayoutScheme[]
    return []
  } catch {
    return []
  }
}

function writeSchemesToStorage(schemes: LayoutScheme[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SCHEMES_STORAGE_KEY, JSON.stringify(schemes))
  } catch (e) {
    // 持久化失败不应该阻塞业务
    console.warn('[useLayoutStore] 保存方案失败：', e)
  }
}

// ---------------------------------------------------------------------------
// 实体补全辅助：基于类型给缺失字段填入合理默认
// ---------------------------------------------------------------------------
function buildDefaultEntity<T extends LayoutEntityType>(
  type: T,
  base: Partial<Extract<LayoutEntity, { type: T }>>,
): Extract<LayoutEntity, { type: T }> {
  const id = base.id ?? generateId(type.replace(/([A-Z])/g, '_$1').toLowerCase())
  const name = base.name ?? defaultNameByType(type)
  const position = base.position ?? { x: 0, z: 0 }
  const rotation = base.rotation ?? 0
  const visible = base.visible ?? true
  const locked = base.locked ?? false

  const common = { id, type, name, position, rotation, visible, locked }

  switch (type) {
    case 'charger':
      return {
        ...common,
        powerKw: (base as Partial<import('../types').ChargerEntity>).powerKw ?? 60,
        chargeMinutes:
          (base as Partial<import('../types').ChargerEntity>).chargeMinutes ?? 30,
        occupied: (base as Partial<import('../types').ChargerEntity>).occupied ?? false,
      } as Extract<LayoutEntity, { type: T }>
    case 'waitZone':
      return {
        ...common,
        width: (base as Partial<import('../types').WaitZoneEntity>).width ?? 3,
        depth: (base as Partial<import('../types').WaitZoneEntity>).depth ?? 2,
        capacity: (base as Partial<import('../types').WaitZoneEntity>).capacity ?? 5,
      } as Extract<LayoutEntity, { type: T }>
    case 'pedestrian':
      return {
        ...common,
        width: (base as Partial<import('../types').PedestrianEntity>).width ?? 1.5,
        length: (base as Partial<import('../types').PedestrianEntity>).length ?? 10,
      } as Extract<LayoutEntity, { type: T }>
    case 'fireDoor':
      return {
        ...common,
        width: (base as Partial<import('../types').FireDoorEntity>).width ?? 1.8,
        clearanceRadius:
          (base as Partial<import('../types').FireDoorEntity>).clearanceRadius ?? 2,
      } as Extract<LayoutEntity, { type: T }>
    case 'agvPath':
      return {
        ...common,
        points: (base as Partial<import('../types').AgvPathEntity>).points ?? [
          { x: -5, z: 0 },
          { x: 5, z: 0 },
        ],
        width: (base as Partial<import('../types').AgvPathEntity>).width ?? 1.2,
      } as Extract<LayoutEntity, { type: T }>
    case 'forbidden':
      return {
        ...common,
        width: (base as Partial<import('../types').ForbiddenEntity>).width ?? 3,
        depth: (base as Partial<import('../types').ForbiddenEntity>).depth ?? 3,
        reason: (base as Partial<import('../types').ForbiddenEntity>).reason ?? '禁入区域',
      } as Extract<LayoutEntity, { type: T }>
    default:
      return common as Extract<LayoutEntity, { type: T }>
  }
}

function defaultNameByType(type: LayoutEntityType): string {
  switch (type) {
    case 'charger':
      return '充电桩'
    case 'waitZone':
      return '等待区'
    case 'pedestrian':
      return '行人通道'
    case 'fireDoor':
      return '消防门'
    case 'agvPath':
      return 'AGV 路径'
    case 'forbidden':
      return '禁区'
  }
}

// ---------------------------------------------------------------------------
// 评估指标计算
// ---------------------------------------------------------------------------

function estimateEntityArea(entity: BaseEntity): number {
  switch (entity.type) {
    case 'charger':
      // 充电桩按一个停车占位估算 (3m x 2m)
      return 3 * 2
    case 'waitZone':
    case 'forbidden': {
      const e = entity as import('../types').WaitZoneEntity
      return (e.width ?? 0) * (e.depth ?? 0)
    }
    case 'pedestrian': {
      const e = entity as import('../types').PedestrianEntity
      return (e.width ?? 0) * (e.length ?? 0)
    }
    case 'fireDoor': {
      const e = entity as import('../types').FireDoorEntity
      const r = e.clearanceRadius ?? 1
      // 门体 + 净空估算：宽度 * 深度 + 净空圆
      return (e.width ?? 0) * 0.5 + Math.PI * r * r
    }
    case 'agvPath': {
      const e = entity as import('../types').AgvPathEntity
      const w = e.width ?? 1
      // 按折线段长度累加
      let total = 0
      const pts = e.points ?? []
      for (let i = 1; i < pts.length; i += 1) {
        const dx = pts[i].x - pts[i - 1].x
        const dz = pts[i].z - pts[i - 1].z
        total += Math.hypot(dx, dz)
      }
      return total * w
    }
    default:
      return 0
  }
}

function computeRiskScore(warnings: OverflowWarning[]): number {
  // 简单评分：danger 记 10 分、warning 记 3 分
  return warnings.reduce((sum, w) => sum + (w.severity === 'danger' ? 10 : 3), 0)
}

function computeMetrics(
  entities: BaseEntity[],
  agvParams: AgvParams,
  warnings: OverflowWarning[],
): SchemeMetrics {
  const landUsage = entities.reduce((sum, e) => sum + estimateEntityArea(e), 0)
  const chargerCount = entities.filter((e) => e.type === 'charger').length
  const waitCapacity = entities
    .filter((e) => e.type === 'waitZone')
    .reduce(
      (sum, e) => sum + ((e as import('../types').WaitZoneEntity).capacity ?? 0),
      0,
    )
  const riskScore = computeRiskScore(warnings)
  // 预估最大排队长度：车辆数 - 充电桩数 * 允许并发，取正值
  const totalChargers = Math.max(chargerCount, 0)
  const fleetSize = Math.max(agvParams.peakCount, agvParams.offPeakCount)
  const maxQueueLength = Math.max(0, fleetSize - totalChargers)

  return {
    landUsage: Number(landUsage.toFixed(2)),
    chargerCount,
    waitCapacity,
    riskScore,
    maxQueueLength,
  }
}

// ---------------------------------------------------------------------------
// Store 定义
// ---------------------------------------------------------------------------

export interface LayoutStoreState {
  entities: LayoutEntity[]
  selectedEntityId: string | null

  // ---- 参数 ----
  agvParams: AgvParams
  corridorParams: CorridorParams
  validationErrors: Record<string, string>

  // ---- 模拟 ----
  sim: SimulationState

  // ---- 方案 ----
  schemes: LayoutScheme[]
  activeSchemeId: string | null

  // ---- UI ----
  toolMode: ToolMode
  showSchemeManager: boolean
  showComparison: boolean
  showExport: boolean
  comparisonIds: [string, string] | null
}

export interface LayoutStoreActions {
  // 工具 & 选择
  setToolMode: (mode: ToolMode) => void
  selectEntity: (id: string | null) => void

  // 实体 CRUD
  addEntity: <T extends LayoutEntity>(entity: Partial<T> & { type: T['type'] }) => T
  updateEntity: (id: string, patch: Partial<LayoutEntity>) => void
  removeEntity: (id: string) => void

  // 参数
  setAgvParams: (p: Partial<AgvParams>) => void
  setCorridorParams: (p: Partial<CorridorParams>) => void
  validateAll: () => void

  // 模拟
  startSim: () => void
  pauseSim: () => void
  setSimSpeed: (speed: number) => void
  setSimScenario: (scenario: SimScenario) => void
  setSimState: (patch: Partial<SimulationState>) => void

  // 方案
  saveScheme: (name: string, scenarioType?: SchemeScenarioType) => LayoutScheme
  saveSchemeAs: (name: string, scenarioType?: SchemeScenarioType) => LayoutScheme
  clearActiveScheme: () => void
  loadScheme: (id: string) => void
  deleteScheme: (id: string) => void

  // UI 切换
  toggleSchemeManager: () => void
  toggleComparison: () => void
  toggleExport: () => void
  setComparisonIds: (ids: [string, string] | null) => void

  // 初始化演示
  initDefaultDemo: () => void
}

export type LayoutStore = LayoutStoreState & LayoutStoreActions

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  // ---------------------------------------------------------------------
  // 初始状态
  // ---------------------------------------------------------------------
  entities: [],
  selectedEntityId: null,
  agvParams: { ...DEFAULT_AGV_PARAMS },
  corridorParams: { ...DEFAULT_CORRIDOR_PARAMS },
  validationErrors: {},
  sim: { ...DEFAULT_SIM_STATE },
  schemes: readSchemesFromStorage(),
  activeSchemeId: null,
  toolMode: 'select',
  showSchemeManager: false,
  showComparison: false,
  showExport: false,
  comparisonIds: null,

  // ---------------------------------------------------------------------
  // 工具 & 选择
  // ---------------------------------------------------------------------
  setToolMode: (mode) => set({ toolMode: mode }),

  selectEntity: (id) => {
    const next = id ?? null
    set({ selectedEntityId: next })
    if (next) {
      // 选中实体后切回选择模式，便于交互
      set({ toolMode: 'select' })
    }
  },

  // ---------------------------------------------------------------------
  // 实体 CRUD
  // ---------------------------------------------------------------------
  addEntity: <T extends LayoutEntity>(entity: Partial<T> & { type: T['type'] }): T => {
    // 类型通过 runtime switch 保证一致，这里用 unknown 作为转换中间态。
    const built = buildDefaultEntity(
      entity.type as LayoutEntityType,
      entity as unknown as Partial<LayoutEntity>,
    ) as unknown as T
    set((state) => ({
      entities: [...state.entities, built as unknown as LayoutEntity],
      selectedEntityId: built.id,
      toolMode: 'select',
    }))
    return built
  },

  updateEntity: (id, patch) => {
    set((state) => ({
      entities: state.entities.map((e) => (e.id === id ? ({ ...e, ...patch } as LayoutEntity) : e)),
    }))
  },

  removeEntity: (id) => {
    set((state) => ({
      entities: state.entities.filter((e) => e.id !== id),
      selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId,
    }))
  },

  // ---------------------------------------------------------------------
  // 参数 & 校验
  // ---------------------------------------------------------------------
  setAgvParams: (p) => {
    set((state) => {
      const merged: AgvParams = { ...state.agvParams, ...p }
      const agvErrors = validateAgvParams(merged)
      // 仅替换 agv 相关的错误字段，保留 corridor 的
      const corridorErrors = Object.fromEntries(
        Object.entries(state.validationErrors).filter(
          ([k]) =>
            k === 'mainCorridorWidth' || k === 'forkliftWidth' || k === 'fireClearance',
        ),
      )
      return {
        agvParams: merged,
        validationErrors: { ...corridorErrors, ...agvErrors },
      }
    })
  },

  setCorridorParams: (p) => {
    set((state) => {
      const merged: CorridorParams = { ...state.corridorParams, ...p }
      const corridorErrors = validateCorridorParams(merged)
      // 仅替换 corridor 相关错误
      const agvKeys: (keyof AgvParams)[] = [
        'lengthMeters',
        'widthMeters',
        'turningRadius',
        'chargeMinutes',
        'lowBatteryThreshold',
        'peakCount',
        'offPeakCount',
      ]
      const agvErrors = Object.fromEntries(
        Object.entries(state.validationErrors).filter(([k]) =>
          agvKeys.includes(k as keyof AgvParams),
        ),
      )
      return {
        corridorParams: merged,
        validationErrors: { ...agvErrors, ...corridorErrors },
      }
    })
  },

  validateAll: () => {
    const { agvParams, corridorParams } = get()
    const agvErrors = validateAgvParams(agvParams)
    const corridorErrors = validateCorridorParams(corridorParams)
    set({ validationErrors: { ...agvErrors, ...corridorErrors } })
  },

  // ---------------------------------------------------------------------
  // 模拟控制
  // ---------------------------------------------------------------------
  startSim: () =>
    set((state) => ({
      sim: {
        ...state.sim,
        running: true,
      },
    })),

  pauseSim: () =>
    set((state) => ({
      sim: {
        ...state.sim,
        running: false,
      },
    })),

  setSimSpeed: (speed) =>
    set((state) => ({
      sim: {
        ...state.sim,
        speed: Math.max(0, speed),
      },
    })),

  setSimScenario: (scenario) =>
    set((state) => ({
      sim: {
        ...state.sim,
        scenario,
      },
    })),

  setSimState: (patch) =>
    set((state) => ({
      sim: {
        ...state.sim,
        ...patch,
      },
    })),

  // ---------------------------------------------------------------------
  // 方案管理（带 localStorage 持久化）
  // ---------------------------------------------------------------------
  saveScheme: (name, scenarioType = 'general'): LayoutScheme => {
    const { entities, agvParams, corridorParams, sim, schemes, activeSchemeId } = get()
    const metrics = computeMetrics(entities, agvParams, sim.overflowWarnings)

    const now = Date.now()
    // 如果当前有 activeSchemeId 且同名/同 id，允许 update
    const updating = activeSchemeId ? schemes.find((s) => s.id === activeSchemeId) : undefined

    let saved: LayoutScheme
    let nextSchemes: LayoutScheme[]
    if (updating) {
      saved = {
        ...updating,
        name,
        updatedAt: now,
        scenarioType,
        entities,
        agvParams: { ...agvParams },
        corridorParams: { ...corridorParams },
        metrics,
      }
      nextSchemes = schemes.map((s) => (s.id === saved.id ? saved : s))
    } else {
      saved = {
        id: generateId('scheme'),
        name,
        createdAt: now,
        updatedAt: now,
        scenarioType,
        entities: entities.map((e) => ({ ...e })) as LayoutEntity[],
        agvParams: { ...agvParams },
        corridorParams: { ...corridorParams },
        metrics,
        notes: '',
      }
      nextSchemes = [...schemes, saved]
    }

    writeSchemesToStorage(nextSchemes)
    set({
      schemes: nextSchemes,
      activeSchemeId: saved.id,
    })
    return saved
  },

  saveSchemeAs: (name, scenarioType = 'general'): LayoutScheme => {
    const { entities, agvParams, corridorParams, sim, schemes } = get()
    const metrics = computeMetrics(entities, agvParams, sim.overflowWarnings)

    const now = Date.now()
    const saved: LayoutScheme = {
      id: generateId('scheme'),
      name,
      createdAt: now,
      updatedAt: now,
      scenarioType,
      entities: entities.map((e) => ({ ...e })) as LayoutEntity[],
      agvParams: { ...agvParams },
      corridorParams: { ...corridorParams },
      metrics,
      notes: '',
    }
    const nextSchemes = [...schemes, saved]

    writeSchemesToStorage(nextSchemes)
    set({
      schemes: nextSchemes,
      activeSchemeId: saved.id,
    })
    return saved
  },

  clearActiveScheme: () => {
    const { validateAll } = get()
    set({
      entities: [],
      selectedEntityId: null,
      agvParams: { ...DEFAULT_AGV_PARAMS },
      corridorParams: { ...DEFAULT_CORRIDOR_PARAMS },
      sim: { ...DEFAULT_SIM_STATE },
      activeSchemeId: null,
      toolMode: 'select',
    })
    validateAll()
  },


  loadScheme: (id) => {
    const { schemes } = get()
    const scheme = schemes.find((s) => s.id === id)
    if (!scheme) return

    // 深拷贝以避免与方案池里的对象共享引用
    const entities = scheme.entities.map((e) => ({ ...e })) as LayoutEntity[]
    const agvParams = { ...scheme.agvParams }
    const corridorParams = { ...scheme.corridorParams }

    // 恢复时重跑一次校验
    const agvErrors = validateAgvParams(agvParams)
    const corridorErrors = validateCorridorParams(corridorParams)

    // 写回 localStorage（通常 load 不修改数据，但为了满足题目要求统一触发 persist）
    writeSchemesToStorage(schemes)

    set({
      entities,
      agvParams,
      corridorParams,
      validationErrors: { ...agvErrors, ...corridorErrors },
      selectedEntityId: null,
      activeSchemeId: scheme.id,
      // 恢复后重置模拟运行态
      sim: { ...DEFAULT_SIM_STATE, scenario: scheme.scenarioType === 'general' ? 'offPeak' : scheme.scenarioType },
    })
  },

  deleteScheme: (id) => {
    const { schemes, activeSchemeId } = get()
    const nextSchemes = schemes.filter((s) => s.id !== id)
    writeSchemesToStorage(nextSchemes)
    set({
      schemes: nextSchemes,
      activeSchemeId: activeSchemeId === id ? null : activeSchemeId,
    })
  },

  // ---------------------------------------------------------------------
  // UI 切换
  // ---------------------------------------------------------------------
  toggleSchemeManager: () => set((s) => ({ showSchemeManager: !s.showSchemeManager })),
  toggleComparison: () => set((s) => ({ showComparison: !s.showComparison })),
  toggleExport: () => set((s) => ({ showExport: !s.showExport })),
  setComparisonIds: (ids) => set({ comparisonIds: ids }),

  // ---------------------------------------------------------------------
  // 演示布局初始化
  //   - 2 个充电桩
  //   - 1 个等待区（容量 5）
  //   - 1 条行人通道
  //   - 2 个消防门
  //   - 1 条 AGV 路径
  //   - 1 个禁区
  // ---------------------------------------------------------------------
  initDefaultDemo: () => {
    const { addEntity, setAgvParams, setCorridorParams, validateAll, selectEntity } = get()

    // ---- 2 个充电桩 ----
    addEntity<import('../types').ChargerEntity>({
      type: 'charger',
      name: '充电桩 #1',
      position: { x: -8, z: -6 },
      rotation: 0,
      powerKw: 60,
      chargeMinutes: 30,
      occupied: false,
    })
    addEntity<import('../types').ChargerEntity>({
      type: 'charger',
      name: '充电桩 #2',
      position: { x: -8, z: 6 },
      rotation: 0,
      powerKw: 60,
      chargeMinutes: 30,
      occupied: false,
    })

    // ---- 1 个等待区（容量 5）----
    addEntity<import('../types').WaitZoneEntity>({
      type: 'waitZone',
      name: '等待区 A',
      position: { x: -2, z: 0 },
      rotation: 0,
      width: 4,
      depth: 3,
      capacity: 5,
    })

    // ---- 1 条行人通道 ----
    addEntity<import('../types').PedestrianEntity>({
      type: 'pedestrian',
      name: '主行人通道',
      position: { x: 0, z: -10 },
      rotation: 0,
      width: 2,
      length: 20,
    })

    // ---- 2 个消防门 ----
    addEntity<import('../types').FireDoorEntity>({
      type: 'fireDoor',
      name: '消防门 #1',
      position: { x: 12, z: -8 },
      rotation: 0,
      width: 2,
      clearanceRadius: 2,
    })
    addEntity<import('../types').FireDoorEntity>({
      type: 'fireDoor',
      name: '消防门 #2',
      position: { x: 12, z: 8 },
      rotation: 0,
      width: 2,
      clearanceRadius: 2,
    })

    // ---- 1 条 AGV 路径 ----
    addEntity<import('../types').AgvPathEntity>({
      type: 'agvPath',
      name: 'AGV 主路径',
      position: { x: 0, z: 0 },
      rotation: 0,
      width: 1.2,
      points: [
        { x: -10, z: 0 },
        { x: 10, z: 0 },
        { x: 10, z: 8 },
      ],
    })

    // ---- 1 个禁区 ----
    addEntity<import('../types').ForbiddenEntity>({
      type: 'forbidden',
      name: '仓储禁区',
      position: { x: 8, z: -3 },
      rotation: 0,
      width: 4,
      depth: 4,
      reason: '重型货架区，禁止 AGV 通行',
    })

    // 演示参数：保持默认，再做一次全局校验
    setAgvParams({ ...DEFAULT_AGV_PARAMS })
    setCorridorParams({ ...DEFAULT_CORRIDOR_PARAMS })
    validateAll()

    // 取消选中
    selectEntity(null)
  },
}))

/**
 * 暴露工具模式 -> 实体类型映射给 UI 辅助使用
 */
export { TOOL_TO_ENTITY, SCHEMES_STORAGE_KEY }

/**
 * 暴露指标计算函数，供外部模块复用（如对比面板）
 */
export { computeMetrics, estimateEntityArea }
