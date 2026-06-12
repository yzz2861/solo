export type Unit = "mg" | "g" | "kg";

export type WeightClass = "E1" | "E2" | "F1" | "F2" | "M1" | "M2" | "M3";

export interface Measurement {
  index: number;
  value: number;
  unit: Unit;
}

export interface StandardWeight {
  class: WeightClass;
  nominalValue: number;
  nominalUnit: Unit;
  certNumber: string;
  expiryDate: string;
  correctionValue_mg: number;
}

export interface Environment {
  temperature_C: number;
  humidity_RH: number;
  recordedAt: string;
}

export interface Contribution {
  source: string;
  u_mg: number;
  percent: number;
  key: string;
}

export interface CalibrationResults {
  correction_mg: number;
  u_combined_mg: number;
  U_expanded_mg: number;
  k_factor: number;
  contributions: Contribution[];
  tolerance_mg: number;
  isPass: boolean | null;
  mean_mg: number;
  std_mg: number;
}

export type AlertLevel = "danger" | "warning" | "info";

export interface AlertItem {
  level: AlertLevel;
  code: string;
  msg: string;
  field: string;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  createdAt: string;
}

export type WeightClassOrEmpty = WeightClass | "";

export type CalibrationForm = {
  customerId: string;
  customerName: string;
  customerContact: string;
  customerPhone: string;
  certNumber: string;
  nominalValue: number;
  nominalUnit: Unit;
  weightClass: WeightClassOrEmpty;
  weightSerial: string;
  calibrationDate: string;
  nextRecalDate: string;
  standardWeight: {
    class: WeightClassOrEmpty;
    nominalValue: number;
    nominalUnit: Unit;
    certNumber: string;
    expiryDate: string;
    correctionValue_mg: number;
  };
  environment: Environment;
  measurements: Measurement[];
  results: CalibrationResults | null;
  alerts: AlertItem[];
};

export interface Certificate {
  id: string;
  customerId: string;
  certNumber: string;
  nominalValue: number;
  nominalUnit: Unit;
  weightClass: WeightClass;
  weightSerial: string;
  calibrationDate: string;
  nextRecalDate: string;
  standardWeight: StandardWeight;
  environment: Environment;
  measurements: Measurement[];
  results: CalibrationResults | null;
  alerts: AlertItem[];
  createdAt: string;
  status?: string;
}
