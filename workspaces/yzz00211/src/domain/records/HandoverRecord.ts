import { v4 as uuidv4 } from 'uuid';
import {
  HandoverApplication,
  ApplicationSummary,
  SupportingMaterial,
  ApplicationHistory,
  ThresholdConfig,
} from '../objects';
import { HandoverState, DecisionType } from '../states';
import { RuleEngineOutput, RuleResult } from '../rules';

export interface HandoverRecord {
  id: string;
  recordNo: string;
  applicationId: string;
  application: HandoverApplication;
  summary: ApplicationSummary;
  materials: SupportingMaterial[];
  history: ApplicationHistory;
  thresholdConfig: ThresholdConfig;
  finalState: HandoverState;
  decision: DecisionType;
  riskTags: string[];
  reasons: string[];
  ruleResults: RuleResult[];
  ruleEngineOutput: RuleEngineOutput;
  createTime: string;
  operatorId?: string;
  operatorName?: string;
}

export class HandoverRecordFactory {
  static create(params: {
    application: HandoverApplication;
    summary: ApplicationSummary;
    materials: SupportingMaterial[];
    history: ApplicationHistory;
    thresholdConfig: ThresholdConfig;
    finalState: HandoverState;
    decision: DecisionType;
    riskTags: string[];
    reasons: string[];
    ruleEngineOutput: RuleEngineOutput;
    operatorId?: string;
    operatorName?: string;
  }): HandoverRecord {
    const now = new Date();
    const recordNo = `HJ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    return {
      id: uuidv4(),
      recordNo,
      applicationId: params.application.id,
      application: params.application,
      summary: params.summary,
      materials: params.materials,
      history: params.history,
      thresholdConfig: params.thresholdConfig,
      finalState: params.finalState,
      decision: params.decision,
      riskTags: params.riskTags,
      reasons: params.reasons,
      ruleResults: params.ruleEngineOutput.results,
      ruleEngineOutput: params.ruleEngineOutput,
      createTime: now.toISOString(),
      operatorId: params.operatorId,
      operatorName: params.operatorName,
    };
  }
}
