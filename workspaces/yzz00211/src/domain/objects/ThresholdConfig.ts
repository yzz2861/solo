import { DrugCategory } from './Drug';

export interface ThresholdByCategory {
  category: DrugCategory;
  maxQuantityPerHandover: number;
  maxValuePerHandover: number;
  maxItemsPerHandover: number;
}

export interface HighRiskThreshold {
  enableHighRiskReview: boolean;
  highRiskCategories: DrugCategory[];
  highRiskDrugCodes: string[];
}

export interface MaterialThreshold {
  requiredMaterialTypes: string[];
  requireItemLevelMaterials: boolean;
  minMaterialCount: number;
}

export interface HistoryThreshold {
  maxReviewTimes: number;
  maxRejectTimes: number;
  reviewWindowDays: number;
  enableHistoryCheck: boolean;
}

export interface QuantityDeviationThreshold {
  maxDeviationRatio: number;
  enableDeviationCheck: boolean;
}

export interface ThresholdConfig {
  id: string;
  name: string;
  version: string;
  effectiveTime: string;
  categoryThresholds: ThresholdByCategory[];
  generalThreshold: {
    maxTotalQuantity: number;
    maxTotalValue: number;
    maxItemCount: number;
  };
  highRisk: HighRiskThreshold;
  material: MaterialThreshold;
  history: HistoryThreshold;
  quantityDeviation: QuantityDeviationThreshold;
}
