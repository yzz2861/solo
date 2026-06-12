export type ComponentType = "platform" | "slide" | "softpad" | "fence" | "supervisor";

export type RiskType = "height_exceed" | "collision" | "blind_spot" | "unit_error" | "coverage_insufficient";

export type RiskSeverity = "critical" | "warning" | "info";

export type LengthUnit = "cm" | "m";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export interface PlaygroundComponent {
  id: string;
  type: ComponentType;
  position: Vec3;
  dimensions: Dimensions;
  bufferZone: number;
  unit: LengthUnit;
  attachedTo?: string;
  name: string;
}

export interface RiskItem {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  componentIds: string[];
  message: string;
}

export interface Scheme {
  id: string;
  name: string;
  components: PlaygroundComponent[];
  maxHeight: number;
  bufferRange: number;
  createdAt: string;
  updatedAt: string;
}

export const COMPONENT_DEFAULTS: Record<ComponentType, { dimensions: Dimensions; color: string; label: string }> = {
  platform: { dimensions: { width: 120, height: 20, depth: 120 }, color: "#3B82F6", label: "平台" },
  slide: { dimensions: { width: 60, height: 30, depth: 200 }, color: "#22C55E", label: "滑梯" },
  softpad: { dimensions: { width: 120, height: 5, depth: 120 }, color: "#FF6B35", label: "软包" },
  fence: { dimensions: { width: 200, height: 80, depth: 5 }, color: "#F59E0B", label: "围栏" },
  supervisor: { dimensions: { width: 30, height: 170, depth: 30 }, color: "#EF4444", label: "看护点" },
};

export const RISK_SEVERITY_ORDER: Record<RiskSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export const RISK_SEVERITY_LABEL: Record<RiskSeverity, string> = {
  critical: "严重",
  warning: "警告",
  info: "提示",
};

export const RISK_TYPE_LABEL: Record<RiskType, string> = {
  height_exceed: "超高风险",
  collision: "碰撞风险",
  blind_spot: "视线盲区",
  unit_error: "单位异常",
  coverage_insufficient: "软包覆盖不足",
};
