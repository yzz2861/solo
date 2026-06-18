export type {
  NodeType,
  FacilityType,
  AccidentType,
  ConstraintType,
  TunnelNode,
  TunnelEdge,
  Facility,
  Constraint,
  RouteWarning,
  Route,
  Scenario,
  DrillRecord,
} from '../../types';

export const BASE_SPEED = 1.2;

export const WATER_DEPTH_THRESHOLD_WARNING = 0.3;
export const WATER_DEPTH_THRESHOLD_DANGER = 0.5;
export const WATER_DEPTH_THRESHOLD_BLOCKED = 1.0;

export const WATER_SPEED_FACTOR_LOW = 0.7;
export const WATER_SPEED_FACTOR_MEDIUM = 0.4;
export const WATER_SPEED_FACTOR_HIGH = 0.1;

export const VENTILATION_SPEED_FACTOR_ADVERSE = 0.5;

export const INCLINE_SPEED_FACTOR_PER_5_DEGREES = 0.9;

export const EQUIPMENT_SPEED_FACTOR = 0.8;

export const ROUTE_WEIGHT_CLOSED = Infinity;
export const ROUTE_WEIGHT_WATER_HIGH = 5;
export const ROUTE_WEIGHT_VENTILATION_ADVERSE = 2;

export const NODE_TYPE_LABELS: Record<string, string> = {
  junction: '交叉口',
  entrance: '入口',
  exit: '出口',
  facility: '设施点',
};

export const FACILITY_TYPE_LABELS: Record<string, string> = {
  door: '风门',
  water: '积水点',
  shelter: '避险硐室',
  ventilation: '通风设施',
  sign: '标识牌',
};

export const ACCIDENT_TYPE_LABELS: Record<string, string> = {
  fire: '火灾',
  flood: '水灾',
  collapse: '塌方',
  gas: '瓦斯',
};

export const ACCIDENT_TYPE_COLORS: Record<string, string> = {
  fire: '#e74c3c',
  flood: '#3498db',
  collapse: '#f39c12',
  gas: '#9b59b6',
};

export const CONSTRAINT_TYPE_LABELS: Record<string, string> = {
  closed: '封闭巷道',
  water_depth: '积水深度',
  ventilation: '通风方向',
  blocked: '阻塞',
};

export const EDGE_TYPE_LABELS: Record<string, string> = {
  main: '主巷',
  branch: '支巷',
};

export const STATUS_COLORS: Record<string, string> = {
  normal: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',
};

export const TUNNEL_CONFIG = {
  mainTunnelWidth: 4,
  mainTunnelHeight: 3,
  branchTunnelWidth: 3,
  branchTunnelHeight: 2.5,
  wallThickness: 0.3,
};
