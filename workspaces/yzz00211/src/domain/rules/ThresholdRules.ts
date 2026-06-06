import { IRule, RuleResult, RuleCategory, RuleSeverity, RuleEngineInput } from './RuleTypes';
import { ThresholdByCategory } from '../objects';

export class ThresholdRule implements IRule {
  id = 'THRESHOLD_001';
  name = '总量阈值校验';
  category = RuleCategory.THRESHOLD;

  execute(input: RuleEngineInput): RuleResult {
    const { summary, thresholdConfig } = input;
    const { generalThreshold } = thresholdConfig;

    const violations: string[] = [];
    const detail: Record<string, unknown> = {};

    if (summary.totalQuantity > generalThreshold.maxTotalQuantity) {
      violations.push(
        `总数量${summary.totalQuantity}超过阈值${generalThreshold.maxTotalQuantity}`
      );
      detail.totalQuantity = summary.totalQuantity;
      detail.maxTotalQuantity = generalThreshold.maxTotalQuantity;
    }

    if (summary.totalValue > generalThreshold.maxTotalValue) {
      violations.push(
        `总金额${summary.totalValue}超过阈值${generalThreshold.maxTotalValue}`
      );
      detail.totalValue = summary.totalValue;
      detail.maxTotalValue = generalThreshold.maxTotalValue;
    }

    if (summary.totalItemCount > generalThreshold.maxItemCount) {
      violations.push(
        `总品规数${summary.totalItemCount}超过阈值${generalThreshold.maxItemCount}`
      );
      detail.totalItemCount = summary.totalItemCount;
      detail.maxItemCount = generalThreshold.maxItemCount;
    }

    const passed = violations.length === 0;
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: passed ? RuleSeverity.PASS : RuleSeverity.ERROR,
      passed,
      message: passed
        ? '总量阈值校验通过'
        : `总量阈值校验不通过：${violations.join('；')}`,
      detail,
    };
  }
}

export class CategoryThresholdRule implements IRule {
  id = 'THRESHOLD_002';
  name = '分类阈值校验';
  category = RuleCategory.THRESHOLD;

  execute(input: RuleEngineInput): RuleResult {
    const { application, thresholdConfig, summary } = input;
    const { categoryThresholds } = thresholdConfig;

    const violations: string[] = [];
    const detail: Record<string, unknown> = {};
    const affectedItems: string[] = [];

    categoryThresholds.forEach((catThreshold: ThresholdByCategory) => {
      const catItems = application.items.filter(
        (item) => item.drug.category === catThreshold.category
      );
      if (catItems.length === 0) return;

      const catQuantity = catItems.reduce((sum, item) => sum + item.quantity, 0);
      const catValue = catItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      if (catQuantity > catThreshold.maxQuantityPerHandover) {
        violations.push(
          `${catThreshold.category}类药品数量${catQuantity}超过阈值${catThreshold.maxQuantityPerHandover}`
        );
        detail[`${catThreshold.category}_quantity`] = catQuantity;
        catItems.forEach((item) => {
          if (!affectedItems.includes(item.id)) affectedItems.push(item.id);
        });
      }

      if (catValue > catThreshold.maxValuePerHandover) {
        violations.push(
          `${catThreshold.category}类药品金额${catValue}超过阈值${catThreshold.maxValuePerHandover}`
        );
        detail[`${catThreshold.category}_value`] = catValue;
        catItems.forEach((item) => {
          if (!affectedItems.includes(item.id)) affectedItems.push(item.id);
        });
      }

      if (catItems.length > catThreshold.maxItemsPerHandover) {
        violations.push(
          `${catThreshold.category}类药品种类${catItems.length}超过阈值${catThreshold.maxItemsPerHandover}`
        );
        detail[`${catThreshold.category}_items`] = catItems.length;
        catItems.forEach((item) => {
          if (!affectedItems.includes(item.id)) affectedItems.push(item.id);
        });
      }
    });

    const passed = violations.length === 0;
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: passed ? RuleSeverity.PASS : RuleSeverity.ERROR,
      passed,
      message: passed
        ? '分类阈值校验通过'
        : `分类阈值校验不通过：${violations.join('；')}`,
      detail: { ...detail, categoryCount: summary.drugCategoryCount },
      affectedItems,
    };
  }
}

export class QuantityConsistencyRule implements IRule {
  id = 'QUANTITY_001';
  name = '数量一致性校验';
  category = RuleCategory.QUANTITY;

  execute(input: RuleEngineInput): RuleResult {
    const { application } = input;
    const invalidItems: string[] = [];
    const detail: Record<string, unknown> = {};

    application.items.forEach((item) => {
      const diff = Math.abs(item.quantity - item.remainingQuantity - item.usedQuantity);
      if (diff > 0.001) {
        invalidItems.push(item.id);
        detail[item.id] = {
          drug: item.drug.name,
          quantity: item.quantity,
          remaining: item.remainingQuantity,
          used: item.usedQuantity,
          diff,
        };
      }
    });

    const passed = invalidItems.length === 0;
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: passed ? RuleSeverity.PASS : RuleSeverity.ERROR,
      passed,
      message: passed
        ? '数量一致性校验通过'
        : `数量一致性校验不通过：${invalidItems.length}个明细数量不一致`,
      detail,
      affectedItems: invalidItems,
    };
  }
}

export class SummaryConsistencyRule implements IRule {
  id = 'QUANTITY_002';
  name = '汇总与明细一致性校验';
  category = RuleCategory.QUANTITY;

  execute(input: RuleEngineInput): RuleResult {
    const { application, summary } = input;

    const calcQuantity = application.items.reduce((sum, item) => sum + item.quantity, 0);
    const calcValue = application.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const calcRemaining = application.items.reduce((sum, item) => sum + item.remainingQuantity, 0);
    const calcUsed = application.items.reduce((sum, item) => sum + item.usedQuantity, 0);

    const diffs: string[] = [];
    const detail: Record<string, unknown> = {};

    if (Math.abs(summary.totalQuantity - calcQuantity) > 0.001) {
      diffs.push('总数量');
      detail.quantityDiff = summary.totalQuantity - calcQuantity;
    }
    if (Math.abs(summary.totalValue - calcValue) > 0.001) {
      diffs.push('总金额');
      detail.valueDiff = summary.totalValue - calcValue;
    }
    if (Math.abs(summary.totalRemainingQuantity - calcRemaining) > 0.001) {
      diffs.push('剩余总量');
      detail.remainingDiff = summary.totalRemainingQuantity - calcRemaining;
    }
    if (Math.abs(summary.totalUsedQuantity - calcUsed) > 0.001) {
      diffs.push('使用总量');
      detail.usedDiff = summary.totalUsedQuantity - calcUsed;
    }

    const passed = diffs.length === 0;
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: passed ? RuleSeverity.PASS : RuleSeverity.ERROR,
      passed,
      message: passed
        ? '汇总与明细一致性校验通过'
        : `汇总与明细不一致：${diffs.join('、')}`,
      detail,
    };
  }
}
