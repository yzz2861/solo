export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  UNDETERMINED = 'UNDETERMINED'
}

export enum DispatchStatus {
  PENDING = 'PENDING',
  APPROVABLE = 'APPROVABLE',
  SUPPLEMENT_REQUIRED = 'SUPPLEMENT_REQUIRED',
  LOCKED = 'LOCKED',
  FAILED = 'FAILED',
  UNDER_REVIEW = 'UNDER_REVIEW'
}

export enum SourceChannel {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  PORTAL = 'PORTAL',
  THIRD_PARTY = 'THIRD_PARTY'
}

export enum ProcessAction {
  SUBMIT = 'SUBMIT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUPPLEMENT = 'SUPPLEMENT',
  REVIEW = 'REVIEW',
  LOCK = 'LOCK',
  UNLOCK = 'UNLOCK'
}

export enum MaterialType {
  ID_CARD = 'ID_CARD',
  QUALIFICATION_CERT = 'QUALIFICATION_CERT',
  HEALTH_CERT = 'HEALTH_CERT',
  TRAINING_CERT = 'TRAINING_CERT',
  SEA_SERVICE = 'SEA_SERVICE',
  PHOTO = 'PHOTO'
}

export interface Material {
  type: MaterialType;
  name: string;
  provided: boolean;
  valid?: boolean;
  expireDate?: string;
}

export interface Pilot {
  id: string;
  name: string;
  idNumber: string;
  qualificationLevel: string;
  serviceYears: number;
  portScope: string[];
  licenseNumber: string;
  licenseExpireDate: string;
}

export interface DispatchItem {
  itemId: string;
  pilotId: string;
  pilotName?: string;
  shipName: string;
  shipType: string;
  shipGrossTonnage: number;
  portOfCall: string;
  pilotageTime: string;
  materials: Material[];
  riskLevel?: RiskLevel;
  riskReasons?: string[];
}

export interface DispatchBatch {
  batchNo: string;
  sourceChannel: SourceChannel;
  items: DispatchItem[];
  createdAt: string;
  createdBy?: string;
}

export interface ReviewOpinion {
  reviewer: string;
  opinion: string;
  reviewTime: string;
  action: ProcessAction;
}

export interface DispatchResultItem {
  itemId: string;
  pilotId: string;
  pilotName?: string;
  shipName: string;
  status: DispatchStatus;
  reasons: string[];
  riskLevel: RiskLevel;
  reviewRequired: boolean;
  canDirectApprove: boolean;
}

export interface DispatchResult {
  batchNo: string;
  sourceChannel: SourceChannel;
  totalCount: number;
  approvableCount: number;
  supplementRequiredCount: number;
  lockedCount: number;
  failedCount: number;
  items: DispatchResultItem[];
  processedAt: string;
}
