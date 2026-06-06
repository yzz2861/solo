import { BaseRule, RuleResult } from './base-rule';
import { TransactionRecord, MasterData, ThresholdConfig } from '../models';

export class TimeAnomalyRule extends BaseRule {
  ruleName = '时间异常检测规则';
  ruleType = 'time';

  evaluate(
    transactions: TransactionRecord[],
    masterData: MasterData,
    thresholdConfig: ThresholdConfig
  ): RuleResult {
    const { timeThreshold } = thresholdConfig;
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

    const lateNightStart = this.parseTime(timeThreshold.lateNightStart);
    const lateNightEnd = this.parseTime(timeThreshold.lateNightEnd);
    const commonStart = this.parseTime(usualPattern.commonTimeRange.start);
    const commonEnd = this.parseTime(usualPattern.commonTimeRange.end);

    const lateNightTransactions: string[] = [];
    const unusualTimeTransactions: string[] = [];

    for (const t of consumeTransactions) {
      const time = this.parseTimeFromDate(t.transactionTime);
      if (this.isLateNight(time, lateNightStart, lateNightEnd)) {
        lateNightTransactions.push(t.transactionId);
      }
      if (!this.isInCommonTime(time, commonStart, commonEnd)) {
        unusualTimeTransactions.push(t.transactionId);
      }
    }

    let riskScore = 0;
    const explanations: string[] = [];
    const details: Record<string, any> = {
      totalTransactions: consumeTransactions.length,
      lateNightCount: lateNightTransactions.length,
      unusualTimeCount: unusualTimeTransactions.length,
      lateNightTransactionIds: lateNightTransactions
    };

    if (lateNightTransactions.length > 0) {
      riskScore += timeThreshold.unusualTimeWeight * 1.5;
      explanations.push(`存在${lateNightTransactions.length}笔深夜消费（${timeThreshold.lateNightStart}-${timeThreshold.lateNightEnd}）`);
    }

    if (unusualTimeTransactions.length > 0 && lateNightTransactions.length === 0) {
      riskScore += timeThreshold.unusualTimeWeight * 0.5;
      explanations.push(`存在${unusualTimeTransactions.length}笔非惯常时段消费`);
    }

    return {
      ruleName: this.ruleName,
      ruleType: this.ruleType,
      triggered: riskScore > 0,
      riskScore,
      explanation: explanations.length > 0 ? explanations.join('；') : '消费时间正常',
      details
    };
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private parseTimeFromDate(dateStr: string): number {
    const date = new Date(dateStr);
    return date.getHours() * 60 + date.getMinutes();
  }

  private isLateNight(time: number, start: number, end: number): boolean {
    if (start > end) {
      return time >= start || time < end;
    }
    return time >= start && time < end;
  }

  private isInCommonTime(time: number, start: number, end: number): boolean {
    if (start > end) {
      return time >= start || time < end;
    }
    return time >= start && time < end;
  }
}
