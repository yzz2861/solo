import {
  HandoverApplication,
  SupportingMaterial,
  ApplicationHistory,
  ThresholdConfig,
  ApplicationSummary,
} from '../objects';
import {
  RuleEngine,
  RuleEngineOutput,
  RuleEngineInput,
  calculateSummary,
} from '../rules';
import {
  StateDecisionEngine,
  HandoverState,
  DecisionType,
  AutoDecisionResult,
  StateEvent,
} from '../states';
import {
  HandoverRecord,
  HandoverRecordFactory,
  AuditLogger,
  AuditLogAction,
  AuditLogLevel,
  getRiskLevel,
} from '../records';

export interface HandoverServiceInput {
  application: HandoverApplication;
  materials: SupportingMaterial[];
  history: ApplicationHistory;
  thresholdConfig: ThresholdConfig;
  operatorId?: string;
  operatorName?: string;
}

export interface HandoverServiceOutput {
  success: boolean;
  applicationId: string;
  finalState: HandoverState;
  decision: DecisionType;
  reasons: string[];
  riskTags: string[];
  riskLevel: 'high' | 'medium' | 'low';
  summary: ApplicationSummary;
  ruleResults: RuleEngineOutput;
  recordId: string;
  recordNo: string;
  logCount: number;
}

export class HandoverService {
  private ruleEngine: RuleEngine;
  private auditLogger: AuditLogger;
  private records: Map<string, HandoverRecord> = new Map();

  constructor(ruleEngine?: RuleEngine, auditLogger?: AuditLogger) {
    this.ruleEngine = ruleEngine || new RuleEngine();
    this.auditLogger = auditLogger || new AuditLogger();
  }

  processHandover(input: HandoverServiceInput): HandoverServiceOutput {
    const { application, materials, history, thresholdConfig, operatorId, operatorName } = input;

    this.auditLogger.log({
      applicationId: application.id,
      action: AuditLogAction.RULE_CHECK,
      level: AuditLogLevel.INFO,
      operatorId,
      operatorName,
      message: `开始处理交接申请 ${application.applicationNo}`,
      detail: {
        itemCount: application.items.length,
        materialCount: materials.length,
      },
    });

    const summary = calculateSummary(application);

    this.auditLogger.log({
      applicationId: application.id,
      action: AuditLogAction.RULE_CHECK,
      level: AuditLogLevel.INFO,
      operatorId,
      operatorName,
      message: `汇总计算完成：总数量${summary.totalQuantity}，总金额${summary.totalValue}，高风险${summary.highRiskItemCount}个`,
      detail: { summary },
    });

    const ruleInput: RuleEngineInput = {
      application,
      materials,
      history,
      thresholdConfig,
      summary,
    };

    const ruleOutput = this.ruleEngine.execute(ruleInput);

    ruleOutput.results.forEach((result) => {
      if (!result.passed) {
        this.auditLogger.log({
          applicationId: application.id,
          action: AuditLogAction.RULE_CHECK,
          level:
            result.severity === 'error'
              ? AuditLogLevel.ERROR
              : result.severity === 'review'
              ? AuditLogLevel.REVIEW
              : AuditLogLevel.WARNING,
          operatorId,
          operatorName,
          message: `[${result.ruleId}] ${result.message}`,
          detail: {
            ruleId: result.ruleId,
            ruleName: result.ruleName,
            category: result.category,
            severity: result.severity,
            detail: result.detail,
            affectedItems: result.affectedItems,
          },
        });
      }
    });

    const decisionEngine = new StateDecisionEngine(HandoverState.SUBMITTED);
    const decisionResult = decisionEngine.evaluate(ruleOutput);

    const transitionEvent = this.getTransitionEvent(decisionResult.decision);
    const transitionResult = decisionEngine.executeTransition(transitionEvent);

    if (transitionResult.success) {
      this.auditLogger.log({
        applicationId: application.id,
        action: this.getLogAction(decisionResult.decision),
        level:
          decisionResult.decision === DecisionType.REJECT
            ? AuditLogLevel.ERROR
            : decisionResult.decision === DecisionType.REVIEW_REQUIRED
            ? AuditLogLevel.REVIEW
            : AuditLogLevel.INFO,
        operatorId,
        operatorName,
        message: `状态变更：${transitionResult.previousState} → ${transitionResult.currentState}`,
        fromState: transitionResult.previousState,
        toState: transitionResult.currentState,
        event: transitionEvent,
      });
    }

    const record = HandoverRecordFactory.create({
      application,
      summary,
      materials,
      history,
      thresholdConfig,
      finalState: decisionResult.targetState,
      decision: decisionResult.decision,
      riskTags: decisionResult.riskTags,
      reasons: decisionResult.reasons,
      ruleEngineOutput: ruleOutput,
      operatorId,
      operatorName,
    });

    this.records.set(record.id, record);

    const logs = this.auditLogger.getLogs(application.id);

    return {
      success: true,
      applicationId: application.id,
      finalState: decisionResult.targetState,
      decision: decisionResult.decision,
      reasons: decisionResult.reasons,
      riskTags: decisionResult.riskTags,
      riskLevel: getRiskLevel(decisionResult.riskTags),
      summary,
      ruleResults: ruleOutput,
      recordId: record.id,
      recordNo: record.recordNo,
      logCount: logs.length,
    };
  }

  private getTransitionEvent(decision: DecisionType): StateEvent {
    switch (decision) {
      case DecisionType.PASS:
        return StateEvent.APPROVE;
      case DecisionType.REJECT:
        return StateEvent.REJECT;
      case DecisionType.REVIEW_REQUIRED:
        return StateEvent.REVIEW;
      default:
        return StateEvent.REVIEW;
    }
  }

  private getLogAction(decision: DecisionType): AuditLogAction {
    switch (decision) {
      case DecisionType.PASS:
        return AuditLogAction.APPROVE;
      case DecisionType.REJECT:
        return AuditLogAction.REJECT;
      case DecisionType.REVIEW_REQUIRED:
        return AuditLogAction.REVIEW;
      default:
        return AuditLogAction.SYSTEM;
    }
  }

  getRecord(recordId: string): HandoverRecord | undefined {
    return this.records.get(recordId);
  }

  getRecordsByApplication(applicationId: string): HandoverRecord[] {
    return Array.from(this.records.values()).filter(
      (r) => r.applicationId === applicationId
    );
  }

  getAllRecords(): HandoverRecord[] {
    return Array.from(this.records.values());
  }

  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }
}
