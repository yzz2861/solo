export type Role = 'clerk' | 'inspector' | 'manager' | 'consignor' | 'buyer';
export type UserRole = Role;

export const ROLE_DISPLAY: Record<UserRole, string> = {
  clerk: '店员',
  inspector: '验机师',
  manager: '店长',
  consignor: '寄卖人',
  buyer: '买家',
};

export interface User {
  id: string;
  username?: string;
  password?: string;
  phone: string;
  name: string;
  displayName?: string;
  role: Role;
  avatar?: string;
  createdAt: string;
}

export type EquipmentType = 'body' | 'lens' | 'kit';
export type EquipmentStatus = 'pending_inspect' | 'available' | 'reserved' | 'sold' | 'returned';
export type DefectGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Equipment {
  id: string;
  type: EquipmentType;
  serialNumber: string;
  brand: string;
  model: string;
  consignorId: string;
  consignorName: string;
  consignorPhone: string;
  basePrice: number;
  currentPrice: number;
  accessories: string[];
  status: EquipmentStatus;
  defectGrade?: DefectGrade;
  coverImage?: string;
  inspectionId?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  soldAt?: string;
  soldPrice?: number;
}

export interface MoldSpot {
  id: string;
  imageId: string;
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large';
  note?: string;
}

export interface InspectionPhoto {
  id: string;
  equipmentId: string;
  category: 'shutter' | 'mold' | 'focus' | 'appearance' | 'accessory';
  url: string;
  originalUrl?: string;
  name: string;
  uploadAt: string;
  moldSpots?: MoldSpot[];
}

export interface Inspection {
  id: string;
  equipmentId: string;
  equipmentSerialNumber: string;
  shutterCount: number;
  shutterImageId?: string;
  moldSpotsCount: number;
  moldPhotos: InspectionPhoto[];
  focusTest: {
    passed: boolean;
    centerSharp: boolean;
    edgeSharp: boolean;
    infinityFocus: boolean;
    note?: string;
  };
  accessoryCheck: {
    item: string;
    present: boolean;
    condition?: string;
  }[];
  appearanceNote?: string;
  defectGrade: DefectGrade;
  conclusion: string;
  inspectorId: string;
  inspectorName: string;
  createdAt: string;
}

export interface PriceChangeRequest {
  id: string;
  equipmentId: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  rejectReason?: string;
  createdAt: string;
}

export interface PriceChangeLog {
  id: string;
  equipmentId: string;
  oldPrice: number;
  newPrice: number;
  operatorId: string;
  operatorName: string;
  changeType: 'create' | 'adjust' | 'sale';
  remark?: string;
  createdAt: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  equipmentId: string;
  buyerName: string;
  buyerPhone: string;
  appointmentDate: string;
  appointmentTimeSlot: string;
  note?: string;
  status: AppointmentStatus;
  createdBy?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface Settlement {
  id: string;
  equipmentId: string;
  equipmentSerialNumber: string;
  soldPrice: number;
  platformFee: number;
  inspectionFee: number;
  otherFees: { name: string; amount: number }[];
  totalDeduction: number;
  payoutAmount: number;
  consignorId: string;
  consignorName: string;
  consignorPhone: string;
  managerId: string;
  managerName: string;
  soldAt: string;
  settledAt: string;
}
