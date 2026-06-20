export type ChangeType = 'consume' | 'freeze' | 'unfreeze' | 'adjust' | 'purchase';
export type FreezeStatus = 'frozen' | 'unfrozen';
export type PackageStatus = 'active' | 'expired' | 'exhausted' | 'fully_frozen';
export type ConsumptionStatus = 'consumed' | 'reversed';
export type RefRecordType = 'freeze' | 'unfreeze' | 'consumption' | 'exception_adjustment';

export interface Student {
  id: string;
  name: string;
  parent_phone?: string;
  class_teacher_id?: string;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  subject: string;
  duration_minutes: number;
  created_at: string;
}

export interface CoursePackage {
  id: string;
  student_id: string;
  course_id: string;
  name: string;
  total_lessons: number;
  remaining_lessons: number;
  purchase_date: string;
  expire_date: string;
  status: PackageStatus;
  created_at: string;
}

export interface FreezeRecord {
  id: string;
  package_id: string;
  student_id: string;
  freeze_date: string;
  unfreeze_date?: string;
  reason: string;
  status: FreezeStatus;
  created_by: string;
  created_at: string;
  unfreeze_reason?: string;
  unfrozen_by?: string;
  unfrozen_at?: string;
}

export interface ConsumptionRecord {
  id: string;
  package_id: string;
  student_id: string;
  course_id: string;
  schedule_id: string;
  lesson_date: string;
  lessons_consumed: number;
  teacher_id?: string;
  status: ConsumptionStatus;
  note?: string;
  created_at: string;
}

export interface BalanceLedger {
  id: string;
  package_id: string;
  student_id: string;
  change_type: ChangeType;
  change_amount: number;
  balance_after: number;
  ref_record_id?: string;
  ref_record_type?: RefRecordType;
  description: string;
  operator: string;
  created_at: string;
}

export interface ExceptionAdjustment {
  id: string;
  package_id: string;
  student_id: string;
  adjustment: number;
  reason: string;
  approved_by: string;
  ledger_id?: string;
  created_at: string;
}

export interface FreezePackageRequest {
  package_id: string;
  freeze_date: string;
  unfreeze_date?: string;
  reason: string;
  operator: string;
}

export interface UnfreezePackageRequest {
  freeze_id: string;
  unfreeze_date: string;
  unfreeze_reason: string;
  expired_extend_reason?: string;
  operator: string;
}

export interface ConsumeLessonRequest {
  package_id: string;
  schedule_id: string;
  lesson_date: string;
  lessons_consumed?: number;
  teacher_id?: string;
  note?: string;
  operator: string;
}

export interface AdjustBalanceRequest {
  package_id: string;
  adjustment: number;
  reason: string;
  approved_by: string;
  operator: string;
}

export class BusinessError extends Error {
  constructor(message: string, public code: string = 'BUSINESS_ERROR') {
    super(message);
    this.name = 'BusinessError';
  }
}
