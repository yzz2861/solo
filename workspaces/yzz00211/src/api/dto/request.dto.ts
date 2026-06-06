import {
  DrugCategory,
  DrugUnit,
  ApplicationType,
  MaterialType,
  HistoricalStatusType,
} from '../../domain';

export interface DrugDTO {
  id: string;
  code: string;
  name: string;
  genericName: string;
  category: DrugCategory;
  specification: string;
  unit: DrugUnit;
  dosagePerUnit: number;
  isHighRisk: boolean;
  controlledLevel: number;
}

export interface ApplicationItemDTO {
  id: string;
  drug: DrugDTO;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  remainingQuantity: number;
  usedQuantity: number;
  usageRecordId?: string;
}

export interface HandoverApplicationDTO {
  id: string;
  applicationNo: string;
  type: ApplicationType;
  applicantId: string;
  applicantName: string;
  fromDepartment: string;
  toDepartment: string;
  fromWard?: string;
  toWard?: string;
  items: ApplicationItemDTO[];
  submitTime: string;
  remark?: string;
}

export interface SupportingMaterialDTO {
  id: string;
  type: MaterialType;
  name: string;
  url: string;
  uploadTime: string;
  uploaderId: string;
  relatedItemId?: string;
}

export interface HistoricalStatusRecordDTO {
  id: string;
  status: HistoricalStatusType;
  operatorId: string;
  operatorName: string;
  operateTime: string;
  remark?: string;
  riskTags?: string[];
}

export interface ApplicationHistoryDTO {
  applicationId: string;
  records: HistoricalStatusRecordDTO[];
  currentStatus: HistoricalStatusType;
}

export interface ThresholdConfigDTO {
  id: string;
  name: string;
  version: string;
  effectiveTime: string;
  categoryThresholds: Array<{
    category: DrugCategory;
    maxQuantityPerHandover: number;
    maxValuePerHandover: number;
    maxItemsPerHandover: number;
  }>;
  generalThreshold: {
    maxTotalQuantity: number;
    maxTotalValue: number;
    maxItemCount: number;
  };
  highRisk: {
    enableHighRiskReview: boolean;
    highRiskCategories: DrugCategory[];
    highRiskDrugCodes: string[];
  };
  material: {
    requiredMaterialTypes: string[];
    requireItemLevelMaterials: boolean;
    minMaterialCount: number;
  };
  history: {
    maxReviewTimes: number;
    maxRejectTimes: number;
    reviewWindowDays: number;
    enableHistoryCheck: boolean;
  };
  quantityDeviation: {
    maxDeviationRatio: number;
    enableDeviationCheck: boolean;
  };
}

export interface HandoverRequestDTO {
  application: HandoverApplicationDTO;
  materials: SupportingMaterialDTO[];
  history: ApplicationHistoryDTO;
  thresholdConfig: ThresholdConfigDTO;
  operatorId?: string;
  operatorName?: string;
}
