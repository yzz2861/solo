export enum AccidentStatus {
  REGISTERED = 'registered',
  ASSESSING = 'assessing',
  ASSESSED = 'assessed',
  PENDING_CONFIRM = 'pending_confirm',
  CONFIRMED = 'confirmed',
  PENDING_CLOSE = 'pending_close',
  CLOSED = 'closed',
  DISPUTED = 'disputed'
}

export enum UserRole {
  STAFF = 'staff',
  MANAGER = 'manager'
}

export const StatusLabels: Record<AccidentStatus, string> = {
  [AccidentStatus.REGISTERED]: '已登记',
  [AccidentStatus.ASSESSING]: '定损中',
  [AccidentStatus.ASSESSED]: '已定损',
  [AccidentStatus.PENDING_CONFIRM]: '待确认',
  [AccidentStatus.CONFIRMED]: '已确认',
  [AccidentStatus.PENDING_CLOSE]: '待结案',
  [AccidentStatus.CLOSED]: '已结案',
  [AccidentStatus.DISPUTED]: '有争议'
};

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  storeId: string;
}

export interface Vehicle {
  plateNumber: string;
  model: string;
  color?: string;
  vin?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  idCard?: string;
}

export interface Photo {
  id: string;
  accidentId: string;
  fileName: string;
  originalName: string;
  uploaderId: string;
  uploaderName: string;
  uploadTime: Date;
  description?: string;
  fileSize: number;
}

export interface AuditLog {
  id: string;
  accidentId: string;
  operatorId: string;
  operatorName: string;
  operation: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
}

export interface Accident {
  id: string;
  plateNumber: string;
  vehicleModel: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerIdCard?: string;
  accidentTime: Date;
  returnTime?: Date;
  location?: string;
  description?: string;
  liability?: string;
  insuranceEstimate?: number;
  assessmentAmount?: number;
  deductionAmount?: number;
  depositAmount?: number;
  customerConfirmed: boolean;
  customerConfirmTime?: Date;
  replacementCar: boolean;
  replacementCarInfo?: string;
  status: AccidentStatus;
  assessDeadline?: Date;
  storeId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isOverdue?: boolean;
  overdueDays?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateAccidentRequest {
  plateNumber: string;
  vehicleModel: string;
  customerName: string;
  customerPhone: string;
  customerIdCard?: string;
  accidentTime: Date;
  returnTime?: Date;
  location?: string;
  description?: string;
  depositAmount?: number;
}

export interface UpdateAccidentRequest {
  liability?: string;
  insuranceEstimate?: number;
  assessmentAmount?: number;
  deductionAmount?: number;
  replacementCar?: boolean;
  replacementCarInfo?: string;
  status?: AccidentStatus;
  description?: string;
  location?: string;
  returnTime?: Date;
}

export interface TimelineEvent {
  id: string;
  type: 'photo' | 'fee' | 'status' | 'audit';
  timestamp: Date;
  operatorName: string;
  description: string;
  photoId?: string;
  photoUrl?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
}
