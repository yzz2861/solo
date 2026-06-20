export interface LoadStandard {
  id: string;
  name: string;
  vehicleType: string;
  frontLimit: number;
  rearLimit: number;
  totalLimit: number;
  isDefault?: boolean;
}

export interface Cargo {
  id: string;
  name: string;
  weight: number;
  position: number;
  width: number;
  color: string;
}

export interface VehicleParams {
  wheelbase: number;
  emptyFrontAxle: number;
  emptyRearAxle: number;
  carriageLength: number;
  carriageOffset?: number;
}

export interface AxleResult {
  frontAxle: number;
  rearAxle: number;
  totalWeight: number;
  frontMargin: number;
  rearMargin: number;
  totalMargin: number;
  frontOverloaded: boolean;
  rearOverloaded: boolean;
  totalOverloaded: boolean;
  frontRatio: number;
  rearRatio: number;
}

export interface CargoContribution {
  cargoId: string;
  cargoName: string;
  weight: number;
  frontContribution: number;
  rearContribution: number;
  frontRatio: number;
  rearRatio: number;
}

export interface TaskVersion {
  id: string;
  taskId: string;
  versionNumber: number;
  note: string;
  cargoSnapshot: Cargo[];
  axleResult: AxleResult;
  createdAt: string;
}

export interface DriverRecord {
  id: string;
  taskId: string;
  driverName: string;
  signatureData: string;
  signedAt: string;
  axleResult: AxleResult;
  vehicleParams: VehicleParams;
  cargoSnapshot: Cargo[];
}

export interface Task {
  id: string;
  name: string;
  vehiclePlate: string;
  vehicleParams: VehicleParams;
  standardId: string;
  cargoes: Cargo[];
  versions: TaskVersion[];
  driverRecord?: DriverRecord;
  createdAt: string;
  updatedAt: string;
}

export type WeightUnit = 'kg' | 'ton';
export type LengthUnit = 'mm' | 'cm' | 'm';

export interface AdjustmentSuggestion {
  type: 'front' | 'rear' | 'total';
  cargoId: string;
  cargoName: string;
  direction: 'forward' | 'backward';
  suggestedDistance: number;
  reason: string;
}
