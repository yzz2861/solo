export type NodeType = 'junction' | 'entrance' | 'exit' | 'facility';

export type FacilityType = 'door' | 'water' | 'shelter' | 'ventilation' | 'sign';

export type AccidentType = 'fire' | 'flood' | 'collapse' | 'gas';

export type ConstraintType = 'closed' | 'water_depth' | 'ventilation' | 'blocked';

export type WarningSeverity = 'warning' | 'danger';

export type EdgeType = 'main' | 'branch';

export type VentilationDirection = 'forward' | 'backward' | 'none';

export interface TunnelNode {
  id: string;
  x: number;
  y: number;
  z: number;
  type: NodeType;
  name?: string;
}

export interface TunnelEdge {
  id: string;
  from: string;
  to: string;
  length: number;
  type: EdgeType;
  isClosed?: boolean;
  waterDepth?: number;
  ventilationDirection?: VentilationDirection;
  slopeAngle?: number;
}

export interface Facility {
  id: string;
  nodeId: string;
  type: FacilityType;
  name: string;
  status: 'normal' | 'warning' | 'danger';
  properties: Record<string, any>;
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  edgeId?: string;
  nodeId?: string;
  value: number;
  threshold: number;
  description: string;
}

export interface RouteWarning {
  type: ConstraintType;
  edgeId: string;
  message: string;
  severity: WarningSeverity;
  suggestedAction?: string;
}

export interface Route {
  id: string;
  nodes: string[];
  edges: string[];
  totalDistance: number;
  estimatedTime?: number;
  warnings?: RouteWarning[];
}

export interface TimeCalculationParams {
  baseSpeed?: number;
  hasEquipment?: boolean;
  edges: TunnelEdge[];
}

export interface Scenario {
  id: string;
  name: string;
  accidentType: AccidentType;
  tunnelId: string;
  startNodeId: string;
  endNodeId: string;
  constraints: Constraint[];
  createdAt: string;
}

export interface DrillRecord {
  id: string;
  scenarioId: string;
  participantName: string;
  actualTime: number;
  estimatedTime: number;
  score: number;
  timestamps: { nodeId: string; time: number; event?: string }[];
  completedAt: string;
}
