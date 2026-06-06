import { BaseRule, RuleResult } from './base-rule';
import { TransactionRecord, MasterData, ThresholdConfig } from '../models';

export class AmountAnomalyRule extends BaseRule {
  ruleName = '金额异常检测规则';
  ruleType = 'amount';

  evaluate(
    transactions: TransactionRecord[],
    masterData: MasterData,
    thresholdConfig: ThresholdConfig
  ): RuleResult {
    const { amountThreshold } = thresholdConfig;
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

    const maxSingleAmount = Math.max(...consumeTransactions.map(t => t.amount));
    const totalDailyAmount = consumeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const avgDailyAmount = usualPattern.avgDailyAmount || 50;
    const deviationRatio = avgDailyAmount > 0 ? totalDailyAmount / avgDailyAmount : 1;

    let riskScore = 0;
    const explanations: string[] = [];
    const details: Record<string, any> = {
      maxSingleAmount,
      totalDailyAmount,
      avgDailyAmount,
      deviationRatio: deviationRatio.toFixed(2)
    };

    if (maxSingleAmount >= amountThreshold.singleTransactionHigh) {
      riskScore += 30;
      explanations.push(`单笔消费${maxSingleAmount}元，超过高风险阈值${amountThreshold.singleTransactionHigh}元`);
    } else if (maxSingleAmount >= amountThreshold.singleTransactionMedium) {
      riskScore += 15;
      explanations.push(`单笔消费${maxSingleAmount}元，超过中风险阈值${amountThreshold.singleTransactionMedium}元`);
    }

    if (totalDailyAmount >= amountThreshold.dailyTotalHigh) {
      riskScore += 25;
      explanations.push(`日累计消费${totalDailyAmount}元，超过高风险阈值${amountThreshold.dailyTotalHigh}元`);
    } else if (totalDailyAmount >= amountThreshold.dailyTotalMedium) {
      riskScore += 12;
      explanations.push(`日累计消费${totalDailyAmount}元，超过中风险阈值${amountThreshold.dailyTotalMedium}元`);
    }

    if (deviationRatio >= amountThreshold.deviationFromAverageHigh) {
      riskScore += 20;
      explanations.push(`消费金额是日常均值的${deviationRatio.toFixed(1)}倍，超过高风险倍数${amountThreshold.deviationFromAverageHigh}倍`);
    } else if (deviationRatio >= amountThreshold.deviationFromAverageMedium) {
      riskScore += 10;
      explanations.push(`消费金额是日常均值的${deviationRatio.toFixed(1)}倍，超过中风险倍数${amountThreshold.deviationFromAverageMedium}倍`);
    }

    return {
      ruleName: this.ruleName,
      ruleType: this.ruleType,
      triggered: riskScore > 0,
      riskScore,
      explanation: explanations.length > 0 ? explanations.join('；') : '金额正常',
      details
    };
  }
}
