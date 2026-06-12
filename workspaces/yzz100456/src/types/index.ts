export type WeightUnit = 'ton' | 'kg';

export interface RadiusEntry {
  armLength: number;
  radius: number;
  capacity: number;
}

export interface CraneSpec {
  model: string;
  maxArmLength: number;
  ratedCapacity: number;
  radiusTable: RadiusEntry[];
  basePosition: [number, number, number];
  brand?: string;
}

export interface CargoSpec {
  name: string;
  length: number;
  width: number;
  height?: number;
  weight: number;
  weightUnit: WeightUnit;
  liftPointOffsetX: number;
  liftPointOffsetY: number;
  position: [number, number, number];
}

export type ZoneType = 'ship_edge' | 'warehouse_door' | 'forbidden' | 'walkway' | 'obstacle';

export interface Zone {
  id: string;
  type: ZoneType;
  name: string;
  polygon: [number, number][];
  height: number;
}

export interface LiftOperation {
  id: string;
  liftNo: string;
  armLength: number;
  startAngle: number;
  endAngle: number;
  stepAngle: number;
  liftPoint: [number, number, number];
  dropPoint: [number, number, number];
  reviewed: boolean;
  reviewTime?: string;
}

export type RiskLevel = 'danger' | 'warning' | 'info' | 'notice';
export type RiskCategory = 'radius' | 'collision' | 'walkway' | 'capacity' | 'special';

export interface RiskItem {
  id: string;
  level: RiskLevel;
  category: RiskCategory;
  title: string;
  description: string;
  affectedAngle?: [number, number];
}

export interface LiftPlan {
  id: string;
  planNo: string;
  name: string;
  createTime: string;
  createUser: string;
  version: number;
  crane: CraneSpec;
  cargo: CargoSpec;
  zones: Zone[];
  operations: LiftOperation[];
  windSpeed: number;
  remarks: string;
  locked: boolean;
  screenshot?: string;
  risks: RiskItem[];
}

export interface HandoverRecord {
  planId: string;
  version: number;
  confirmations: {
    userId: string;
    userName: string;
    role: string;
    time: string;
  }[];
  locked: boolean;
}

export interface CraneModelPreset {
  id: string;
  brand: string;
  spec: CraneSpec;
}

export interface CrewMember {
  userId: string;
  userName: string;
  role: string;
}
