export type StudentStatus = 'incomplete' | 'pending' | 'completed';

export type IdType = 'idcard' | 'household';

export type AlertType = 'expired' | 'duplicate' | 'no-signature' | 'health-risk';

export interface Student {
  id: string;
  name: string;
  className: string;
  idType: IdType;
  idNumber: string;
  idExpiryDate: string;
  healthNote: string;
  allergyNote: string;
  guardianSigned: boolean;
  insuranceProvided: boolean;
  busNumber: string;
  seatNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertItem {
  type: AlertType;
  studentId: string;
  message: string;
}

export type PrintMode = 'bus-list' | 'health-note' | null;
