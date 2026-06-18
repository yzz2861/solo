export interface Activity {
  id: string;
  name: string;
  date: string;
  status: 'draft' | 'ongoing' | 'completed';
  description?: string;
  startDistance?: number;
  totalDistance?: number;
}

export type RoutePointType = 'start' | 'checkpoint' | 'supply' | 'end';

export interface RoutePoint {
  id: string;
  activityId: string;
  name: string;
  distance: number;
  order: number;
  type: RoutePointType;
  estimatedArrival?: string;
  isDetour?: boolean;
  note?: string;
}

export type RiggerStatus = 'active' | 'dropped' | 'rescued' | 'finished';

export interface Rigger {
  id: string;
  activityId: string;
  name: string;
  phone: string;
  group?: string;
  emergencyContact?: string;
  healthNotes?: string;
  needsAttention: boolean;
  status: RiggerStatus;
  dropReason?: string;
  currentPointId?: string;
  lastCheckinTime?: string;
  avatarColor?: string;
}

export interface SupplyPoint {
  id: string;
  activityId: string;
  routePointId: string;
  name: string;
}

export type SupplyCategory = 'water' | 'energy' | 'food' | 'medical' | 'other';

export interface SupplyItem {
  id: string;
  supplyPointId: string;
  name: string;
  category: SupplyCategory;
  quantity: number;
  initialQuantity: number;
  unit: string;
  lowStockThreshold?: number;
}

export interface CheckinRecord {
  id: string;
  riggerId: string;
  routePointId: string;
  timestamp: string;
  isDuplicate: boolean;
  note?: string;
}

export interface SupplyRecord {
  id: string;
  riggerId: string;
  supplyItemId: string;
  quantity: number;
  timestamp: string;
  supplyPointId: string;
}

export type RescueType = 'help' | 'rescue' | 'drop';
export type RescueStatus = 'pending' | 'processing' | 'resolved';

export interface RescueRecord {
  id: string;
  activityId: string;
  riggerId: string;
  type: RescueType;
  status: RescueStatus;
  description: string;
  location?: string;
  timestamp: string;
  resolvedAt?: string;
  resolution?: string;
}

export type AlertType = 'duplicate_checkin' | 'low_stock' | 'detour' | 'overdue' | 'help_request';
export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface Alert {
  id: string;
  activityId: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  read: boolean;
  timestamp: string;
  relatedId?: string;
}

export type ViewRole = 'leader' | 'supply' | 'medic' | 'rider';

export interface AppState {
  currentActivityId: string | null;
  activities: Activity[];
  routePoints: RoutePoint[];
  riggers: Rigger[];
  supplyPoints: SupplyPoint[];
  supplyItems: SupplyItem[];
  checkinRecords: CheckinRecord[];
  supplyRecords: SupplyRecord[];
  rescueRecords: RescueRecord[];
  alerts: Alert[];
  currentView: ViewRole;
}
