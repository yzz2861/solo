export type ObjectType = 'shelf' | 'forklift' | 'zone' | 'line' | 'pallet';

export type ZoneType = 'forbidden' | 'pedestrian';

export type LineType = 'warning' | 'divider';

export type Severity = 'danger' | 'warning' | 'safe';

export type Unit = 'm' | 'cm' | 'mm';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface BaseObject {
  id: string;
  type: ObjectType;
  position: Vec3;
  rotation: number;
  name?: string;
}

export interface ShelfObject extends BaseObject {
  type: 'shelf';
  width: number;
  depth: number;
  height: number;
  levels: number;
  hasPallet: boolean;
  palletOverhang: number;
  label?: string;
}

export interface PalletObject extends BaseObject {
  type: 'pallet';
  width: number;
  depth: number;
  height: number;
  overhang: number;
}

export interface ForkliftObject extends BaseObject {
  type: 'forklift';
  forkLength: number;
  wheelbase: number;
  width: number;
  turningRadius: number;
  model?: string;
}

export interface ZoneObject extends BaseObject {
  type: 'zone';
  zoneType: ZoneType;
  width: number;
  depth: number;
}

export interface LineObject extends BaseObject {
  type: 'line';
  length: number;
  lineType: LineType;
}

export type SceneObject = ShelfObject | PalletObject | ForkliftObject | ZoneObject | LineObject;

export interface PathPoint {
  x: number;
  z: number;
  radius?: number;
  isTurn?: boolean;
}

export interface Path {
  id: string;
  points: PathPoint[];
  forkliftId: string | null;
  name?: string;
}

export interface CollisionPoint {
  position: Vec2;
  distance: number;
  objectId: string;
  severity: Severity;
  description: string;
  pathPointIndex?: number;
}

export interface Scheme {
  id: string;
  name: string;
  createdAt: number;
  objects: SceneObject[];
  paths: Path[];
  thumbnail?: string;
  notes?: string;
}

export interface RectificationItem {
  type: 'move_shelf' | 'add_warning_line' | 'adjust_path' | 'remove_obstacle' | 'widen_aisle';
  location: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  distance?: number;
  objectId?: string;
}

export type ToolMode = 'select' | 'shelf' | 'forklift' | 'zone_forbidden' | 'zone_pedestrian' | 'path' | 'measure';

export interface DisplaySettings {
  showGrid: boolean;
  showTurnRadius: boolean;
  showCollisionZones: boolean;
  showMeasurements: boolean;
  unit: Unit;
}
