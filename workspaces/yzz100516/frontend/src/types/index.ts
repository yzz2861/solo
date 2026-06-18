export enum SampleStatus {
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  OUT = 'out',
  RETURNED = 'returned',
  DESTROYED = 'destroyed',
  OVERDUE = 'overdue',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum SamplePurpose {
  RND = 'rnd',
  CUSTOMER = 'customer',
  EXHIBITION = 'exhibition',
  TESTING = 'testing',
  OTHER = 'other',
}

export interface SampleAttachment {
  id: number;
  sample_id: number;
  file_name: string;
  file_type?: string;
  file_size?: number;
  uploaded_at: string;
}

export interface Sample {
  id: number;
  sample_no: string;
  sample_name: string;
  batch_number: string;
  purpose: SamplePurpose;
  purpose_detail?: string;
  applicant: string;
  department?: string;
  quantity: number;
  unit: string;
  out_time?: string;
  expected_return_time?: string;
  actual_return_time?: string;
  status: SampleStatus;
  approval_status: ApprovalStatus;
  approver?: string;
  approval_time?: string;
  approval_opinion?: string;
  destroy_time?: string;
  destroy_reason?: string;
  destroy_operator?: string;
  customs_documents?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
  attachments: SampleAttachment[];
}

export interface SampleListResponse {
  total: number;
  items: Sample[];
}

export interface SampleCreate {
  sample_name: string;
  batch_number: string;
  purpose: SamplePurpose;
  purpose_detail?: string;
  applicant: string;
  department?: string;
  quantity: number;
  unit: string;
  out_time?: string;
  expected_return_time?: string;
  customs_documents?: string;
  remark?: string;
}

export interface SampleUpdate {
  sample_name?: string;
  batch_number?: string;
  purpose?: SamplePurpose;
  purpose_detail?: string;
  applicant?: string;
  department?: string;
  quantity?: number;
  unit?: string;
  out_time?: string;
  expected_return_time?: string;
  customs_documents?: string;
  remark?: string;
}

export interface ApprovalRequest {
  approved: boolean;
  approver: string;
  opinion?: string;
}

export interface ReturnRequest {
  return_time?: string;
  remark?: string;
}

export interface DestroyRequest {
  destroy_time?: string;
  reason: string;
  operator: string;
}

export interface OutboundRequest {
  out_time?: string;
  operator?: string;
}

export interface OverdueSample {
  id: number;
  sample_no: string;
  sample_name: string;
  batch_number: string;
  applicant: string;
  expected_return_time: string;
  out_time?: string;
  overdue_days: number;
  status: SampleStatus;
}

export interface Statistics {
  total: number;
  pending_approval: number;
  out: number;
  overdue: number;
  returned: number;
  destroyed: number;
}

export interface BatchCheckResult {
  batch_number: string;
  existing_count: number;
  existing_samples: Array<{
    id: number;
    sample_no: string;
    sample_name: string;
    status: SampleStatus;
    applicant: string;
  }>;
}

export interface SampleCreateResponse {
  sample: Sample;
  batch_warning: boolean;
  batch_duplicate_info: BatchCheckResult | null;
}

export interface ComplianceSummary {
  outbound_count: number;
  returned_count: number;
  destroyed_count: number;
  missing_docs_count: number;
}
