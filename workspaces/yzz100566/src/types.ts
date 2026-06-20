export const PRESERVATION_HOURS = 24;
export const LAB_RESULTS_SLA_HOURS = 48;
export const DISPATCH_SLA_HOURS = 4;

export const SAMPLE_STATUS = {
  BOTTLED: 'bottled',
  SAMPLED: 'sampled',
  DISPATCHED: 'dispatched',
  RECEIVED: 'received',
  REJECTED: 'rejected',
  RESULTED: 'resulted',
  RE_SAMPLING: 're_sampling',
  RE_SAMPLED: 're_sampled',
  CLOSED: 'closed',
} as const;

export type SampleStatus = typeof SAMPLE_STATUS[keyof typeof SAMPLE_STATUS];

export const ROLE = {
  ENV_OFFICER: 'env_officer',
  LAB: 'lab',
  STATION_MASTER: 'station_master',
} as const;

export type Role = typeof ROLE[keyof typeof ROLE];

export interface Outlet {
  id: number;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface SampleBottle {
  id: number;
  barcode: string;
  status: 'unused' | 'used' | 'discarded';
  created_at: string;
}

export interface SamplingRecord {
  id: number;
  bottle_id: number;
  barcode: string;
  outlet_id: number;
  outlet_code: string;
  outlet_name: string;
  sampled_at: string;
  sampler: string;
  sampler_id: number;
  status: SampleStatus;
  preservation_deadline: string;
  is_sample_overdue: number;
  is_dispatch_overdue: number;
  is_lab_overdue: number;
  dispatched_at: string | null;
  dispatcher: string | null;
  dispatcher_id: number | null;
  dispatch_deadline: string;
  lab_received_at: string | null;
  lab_operator: string | null;
  lab_operator_id: number | null;
  lab_sla_deadline: string | null;
  result_cod: number | null;
  result_nh3n: number | null;
  result_tp: number | null;
  result_tn: number | null;
  result_ph: number | null;
  result_ss: number | null;
  result_remark: string | null;
  result_reported_at: string | null;
  result_reporter: string | null;
  result_reporter_id: number | null;
  parent_sampling_id: number | null;
  is_re_sample: number;
  re_sample_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RejectionRecord {
  id: number;
  sampling_id: number;
  rejected_at: string;
  rejected_by: string;
  reject_reason: string;
  re_sample_requirement: string;
  re_sample_deadline: string;
  re_sample_completed: number;
  re_sample_sampling_id: number | null;
  created_at: string;
}

export interface AlertRecord {
  id: number;
  sampling_id: number;
  alert_type: 'preservation' | 'dispatch' | 'lab_sla' | 're_sample';
  alert_message: string;
  alert_level: 'warning' | 'critical';
  triggered_at: string;
  acknowledged: number;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
