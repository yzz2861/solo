export type AreaUnit = 'sqm' | 'sqft';

export type Orientation =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'northwest'
  | 'southeast'
  | 'southwest';

export type UsageType = 'office' | 'meeting' | 'server';

export type ReportView = 'admin' | 'engineer';

export interface RoomParams {
  area: number;
  areaUnit: AreaUnit;
  floorHeight: number | null;
  orientation: Orientation;
  windowWallRatio: number;
  peopleCount: number;
  computerCount: number;
  usageHours: number;
  usageType: UsageType;
}

export interface CoolingBreakdown {
  orientationFactor: number;
  windowFactor: number;
  wallFactor: number;
  roofFactor: number;
}

export interface CoolingResult {
  totalCoolingLoad: number;
  buildingLoad: number;
  humanLoad: number;
  equipmentLoad: number;
  lightingLoad: number;
  recommendedACMin: number;
  recommendedACMax: number;
  recommendedHP: string;
  safetyFactor: number;
  breakdown: CoolingBreakdown;
}

export interface Plan {
  id: string;
  name: string;
  params: RoomParams;
  result: CoolingResult;
  createdAt: number;
}

export interface WarningItem {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}
