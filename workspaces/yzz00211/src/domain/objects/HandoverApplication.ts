import { Drug } from './Drug';

export interface ApplicationItem {
  id: string;
  drug: Drug;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  remainingQuantity: number;
  usedQuantity: number;
  usageRecordId?: string;
}

export enum ApplicationType {
  SHIFT_HANDOVER = 'shift_handover',
  DEPARTMENT_TRANSFER = 'department_transfer',
  RETURN_TO_PHARMACY = 'return_to_pharmacy',
}

export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REVIEW_REQUIRED = 'review_required',
}

export interface HandoverApplication {
  id: string;
  applicationNo: string;
  type: ApplicationType;
  applicantId: string;
  applicantName: string;
  fromDepartment: string;
  toDepartment: string;
  fromWard?: string;
  toWard?: string;
  items: ApplicationItem[];
  submitTime: string;
  remark?: string;
}

export interface ApplicationSummary {
  totalItemCount: number;
  totalQuantity: number;
  totalValue: number;
  totalRemainingQuantity: number;
  totalUsedQuantity: number;
  highRiskItemCount: number;
  drugCategoryCount: Record<string, number>;
}
