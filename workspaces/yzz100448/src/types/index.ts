export type TimeSlot = 'morning' | 'afternoon';
export type VisitorStatus = 'pending' | 'arrived' | 'checked_out' | 'overdue';
export type AlertType = 'plate_error' | 'parking_conflict' | 'all_day_occupied' | 'plate_changed';
export type UserRole = 'reception' | 'security';

export interface Visitor {
  id: string;
  company: string;
  contactPerson: string;
  plateNumber: string;
  originalPlateNumber?: string;
  plateChangeApprover?: string;
  plateChangeTime?: string;
  timeSlot: TimeSlot;
  visitDate: string;
  startTime: string;
  endTime: string;
  parkingSpot: string;
  remarks?: string;
  status: VisitorStatus;
  checkInTime?: string;
  checkOutTime?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPlateChanged: boolean;
}

export interface Handover {
  id: string;
  handoverTime: string;
  fromPerson: string;
  toPerson: string;
  notes: string;
  pendingItems: string[];
  isReviewed: boolean;
  reviewedAt?: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  visitorId?: string;
  timestamp: string;
  dismissed: boolean;
}

export interface CurrentUser {
  name: string;
  role: UserRole;
}

export interface VisitorFormData {
  company: string;
  contactPerson: string;
  plateNumber: string;
  timeSlot: TimeSlot;
  visitDate: string;
  startTime: string;
  endTime: string;
  parkingSpot: string;
  remarks?: string;
}

export interface CompanyStats {
  company: string;
  visitCount: number;
}

export interface OverdueStats {
  visitor: Visitor;
  overdueMinutes: number;
}
