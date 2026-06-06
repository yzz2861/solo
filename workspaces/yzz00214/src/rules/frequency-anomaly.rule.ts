import { BaseRule, RuleResult } from './base-rule';
import { TransactionRecord, MasterData, ThresholdConfig } from '../models';

export class FrequencyAnomalyRule extends BaseRule {
  ruleName = '频次异常检测规则';
  ruleType = 'frequency';

  evaluate(
    transactions: TransactionRecord[],
    masterData: MasterData,
    thresholdConfig: ThresholdConfig
  ): RuleResult {
    const { frequencyThreshold } = thresholdConfig;
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

    const dailyCount = consumeTransactions.length;
    const avgDailyCount = usualPattern.avgTransactionCount || 5;

    const sortedTransactions = [...consumeTransactions].sort(
      (a, b) => new Date(a.transactionTime).getTime() - new Date(b.transactionTime).getTime()
    );

    let maxHourlyCount = 0;
    let maxShortIntervalCount = 0;

    for (let i = 0; i < sortedTransactions.length; i++) {
      const currentTime = new Date(sortedTransactions[i].transactionTime).getTime();
      const oneHourLater = currentTime + 60 * 60 * 1000;
      const shortIntervalLater = currentTime + frequencyThreshold.shortIntervalMinutes * 60 * 1000;

      let hourlyCount = 0;
      let shortIntervalCount = 0;
      for (let j = i; j < sortedTransactions.length; j++) {
        const tTime = new Date(sortedTransactions[j].transactionTime).getTime();
        if (tTime <= oneHourLater) hourlyCount++;
        if (tTime <= shortIntervalLater) shortIntervalCount++;
      }
      maxHourlyCount = Math.max(maxHourlyCount, hourlyCount);
      maxShortIntervalCount = Math.max(maxShortIntervalCount, shortIntervalCount);
    }

    let riskScore = 0;
    const explanations: string[] = [];
    const details: Record<string, any> = {
      dailyCount,
      avgDailyCount,
      maxHourlyCount,
      maxShortIntervalCount
    };

    if (dailyCount >= frequencyThreshold.dailyCountHigh) {
      riskScore += 20;
      explanations.push(`日消费${dailyCount}笔，超过高风险阈值${frequencyThreshold.dailyCountHigh}笔`);
    } else if (dailyCount >= frequencyThreshold.dailyCountMedium) {
      riskScore += 10;
      explanations.push(`日消费${dailyCount}笔，超过中风险阈值${frequencyThreshold.dailyCountMedium}笔`);
    }

    if (maxHourlyCount >= frequencyThreshold.hourlyCountHigh) {
      riskScore += 20;
      explanations.push(`小时内消费${maxHourlyCount}笔，超过阈值${frequencyThreshold.hourlyCountHigh}笔`);
    }

    if (maxShortIntervalCount >= frequencyThreshold.shortIntervalCount) {
      riskScore += 25;
      explanations.push(`${frequencyThreshold.shortIntervalMinutes}分钟内消费${maxShortIntervalCount}笔，存在短时间密集消费`);
    }

    return {
      ruleName: this.ruleName,
      ruleType: this.ruleType,
      triggered: riskScore > 0,
      riskScore,
      explanation: explanations.length > 0 ? explanations.join('；') : '消费频次正常',
      details
    };
  }
}
