import {
  HandoverApplication,
  ApplicationItem,
  Drug,
  SupportingMaterial,
  MaterialStatus,
  ApplicationHistory,
  HistoricalStatusRecord,
  ThresholdConfig,
  HistoricalStatusType,
} from '../../domain';
import {
  HandoverRequestDTO,
  HandoverApplicationDTO,
  ApplicationItemDTO,
  DrugDTO,
  SupportingMaterialDTO,
  ApplicationHistoryDTO,
  HistoricalStatusRecordDTO,
  ThresholdConfigDTO,
} from '../dto/request.dto';

export function mapDrugDTOToDomain(dto: DrugDTO): Drug {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    genericName: dto.genericName,
    category: dto.category,
    specification: dto.specification,
    unit: dto.unit,
    dosagePerUnit: dto.dosagePerUnit,
    isHighRisk: dto.isHighRisk,
    controlledLevel: dto.controlledLevel,
  };
}

export function mapApplicationItemDTOToDomain(dto: ApplicationItemDTO): ApplicationItem {
  return {
    id: dto.id,
    drug: mapDrugDTOToDomain(dto.drug),
    batchNumber: dto.batchNumber,
    productionDate: dto.productionDate,
    expiryDate: dto.expiryDate,
    quantity: dto.quantity,
    unitPrice: dto.unitPrice,
    remainingQuantity: dto.remainingQuantity,
    usedQuantity: dto.usedQuantity,
    usageRecordId: dto.usageRecordId,
  };
}

export function mapApplicationDTOToDomain(dto: HandoverApplicationDTO): HandoverApplication {
  return {
    id: dto.id,
    applicationNo: dto.applicationNo,
    type: dto.type,
    applicantId: dto.applicantId,
    applicantName: dto.applicantName,
    fromDepartment: dto.fromDepartment,
    toDepartment: dto.toDepartment,
    fromWard: dto.fromWard,
    toWard: dto.toWard,
    items: dto.items.map(mapApplicationItemDTOToDomain),
    submitTime: dto.submitTime,
    remark: dto.remark,
  };
}

export function mapMaterialDTOToDomain(dto: SupportingMaterialDTO): SupportingMaterial {
  return {
    id: dto.id,
    type: dto.type,
    name: dto.name,
    url: dto.url,
    uploadTime: dto.uploadTime,
    uploaderId: dto.uploaderId,
    status: MaterialStatus.UPLOADED,
    relatedItemId: dto.relatedItemId,
  };
}

export function mapHistoricalRecordDTOToDomain(
  dto: HistoricalStatusRecordDTO,
  applicationId: string
): HistoricalStatusRecord {
  return {
    id: dto.id,
    applicationId,
    status: dto.status,
    operatorId: dto.operatorId,
    operatorName: dto.operatorName,
    operateTime: dto.operateTime,
    remark: dto.remark,
    riskTags: dto.riskTags,
  };
}

export function mapHistoryDTOToDomain(dto: ApplicationHistoryDTO): ApplicationHistory {
  const records: HistoricalStatusRecord[] = dto.records.map((r: HistoricalStatusRecordDTO) =>
    mapHistoricalRecordDTOToDomain(r, dto.applicationId)
  );
  const reviewCount = records.filter(
    (r: HistoricalStatusRecord) =>
      r.status === HistoricalStatusType.REVIEW_REQUIRED ||
      r.status === HistoricalStatusType.REVIEW_PASSED ||
      r.status === HistoricalStatusType.REVIEW_REJECTED
  ).length;
  const rejectCount = records.filter(
    (r: HistoricalStatusRecord) =>
      r.status === HistoricalStatusType.REJECTED ||
      r.status === HistoricalStatusType.REVIEW_REJECTED
  ).length;
  const hasHighRiskHistory = records.some(
    (r: HistoricalStatusRecord) => r.riskTags && r.riskTags.length > 0
  );

  return {
    applicationId: dto.applicationId,
    records,
    currentStatus: dto.currentStatus,
    reviewCount,
    rejectCount,
    hasHighRiskHistory,
  };
}

export function mapThresholdDTOToDomain(dto: ThresholdConfigDTO): ThresholdConfig {
  return {
    id: dto.id,
    name: dto.name,
    version: dto.version,
    effectiveTime: dto.effectiveTime,
    categoryThresholds: dto.categoryThresholds.map((ct) => ({
      category: ct.category,
      maxQuantityPerHandover: ct.maxQuantityPerHandover,
      maxValuePerHandover: ct.maxValuePerHandover,
      maxItemsPerHandover: ct.maxItemsPerHandover,
    })),
    generalThreshold: {
      maxTotalQuantity: dto.generalThreshold.maxTotalQuantity,
      maxTotalValue: dto.generalThreshold.maxTotalValue,
      maxItemCount: dto.generalThreshold.maxItemCount,
    },
    highRisk: {
      enableHighRiskReview: dto.highRisk.enableHighRiskReview,
      highRiskCategories: dto.highRisk.highRiskCategories,
      highRiskDrugCodes: dto.highRisk.highRiskDrugCodes,
    },
    material: {
      requiredMaterialTypes: dto.material.requiredMaterialTypes,
      requireItemLevelMaterials: dto.material.requireItemLevelMaterials,
      minMaterialCount: dto.material.minMaterialCount,
    },
    history: {
      maxReviewTimes: dto.history.maxReviewTimes,
      maxRejectTimes: dto.history.maxRejectTimes,
      reviewWindowDays: dto.history.reviewWindowDays,
      enableHistoryCheck: dto.history.enableHistoryCheck,
    },
    quantityDeviation: {
      maxDeviationRatio: dto.quantityDeviation.maxDeviationRatio,
      enableDeviationCheck: dto.quantityDeviation.enableDeviationCheck,
    },
  };
}

export function mapRequestToDomain(dto: HandoverRequestDTO) {
  return {
    application: mapApplicationDTOToDomain(dto.application),
    materials: dto.materials.map(mapMaterialDTOToDomain),
    history: mapHistoryDTOToDomain(dto.history),
    thresholdConfig: mapThresholdDTOToDomain(dto.thresholdConfig),
    operatorId: dto.operatorId,
    operatorName: dto.operatorName,
  };
}
