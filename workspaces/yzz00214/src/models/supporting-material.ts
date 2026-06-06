export interface SupportingMaterial {
  materialId: string;
  applicationId: string;
  materialType: SupportingMaterialType;
  materialName: string;
  uploadTime: string;
  uploader: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  fileUrl?: string;
  description?: string;
}

export type SupportingMaterialType =
  | 'police_report'
  | 'loss_report'
  | 'consumption_proof'
  | 'identity_proof'
  | 'screenshot'
  | 'witness_statement'
  | 'other';

export const REQUIRED_MATERIALS_BY_ANOMALY_TYPE: Record<string, SupportingMaterialType[]> = {
  stolen_card: ['police_report', 'identity_proof'],
  lost_card: ['loss_report', 'identity_proof'],
  unauthorized_consumption: ['consumption_proof', 'identity_proof'],
  abnormal_amount: ['consumption_proof'],
  abnormal_location: ['consumption_proof'],
  system_error: ['screenshot'],
  other: ['other']
};
