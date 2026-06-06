import { BaseRule, RuleResult } from './base-rule';
import { TransactionRecord, MasterData, ThresholdConfig, HistoricalData } from '../models';

export interface HistoricalRuleContext {
  historicalData: HistoricalData;
}

export class HistoricalAnomalyRule extends BaseRule {
  ruleName = '历史异常检测规则';
  ruleType = 'historical';

  evaluate(
    transactions: TransactionRecord[],
    masterData: MasterData,
    thresholdConfig: ThresholdConfig,
    context?: HistoricalRuleContext
  ): RuleResult {
    const historicalData = context?.historicalData;

    if (!historicalData) {
      return {
        ruleName: this.ruleName,
        ruleType: this.ruleType,
        triggered: false,
        riskScore: 0,
        explanation: '无历史数据',
        details: {}
      };
    }

    const { anomalyHistory } = historicalData;
    const unresolvedAnomalies = anomalyHistory.filter(a => a.resolutionStatus === 'unresolved');
    const pendingAnomalies = anomalyHistory.filter(a => a.resolutionStatus === 'pending');
    const totalAnomalies = anomalyHistory.length;

    let riskScore = 0;
    const explanations: string[] = [];
    const details: Record<string, any> = {
      totalAnomalyCount: totalAnomalies,
      unresolvedCount: unresolvedAnomalies.length,
      pendingCount: pendingAnomalies.length
    };

    if (unresolvedAnomalies.length > 0) {
      riskScore += unresolvedAnomalies.length * 20;
      explanations.push(`存在${unresolvedAnomalies.length}起未解决的历史异常记录`);
    }

    if (pendingAnomalies.length > 0) {
      riskScore += pendingAnomalies.length * 10;
      explanations.push(`存在${pendingAnomalies.length}起待处理的历史异常记录`);
    }

    if (totalAnomalies >= 3) {
      riskScore += 15;
      explanations.push(`历史异常记录共${totalAnomalies}起，次数较多`);
    }

    if (riskScore === 0) {
      explanations.push('历史记录良好');
    }

    return {
      ruleName: this.ruleName,
      ruleType: this.ruleType,
      triggered: riskScore > 0,
      riskScore,
      explanation: explanations.join('；'),
      details
    };
  }
}
