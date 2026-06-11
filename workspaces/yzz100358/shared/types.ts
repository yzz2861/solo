export interface Artist {
  id: number;
  name: string;
  specialty: string | null;
  avatar_path: string | null;
  is_active: number;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string | null;
  wechat_id: string | null;
  birthday: string | null;
  allergies: string | null;
  contraindications: string | null;
  is_sensitive_skin: number;
  created_at: string;
  updated_at: string;
}

export interface BodyPart {
  id: number;
  name: string;
  category: string | null;
  is_sensitive: number;
  diagram_path: string | null;
}

export interface TattooDesign {
  id: number;
  client_id: number;
  booking_id: number | null;
  name: string;
  description: string | null;
  current_version: number;
  created_at: string;
}

export interface DesignVersion {
  id: number;
  design_id: number;
  version_number: number;
  image_path: string;
  feedback: string | null;
  created_at: string;
}

export interface Deposit {
  id: number;
  booking_id: number;
  amount: number;
  screenshot_path: string | null;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

export interface Booking {
  id: number;
  client_id: number;
  artist_id: number;
  body_part_id: number | null;
  start_time: string;
  end_time: string;
  estimated_duration: number | null;
  status: 'confirmed' | 'pending_deposit' | 'cancelled' | 'completed';
  internal_notes: string | null;
  client_notes: string | null;
  is_sensitive_area: number;
  revision_count: number;
  created_at: string;
  updated_at: string;
}

export interface BookingDetail extends Booking {
  client_name: string;
  client_phone: string | null;
  artist_name: string;
  body_part_name: string | null;
  body_part_is_sensitive: number | null;
  deposit_amount: number | null;
  deposit_paid: number;
  design_name: string | null;
  design_image_path: string | null;
  client_allergies: string | null;
  client_contraindications: string | null;
  client_is_sensitive_skin: number | null;
}

export interface DesignDetail extends TattooDesign {
  client_name: string;
  versions: DesignVersion[];
}

export type AlertType = 
  | 'image_invalid'
  | 'time_conflict'
  | 'deposit_pending'
  | 'sensitive_area'
  | 'revision_high'
  | 'allergy_warning';

export interface Alert {
  id: string;
  type: AlertType;
  level: 'warning' | 'error' | 'info';
  message: string;
  relatedId?: number;
  relatedType?: 'booking' | 'client' | 'design';
}

export type BookingStatus = Booking['status'];

export interface ClientInput {
  id?: number;
  name: string;
  phone?: string | null;
  wechat_id?: string | null;
  birthday?: string | null;
  allergies?: string | null;
  contraindications?: string | null;
  is_sensitive_skin?: number;
}

export interface BookingInput {
  id?: number;
  client_id: number;
  artist_id: number;
  body_part_id?: number | null;
  start_time: string;
  end_time: string;
  estimated_duration?: number | null;
  status?: BookingStatus;
  internal_notes?: string | null;
  client_notes?: string | null;
  is_sensitive_area?: number;
  revision_count?: number;
}

export interface DesignInput {
  id?: number;
  client_id: number;
  booking_id?: number | null;
  name: string;
  description?: string | null;
  image_path?: string;
  feedback?: string | null;
}

export interface DepositInput {
  id?: number;
  booking_id: number;
  amount: number;
  screenshot_path?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  notes?: string | null;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictBookings: BookingDetail[];
}

export interface ImageCheckResult {
  valid: string[];
  invalid: {
    path: string;
    designId: number;
    versionId: number;
    designName: string;
  }[];
}

export interface DateRange {
  start: string;
  end: string;
}
