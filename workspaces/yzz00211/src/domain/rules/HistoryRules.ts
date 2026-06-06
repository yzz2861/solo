import { IRule, RuleResult, RuleCategory, RuleSeverity, RuleEngineInput } from './RuleTypes';
import { HistoricalStatusType } from '../objects';

export class HistoryReviewCountRule implements IRule {
  id = 'HISTORY_001';
  name = '历史复核次数校验';
  category = RuleCategory.HISTORY;

  execute(input: RuleEngineInput): RuleResult {
    const { history, thresholdConfig } = input;
    const { history: historyThreshold } = thresholdConfig;

    if (!historyThreshold.enableHistoryCheck) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: RuleSeverity.PASS,
        passed: true,
        message: '历史校验未启用，跳过',
      };
    }

    const detail: Record<string, unknown> = {
      reviewCount: history.reviewCount,
      maxReviewTimes: historyThreshold.maxReviewTimes,
      rejectCount: history.rejectCount,
      maxRejectTimes: historyThreshold.maxRejectTimes,
    };

    const tooManyReviews = history.reviewCount >= historyThreshold.maxReviewTimes;
    const tooManyRejects = history.rejectCount >= historyThreshold.maxRejectTimes;

    if (tooManyRejects) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: RuleSeverity.ERROR,
        passed: false,
        message: `历史驳回次数${history.rejectCount}次，已达上限${historyThreshold.maxRejectTimes}次，不予通过`,
        detail,
      };
    }

    if (tooManyReviews) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: RuleSeverity.REVIEW,
        passed: false,
        message: `历史复核次数${history.reviewCount}次，已达上限${historyThreshold.maxReviewTimes}次，需重点复核`,
        detail,
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: RuleSeverity.PASS,
      passed: true,
      message: '历史复核次数校验通过',
      detail,
    };
  }
}

export class HistoryHighRiskRule implements IRule {
  id = 'HISTORY_002';
  name = '历史高风险校验';
  category = RuleCategory.HISTORY;

  execute(input: RuleEngineInput): RuleResult {
    const { history, thresholdConfig } = input;
    const { history: historyThreshold } = thresholdConfig;

    if (!historyThreshold.enableHistoryCheck) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: RuleSeverity.PASS,
        passed: true,
        message: '历史校验未启用，跳过',
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: history.hasHighRiskHistory ? RuleSeverity.REVIEW : RuleSeverity.PASS,
      passed: !history.hasHighRiskHistory,
      message: history.hasHighRiskHistory
        ? '存在历史高风险记录，需复核'
        : '无历史高风险记录，校验通过',
      detail: {
        hasHighRiskHistory: history.hasHighRiskHistory,
      },
    };
  }
}

export class CurrentStatusRule implements IRule {
  id = 'HISTORY_003';
  name = '当前状态校验';
  category = RuleCategory.HISTORY;

  execute(input: RuleEngineInput): RuleResult {
    const { history } = input;

    const canSubmit = [
      HistoricalStatusType.SUBMITTED,
      HistoricalStatusType.REVIEW_REQUIRED,
      HistoricalStatusType.REVIEW_REJECTED,
    ].includes(history.currentStatus);

    const isFinal = [
      HistoricalStatusType.PASSED,
      HistoricalStatusType.REJECTED,
      HistoricalStatusType.CANCELLED,
    ].includes(history.currentStatus);

    if (isFinal) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: RuleSeverity.ERROR,
        passed: false,
        message: `申请已处于${history.currentStatus}终态，不可重复提交`,
        detail: { currentStatus: history.currentStatus },
      };
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: RuleSeverity.PASS,
      passed: true,
      message: '当前状态校验通过',
      detail: { currentStatus: history.currentStatus, canSubmit },
    };
  }
}
