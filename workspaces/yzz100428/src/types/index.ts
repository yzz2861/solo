export type MachineType = '拖拉机' | '插秧机' | '收割机' | '其他';
export type WorkType = '犁地' | '耙地' | '插秧' | '收割' | '其他';
export type ReservationStatus = '待作业' | '进行中' | '已完成' | '已取消' | '已改期';
export type MaintenanceStatus = '维修中' | '已完成';

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  village: string;
  createdAt: string;
}

export interface Plot {
  id: string;
  name: string;
  farmerId: string;
  acres: number;
  location: string;
}

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  status: '正常' | '维修中';
  plateNumber: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  machineIds: string[];
  active: boolean;
}

export interface Reservation {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmerVillage: string;
  plotId: string;
  plotName: string;
  plotAcres: number;
  plotLocation: string;
  machineId: string;
  machineName: string;
  machineType: MachineType;
  driverId: string;
  driverName: string;
  driverPhone: string;
  workDate: string;
  startTime: string;
  durationHours: number;
  workType: WorkType;
  estimatedFuel: number;
  status: ReservationStatus;
  cancelReason?: string;
  rescheduleFrom?: string;
  driverChangeReason?: string;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface Maintenance {
  id: string;
  machineId: string;
  machineName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: MaintenanceStatus;
  createdAt: string;
}

export interface ChangeLog {
  id: string;
  reservationId: string;
  changeType: '改期' | '取消' | '改派司机' | '批量改期-雨天' | '状态变更';
  oldValue: string;
  newValue: string;
  reason: string;
  createdAt: string;
}
