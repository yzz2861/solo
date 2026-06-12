/**
 * 全局类型定义
 * 参考技术架构文档：核心数据模型
 */

// 布局实体类型
export type LayoutEntityType =
  | 'charger'
  | 'waitZone'
  | 'pedestrian'
  | 'fireDoor'
  | 'agvPath'
  | 'forbidden'

// 2D 坐标（XZ 平面）
export interface Vec2XZ {
  x: number
  z: number
}

// 基础实体
export interface BaseEntity {
  id: string
  type: LayoutEntityType
  name: string
  position: Vec2XZ
  rotation: number
  visible: boolean
  locked: boolean
}

// 充电桩
export interface ChargerEntity extends BaseEntity {
  type: 'charger'
  powerKw: number
  chargeMinutes: number
  occupied: boolean
}

// 等待区
export interface WaitZoneEntity extends BaseEntity {
  type: 'waitZone'
  width: number
  depth: number
  capacity: number
}

// 行人通道
export interface PedestrianEntity extends BaseEntity {
  type: 'pedestrian'
  width: number
  length: number
}

// 消防门
export interface FireDoorEntity extends BaseEntity {
  type: 'fireDoor'
  width: number
  clearanceRadius: number
  /** 是否被阻挡（溢出 / 排队占用） */
  isBlocked?: boolean
}

// AGV 路径
export interface AgvPathEntity extends BaseEntity {
  type: 'agvPath'
  points: Vec2XZ[]
  width: number
}

// 禁区
export interface ForbiddenEntity extends BaseEntity {
  type: 'forbidden'
  width: number
  depth: number
  reason: string
}

// 联合类型：支持按类型分发
export type LayoutEntity =
  | ChargerEntity
  | WaitZoneEntity
  | PedestrianEntity
  | FireDoorEntity
  | AgvPathEntity
  | ForbiddenEntity

// AGV 车辆参数
export interface AgvParams {
  lengthMeters: number
  widthMeters: number
  turningRadius: number
  chargeMinutes: number
  lowBatteryThreshold: number
  peakCount: number
  offPeakCount: number
}

// 通道参数
export interface CorridorParams {
  mainCorridorWidth: number
  forkliftWidth: number
  fireClearance: number
}

// AGV 车辆状态
export type AgvVehicleState =
  | 'working'
  | 'returning'
  | 'queuing'
  | 'charging'
  | 'done'

/** 为 R3F 组件保留别名，便于阅读 */
export type AgvState = AgvVehicleState

// AGV 车辆实例
export interface AgvVehicle {
  id: string
  battery: number
  state: AgvVehicleState
  position: Vec2XZ
  /** 绕 Y 轴朝向（弧度），3D 渲染用 */
  rotationY?: number
  pathIndex: number
  queuePosition: number
}

// 溢出警告类型
export type OverflowWarningType =
  | 'fireDoor'
  | 'pedestrian'
  | 'forklift'
  | 'forbidden'

export type OverflowWarningSeverity = 'warning' | 'danger'

/** R3F 组件内使用的短别名 */
export type OverflowSeverity = OverflowWarningSeverity

// 溢出警告
export interface OverflowWarning {
  id: string
  entityId: string
  entityName: string
  type: OverflowWarningType
  severity: OverflowWarningSeverity
  message: string
  /** 警告发生位置（3D 标记用） */
  position?: Vec2XZ
  // 以下字段兼容旧代码（报告工具），可选
  level?: 'info' | 'warning' | 'error' | 'critical'
  title?: string
  x?: number
  z?: number
  simulationTime?: number
  relatedEntityIds?: string[]
}

// 模拟场景类型
export type SimScenario = 'peak' | 'offPeak'

// 模拟状态
export interface SimulationState {
  running: boolean
  speed: number
  time: number
  scenario: SimScenario
  agvList: AgvVehicle[]
  overflowWarnings: OverflowWarning[]
}

// 方案场景类型
export type SchemeScenarioType = 'peak' | 'offPeak' | 'general'

// 方案评估指标
export interface SchemeMetrics {
  landUsage: number
  chargerCount: number
  waitCapacity: number
  riskScore: number
  maxQueueLength: number
}

// 布局方案
export interface LayoutScheme {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  scenarioType: SchemeScenarioType
  entities: LayoutEntity[]
  agvParams: AgvParams
  corridorParams: CorridorParams
  metrics: SchemeMetrics
  notes: string
  // 兼容报告工具中的扩展字段
  version?: string | number
  description?: string
  sceneLength?: number
  sceneWidth?: number
  vehicles?: Array<Record<string, unknown>>
  lastSimulation?: Record<string, unknown>
}

// 工具模式
export type ToolMode =
  | 'select'
  | 'add-charger'
  | 'add-wait'
  | 'add-ped'
  | 'add-door'
  | 'add-path'
  | 'add-forbidden'

/** Zustand Store 的状态切片与操作接口（保留给 store 使用） */
export interface LayoutStoreState {
  entities: LayoutEntity[]
  selectedEntityId: string | null
  agvParams: AgvParams
  corridorParams: CorridorParams
  validationErrors: Record<string, string>
  sim: SimulationState
  schemes: LayoutScheme[]
  activeSchemeId: string | null
  toolMode: ToolMode
  showComparison: boolean
  showExport: boolean
  comparisonIds: [string, string] | null
}

export interface LayoutStoreActions {
  addEntity: (e: LayoutEntity) => void
  updateEntity: (id: string, patch: Partial<LayoutEntity>) => void
  removeEntity: (id: string) => void
  selectEntity: (id: string | null) => void
  setAgvParams: (p: Partial<AgvParams>) => void
  setCorridorParams: (p: Partial<CorridorParams>) => void
  validateParams: () => void
  startSim: () => void
  pauseSim: () => void
  tickSim: (dt: number) => void
  saveScheme: (name: string, type: LayoutScheme['scenarioType']) => void
  loadScheme: (id: string) => void
  deleteScheme: (id: string) => void
  setComparison: (ids: [string, string] | null) => void
  setToolMode: (mode: ToolMode) => void
  exportReport: () => void
}

export type LayoutStore = LayoutStoreState & LayoutStoreActions
