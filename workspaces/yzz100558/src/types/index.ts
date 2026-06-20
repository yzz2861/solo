export enum PickupMethod {
  SELF = 'self',
  AUTHORIZED = 'authorized',
  MAIL = 'mail'
}

export enum AuthorizedType {
  FAMILY = 'family',
  COMPANY = 'company'
}

export enum ReportStatus {
  PENDING = 'pending',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  MAILED = 'mailed'
}

export enum AuthStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  USED = 'used'
}

export enum MailStatus {
  PENDING = 'pending',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  RETURNED = 'returned'
}

export enum StaffRole {
  RECEPTIONIST = 'receptionist',
  CUSTOMER_SERVICE = 'customer_service',
  SUPERVISOR = 'supervisor'
}

export interface Patient {
  id: number;
  name: string;
  id_card_no: string;
  phone: string;
  created_at: string;
}

export interface Company {
  id: number;
  name: string;
  contact_person: string;
  contact_phone: string;
  created_at: string;
}

export interface ReportBatch {
  id: number;
  batch_no: string;
  patient_id: number;
  patient_name: string;
  patient_id_card_no: string;
  is_group: boolean;
  company_id: number | null;
  company_name: string | null;
  status: ReportStatus;
  report_ready_at: string;
  created_at: string;
  updated_at: string;
}

export interface Authorization {
  id: number;
  report_batch_id: number;
  batch_no: string;
  pickup_method: PickupMethod;
  authorized_type: AuthorizedType | null;
  authorized_person_name: string | null;
  authorized_person_id_card: string | null;
  authorized_person_phone: string | null;
  authorization_material: string | null;
  status: AuthStatus;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface AuthorizationRevoke {
  id: number;
  authorization_id: number;
  revoked_by: number;
  revoked_by_name: string;
  reason: string;
  revoked_at: string;
}

export interface PickupRecord {
  id: number;
  report_batch_id: number;
  batch_no: string;
  authorization_id: number | null;
  pickup_method: PickupMethod;
  pickup_person_name: string;
  pickup_person_id_card: string;
  picked_up_by: number;
  picked_up_by_name: string;
  picked_up_at: string;
}

export interface MailRecord {
  id: number;
  report_batch_id: number;
  batch_no: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  courier_company: string;
  tracking_no: string;
  status: MailStatus;
  mailed_by: number;
  mailed_by_name: string;
  mailed_at: string;
  delivered_at: string | null;
  updated_at: string;
}

export interface ExceptionLog {
  id: number;
  report_batch_id: number | null;
  batch_no: string | null;
  attempt_person_name: string;
  attempt_person_id_card: string;
  attempt_type: string;
  intercepted_by: number;
  intercepted_by_name: string;
  reason: string;
  created_at: string;
}

export interface Staff {
  id: number;
  name: string;
  role: StaffRole;
  employee_no: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  page_size: number;
}
