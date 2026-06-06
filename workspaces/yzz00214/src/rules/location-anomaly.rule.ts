import { BaseRule, RuleResult } from './base-rule';
import { TransactionRecord, MasterData, ThresholdConfig } from '../models';

export class LocationAnomalyRule extends BaseRule {
  ruleName = '地点异常检测规则';
  ruleType = 'location';

  evaluate(
    transactions: TransactionRecord[],
    masterData: MasterData,
    thresholdConfig: ThresholdConfig
  ): RuleResult {
    const { locationThreshold } = thresholdConfig;
    const usualPattern = masterData.student.usualConsumptionPattern;
    const consumeTransactions = transactions.filter(t => t.transactionType === 'consume');

    if (consumeTransactions.length === 0) {
      return {
        ruleName: this.ruleName,
        ruleType: this.ruleType,
        triggered: false,
        riskScore: 0,
        explanation: '无消费交易记录',
        details: {}
      };
    }

    const commonLocations = usualPattern.commonLocations || [];
    const unusualTransactions = consumeTransactions.filter(
      t => !commonLocations.includes(t.location)
    );

    const uniqueLocations = [...new Set(consumeTransactions.map(t => t.location))];
    const unusualLocations = [...new Set(unusualTransactions.map(t => t.location))];

    const sortedTransactions = [...consumeTransactions].sort(
      (a, b) => new Date(a.transactionTime).getTime() - new Date(b.transactionTime).getTime()
    );

    let hasFastLocationChange = false;
    for (let i = 1; i < sortedTransactions.length; i++) {
      const prevTime = new Date(sortedTransactions[i - 1].transactionTime).getTime();
      const currTime = new Date(sortedTransactions[i].transactionTime).getTime();
      const timeDiffHours = (currTime - prevTime) / (1000 * 60 * 60);
      const prevLoc = sortedTransactions[i - 1].location;
      const currLoc = sortedTransactions[i].location;

      if (prevLoc !== currLoc && timeDiffHours < locationThreshold.crossCampusWithinHours) {
        hasFastLocationChange = true;
        break;
      }
    }

    let riskScore = 0;
    const explanations: string[] = [];
    const details: Record<string, any> = {
      totalTransactions: consumeTransactions.length,
      unusualTransactionCount: unusualTransactions.length,
      unusualLocations: unusualLocations,
      hasFastLocationChange
    };

    if (unusualTransactions.length > 0) {
      const locationRisk = Math.min(unusualTransactions.length * locationThreshold.unusualLocationWeight, 30);
      riskScore += locationRisk;
      explanations.push(`存在${unusualTransactions.length}笔非常用地点消费：${unusualLocations.join('、')}`);
    }

    if (hasFastLocationChange) {
      riskScore += 25;
      explanations.push(`存在${locationThreshold.crossCampusWithinHours}小时内跨地点消费，不符合物理移动规律`);
    }

    return {
      ruleName: this.ruleName,
      ruleType: this.ruleType,
      triggered: riskScore > 0,
      riskScore,
      explanation: explanations.length > 0 ? explanations.join('；') : '消费地点正常',
      details
    };
  }
}
