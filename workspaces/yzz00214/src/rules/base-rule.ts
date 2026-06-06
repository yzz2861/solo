import { TransactionRecord, MasterData, ThresholdConfig } from '../models';

export interface RuleResult {
  ruleName: string;
  ruleType: string;
  triggered: boolean;
  riskScore: number;
  explanation: string;
  details: Record<string, any>;
}

export abstract class BaseRule {
  abstract ruleName: string;
  abstract ruleType: string;

  abstract evaluate(
    transactions: TransactionRecord[],
    masterData: MasterData,
    thresholdConfig: ThresholdConfig
  ): RuleResult;
}
