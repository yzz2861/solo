export type SignType = 'room_door' | 'floor_standing' | 'elevator_hall' | 'accessible' | 'directional';
export type WarningLevel = 'error' | 'warning' | 'info';
export type WarningCategory = 'height' | 'distance' | 'occlusion' | 'orientation' | 'fire_hydrant' | 'corner_view' | 'accessible_path';
export type ConstructionStatus = 'pending' | 'picked' | 'installed' | 'verified';
export type UserRole = 'admin' | 'worker' | 'staff';
export type MaterialType = 'acrylic' | 'metal' | 'pvc';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Wall {
  id: string;
  start: Vec3;
  end: Vec3;
  height: number;
  thickness: number;
}

export interface Column {
  id: string;
  position: Vec3;
  size: { w: number; d: number; h: number };
}

export interface Elevator {
  id: string;
  position: Vec3;
  width: number;
  height: number;
  name: string;
}

export interface FireHydrant {
  id: string;
  position: Vec3;
  facing: number;
  size: { w: number; h: number; d: number };
}

export interface AccessiblePath {
  id: string;
  points: Vec3[];
  width: number;
}

export interface Room {
  id: string;
  name: string;
  number: string;
  position: Vec3;
  size: { w: number; d: number };
  doorPosition: Vec3;
  zone: string;
}

export interface FloorPlan {
  id: string;
  floorNumber: number;
  name: string;
  walls: Wall[];
  columns: Column[];
  elevators: Elevator[];
  fireHydrants: FireHydrant[];
  accessiblePaths: AccessiblePath[];
  rooms: Room[];
  size: { w: number; d: number };
}

export interface Sign {
  id: string;
  type: SignType;
  name: string;
  position: Vec3;
  rotationY: number;
  width: number;
  height: number;
  roomId?: string;
  zone: string;
  material: MaterialType;
  createdAt: number;
  isDragging?: boolean;
}

export interface ComplianceWarning {
  id: string;
  signId: string;
  level: WarningLevel;
  category: WarningCategory;
  message: string;
  suggestion: string;
  value?: number;
  threshold?: number;
}

export interface ConstructionRecord {
  signId: string;
  pickedAt?: number;
  installedPosition?: Vec3;
  installedAt?: number;
  photoUrls?: string[];
  status: ConstructionStatus;
  workerId?: string;
  notes?: string;
}

export interface Scheme {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  currentFloor: number;
  floors: Record<number, FloorPlan>;
  signs: Record<number, Sign[]>;
  constructionRecords: Record<string, ConstructionRecord>;
  currentRole: UserRole;
}

export interface SignTemplate {
  type: SignType;
  label: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultElevation: number;
  color: string;
  textColor: string;
  description: string;
  icon: string;
}

export const SIGN_TEMPLATES: Record<SignType, SignTemplate> = {
  room_door: {
    type: 'room_door',
    label: '门牌',
    defaultWidth: 0.45,
    defaultHeight: 0.18,
    defaultElevation: 1.5,
    color: '#F8FAFC',
    textColor: '#1E3A5F',
    description: '房间门牌号，建议安装高度 1.4m - 1.6m',
    icon: 'DoorOpen',
  },
  floor_standing: {
    type: 'floor_standing',
    label: '立式导视牌',
    defaultWidth: 0.8,
    defaultHeight: 1.8,
    defaultElevation: 0.05,
    color: '#1E3A5F',
    textColor: '#FFFFFF',
    description: '落地立式综合导视牌，高度不低于 1.4m',
    icon: 'SignpostBig',
  },
  elevator_hall: {
    type: 'elevator_hall',
    label: '电梯厅牌',
    defaultWidth: 1.0,
    defaultHeight: 0.5,
    defaultElevation: 2.2,
    color: '#F26B3A',
    textColor: '#FFFFFF',
    description: '电梯厅楼层指示牌，确保转角处可见',
    icon: 'ArrowUpFromLine',
  },
  accessible: {
    type: 'accessible',
    label: '无障碍标识',
    defaultWidth: 0.3,
    defaultHeight: 0.3,
    defaultElevation: 1.3,
    color: '#0EA5E9',
    textColor: '#FFFFFF',
    description: '轮椅通道标识，底部高度 0.9m ~ 2.5m',
    icon: 'Info',
  },
  directional: {
    type: 'directional',
    label: '方向指引牌',
    defaultWidth: 0.6,
    defaultHeight: 0.25,
    defaultElevation: 2.4,
    color: '#22C55E',
    textColor: '#FFFFFF',
    description: '走廊方向指示，文字朝向走廊主方向',
    icon: 'MoveRight',
  },
};

export const ZONE_LIST = ['A区', 'B区', 'C区', 'D区', '公共区'];
export const FLOOR_LIST = [1, 2, 3, 4, 5];
