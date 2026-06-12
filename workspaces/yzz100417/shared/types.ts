export interface User {
  id: string;
  username: string;
  role: 'admin' | 'nurse' | 'doctor' | 'warehouse';
  created_at: string;
}

export interface Patient {
  id: string;
  name: string;
  phone?: string | null;
  treatment_plan?: string | null;
  created_at: string;
}

export type AttachmentModelType = 'template' | 'material' | 'aligner_batch';

export interface AttachmentModel {
  id: string;
  name: string;
  type: AttachmentModelType;
  description?: string | null;
}

export interface Location {
  id: string;
  clinic_room: string;
  shelf: string;
  slot: string;
}

export type AttachmentStatus = 'available' | 'bound' | 'recalled' | 'expired';

export interface Attachment {
  id: string;
  code: string;
  model_id: string;
  batch_no: string;
  location_id: string | null;
  status: AttachmentStatus;
  expiry_date: string | null;
  created_at: string;
  model?: AttachmentModel;
  location?: Location | null;
}

export interface PatientAttachment {
  id: string;
  patient_id: string;
  attachment_id: string;
  aligner_batch: string;
  follow_up_date: string;
  clinic_room: string;
  missing_reason: string | null;
  is_prepared: number;
  bound_at: string;
  patient?: Patient;
  attachment?: Attachment;
}

export interface InventoryAdjustment {
  id: string;
  attachment_id: string;
  delta: number;
  reason: string;
  operator_id: string;
  created_at: string;
}

export interface FollowUpRecord {
  id: string;
  patient_id: string;
  attachment_id: string;
  visit_date: string;
  notes?: string | null;
  created_at: string;
}

export interface StatsOverview {
  totalStock: number;
  boundCount: number;
  missingCount: number;
  nearExpiryCount: number;
}

export type MissingReason = 'missing_template' | 'missing_material' | 'missing_batch' | null;
