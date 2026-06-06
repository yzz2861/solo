import {
  MasterData,
  StudentMasterData,
  ConsumptionPattern,
  CardMasterData
} from './master-data';
import {
  AnomalyApplicationRecord,
  TransactionRecord,
  AnomalyType
} from './application-record';
import {
  SupportingMaterial,
  SupportingMaterialType,
  REQUIRED_MATERIALS_BY_ANOMALY_TYPE
} from './supporting-material';
import {
  HistoricalStatusRecord,
  HistoricalAnomaly,
  HistoricalData
} from './historical-status';
import {
  ThresholdConfig,
  AmountThreshold,
  FrequencyThreshold,
  LocationThreshold,
  TimeThreshold,
  RiskScoreThreshold,
  MaterialThreshold,
  DEFAULT_THRESHOLD_CONFIG
} from './threshold-config';

export {
  MasterData,
  StudentMasterData,
  ConsumptionPattern,
  CardMasterData,
  AnomalyApplicationRecord,
  TransactionRecord,
  AnomalyType,
  SupportingMaterial,
  SupportingMaterialType,
  REQUIRED_MATERIALS_BY_ANOMALY_TYPE,
  HistoricalStatusRecord,
  HistoricalAnomaly,
  HistoricalData,
  ThresholdConfig,
  AmountThreshold,
  FrequencyThreshold,
  LocationThreshold,
  TimeThreshold,
  RiskScoreThreshold,
  MaterialThreshold,
  DEFAULT_THRESHOLD_CONFIG
};

export interface AnomalyDetectionInput {
  masterData: MasterData;
  application: AnomalyApplicationRecord;
  materials: SupportingMaterial[];
  historicalData: HistoricalData;
  transactions: TransactionRecord[];
  thresholdConfig: ThresholdConfig;
}
