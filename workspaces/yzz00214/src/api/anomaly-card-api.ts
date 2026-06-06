import {
  AnomalyDetectionInput,
  MasterData,
  AnomalyApplicationRecord,
  SupportingMaterial,
  HistoricalData,
  TransactionRecord,
  ThresholdConfig,
  DEFAULT_THRESHOLD_CONFIG
} from '../models';
import { RuleEngine, RuleEngineResult, RiskLevel } from '../rules';
import {
  StatusManager,
  StatusDeterminationResult,
  TaskStatus,
  TASK_STATUS_LABELS
} from '../status';
import { RecordManager, ProcessingRecord, DataReplayResult } from '../records';

export interface AnomalyProcessResult {
  applicationId: string;
  cardId: string;
  studentId: string;
  taskStatus: TaskStatus;
  taskStatusLabel: string;
  riskLevel: RiskLevel;
  riskLevelLabel: string;
  totalRiskScore: number;
  canHandle: boolean;
  needSupplement: boolean;
  needReview: boolean;
  isLocked: boolean;
  isFailed: boolean;
  anomalyExplanation: string;
  failureExplanation?: string;
  calculationBasis: RuleEngineResult['calculationBasis'];
  statusReason: string;
  reviewReason?: string;
  materialStatus: {
    complete: boolean;
    verifiedCount: number;
    missingTypes: string[];
  };
}

export class AnomalyCardApi {
  private ruleEngine: RuleEngine;
  private statusManager: StatusManager;
  private recordManager: RecordManager;
  private thresholdConfig: ThresholdConfig;

  constructor(thresholdConfig?: ThresholdConfig) {
    this.ruleEngine = new RuleEngine();
    this.statusManager = new StatusManager();
    this.recordManager = new RecordManager();
    this.thresholdConfig = thresholdConfig || DEFAULT_THRESHOLD_CONFIG;
  }

  processApplication(input: AnomalyDetectionInput): AnomalyProcessResult {
    const {
      masterData,
      application,
      materials,
      historicalData,
      transactions,
      thresholdConfig
    } = input;

    const config = thresholdConfig || this.thresholdConfig;

    const ruleResult = this.ruleEngine.evaluate(
      transactions,
      masterData,
      config,
      historicalData,
      materials,
      application
    );

    const materialRule = ruleResult.ruleResults.find(r => r.ruleType === 'material');
    const materialComplete = materialRule ? !materialRule.triggered : false;
    const hasCriticalMissing = materialRule?.details?.missingRequiredTypes?.length > 0;
    const missingTypes = materialRule?.details?.missingRequiredTypes || [];
    const verifiedCount = materialRule?.details?.verifiedMaterials || 0;

    const isCardLocked = masterData.card.cardStatus === 'lost' ||
      masterData.card.cardStatus === 'frozen';

    const statusResult = this.statusManager.determineStatus({
      riskLevel: ruleResult.riskLevel,
      materialComplete,
      hasCriticalMissing,
      isCardLocked
    });

    const processingRecord = this.recordManager.createProcessingRecord({
      applicationId: application.applicationId,
      cardId: application.cardId,
      studentId: application.studentId,
      operator: 'system',
      previousStatus: 'pending',
      currentStatus: statusResult.targetStatus,
      trigger: 'risk_evaluate',
      reason: statusResult.statusReason,
      ruleResult
    });
    this.recordManager.addRecord(application.applicationId, processingRecord);

    const result: AnomalyProcessResult = {
      applicationId: application.applicationId,
      cardId: application.cardId,
      studentId: application.studentId,
      taskStatus: statusResult.targetStatus,
      taskStatusLabel: statusResult.statusLabel,
      riskLevel: ruleResult.riskLevel,
      riskLevelLabel: this.getRiskLevelLabel(ruleResult.riskLevel),
      totalRiskScore: ruleResult.totalRiskScore,
      canHandle: statusResult.targetStatus === 'processable',
      needSupplement: statusResult.targetStatus === 'supplement_required',
      needReview: statusResult.requireReview,
      isLocked: statusResult.targetStatus === 'locked',
      isFailed: statusResult.targetStatus === 'failed',
      anomalyExplanation: ruleResult.anomalyExplanation,
      failureExplanation: statusResult.targetStatus === 'failed'
        ? statusResult.statusReason
        : undefined,
      calculationBasis: ruleResult.calculationBasis,
      statusReason: statusResult.statusReason,
      reviewReason: statusResult.reviewReason,
      materialStatus: {
        complete: materialComplete,
        verifiedCount,
        missingTypes
      }
    };

    return result;
  }

  replayApplication(applicationId: string): DataReplayResult {
    return this.recordManager.replayData(applicationId);
  }

  getProcessingRecords(applicationId: string): ProcessingRecord[] {
    return this.recordManager.getRecords(applicationId);
  }

  private getRiskLevelLabel(level: RiskLevel): string {
    const labels: Record<RiskLevel, string> = {
      low: '低风险',
      medium: '中风险',
      high: '高风险',
      uncertain: '无法判定'
    };
    return labels[level];
  }

  updateThreshold(config: ThresholdConfig): void {
    this.thresholdConfig = config;
  }

  getThresholdConfig(): ThresholdConfig {
    return { ...this.thresholdConfig };
  }
}
