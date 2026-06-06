export enum MaterialType {
  PRESCRIPTION = 'prescription',
  USAGE_LOG = 'usage_log',
  WASTE_DISPOSAL_RECORD = 'waste_disposal_record',
  PATIENT_CONSENT = 'patient_consent',
  DOCTOR_ORDER = 'doctor_order',
  INVENTORY_CHECKLIST = 'inventory_checklist',
  VIDEO_RECORD = 'video_record',
  OTHER = 'other',
}

export enum MaterialStatus {
  UPLOADED = 'uploaded',
  VERIFIED = 'verified',
  INVALID = 'invalid',
  MISSING = 'missing',
}

export interface SupportingMaterial {
  id: string;
  type: MaterialType;
  name: string;
  url: string;
  uploadTime: string;
  uploaderId: string;
  status: MaterialStatus;
  relatedItemId?: string;
  verificationRemark?: string;
}
