export type ObjectType = 'booth' | 'car' | 'barrier' | 'power' | 'fire_exit' | 'entrance';

export type WeightUnit = 'kg' | 'ton';
export type AreaUnit = 'm2' | 'ft2';

export interface Dimensions {
  width: number;
  depth: number;
  height: number;
}

export interface ExhibitionObject {
  id: string;
  type: ObjectType;
  name: string;
  position: [number, number, number];
  dimensions: Dimensions;
  weight: number;
  weightUnit: WeightUnit;
  area: number;
  areaUnit: AreaUnit;
  hasPower: boolean;
  powerSourceId?: string;
  notes?: string;
}

export interface PowerPoint {
  id: string;
  name: string;
  position: [number, number, number];
}

export interface FireExitZone {
  id: string;
  name: string;
  position: [number, number, number];
  dimensions: Dimensions;
}

export interface EntranceZone {
  id: string;
  name: string;
  position: [number, number, number];
  dimensions: Dimensions;
}

export interface MallConfig {
  id: string;
  name: string;
  atriumDimensions: Dimensions;
  floorLoadCapacity: number;
  minFireExitWidth: number;
  minPassageWidth: number;
  powerPoints: PowerPoint[];
  fireExits: FireExitZone[];
  entrances: EntranceZone[];
}

export type RiskType = 
  | 'overload' 
  | 'fire_exit_blocked' 
  | 'passage_too_narrow' 
  | 'power_crosses_flow' 
  | 'unit_error' 
  | 'area_error';

export type RiskSeverity = 'warning' | 'danger';

export interface RiskItem {
  id: string;
  objectId: string;
  type: RiskType;
  severity: RiskSeverity;
  message: string;
  basis: string;
  resolved: boolean;
  suggestedPosition?: [number, number, number];
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'rectification';

export interface ApprovalRecord {
  id: string;
  projectName: string;
  planName?: string;
  brandName: string;
  applicant?: string;
  date: string;
  status: ApprovalStatus;
  objects: ExhibitionObject[];
  risks: RiskItem[];
  approver?: string;
  createdAt: string;
  reviewedAt?: string;
  approvalDate?: string;
  approvalComment?: string;
  remarks?: string;
  rectificationOpinion?: string;
  loadBasis?: string;
  passageBasis?: string;
}

export type PowerCheckStatus = 'connected' | 'disconnected' | 'checked' | 'pending' | 'issue';

export interface PowerCheckpoint {
  id: string;
  powerPointId: string;
  name: string;
  location: string;
  position: [number, number, number];
  status: PowerCheckStatus;
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
  connectedObject?: string;
}

export interface DragState {
  isDragging: boolean;
  objectId: string | null;
  startPosition: [number, number, number] | null;
}
