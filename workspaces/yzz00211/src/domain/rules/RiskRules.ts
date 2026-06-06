import { IRule, RuleResult, RuleCategory, RuleSeverity, RuleEngineInput } from './RuleTypes';

export class HighRiskDrugRule implements IRule {
  id = 'RISK_001';
  name = '高风险药品校验';
  category = RuleCategory.RISK;

  execute(input: RuleEngineInput): RuleResult {
    const { application, thresholdConfig, summary } = input;
    const { highRisk } = thresholdConfig;

    if (!highRisk.enableHighRiskReview) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: RuleSeverity.PASS,
        passed: true,
        message: '高风险药品复核未启用，跳过',
      };
    }

    const highRiskItems = application.items.filter((item) => item.drug.isHighRisk);
    const detail: Record<string, unknown> = {
      highRiskItemCount: highRiskItems.length,
      highRiskItems: highRiskItems.map((item) => ({
        id: item.id,
        name: item.drug.name,
        quantity: item.quantity,
      })),
    };

    const hasHighRisk = highRiskItems.length > 0;
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: hasHighRisk ? RuleSeverity.REVIEW : RuleSeverity.PASS,
      passed: !hasHighRisk,
      message: hasHighRisk
        ? `包含${highRiskItems.length}个高风险药品明细，需人工复核`
        : '无高风险药品，校验通过',
      detail,
      affectedItems: highRiskItems.map((item) => item.id),
    };
  }
}

export class ControlledLevelRule implements IRule {
  id = 'RISK_002';
  name = '管制级别校验';
  category = RuleCategory.RISK;

  execute(input: RuleEngineInput): RuleResult {
    const { application } = input;

    const level3Items = application.items.filter((item) => item.drug.controlledLevel >= 3);
    const detail: Record<string, unknown> = {};

    level3Items.forEach((item) => {
      detail[item.id] = {
        name: item.drug.name,
        level: item.drug.controlledLevel,
      };
    });

    const hasHighLevel = level3Items.length > 0;
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: hasHighLevel ? RuleSeverity.REVIEW : RuleSeverity.PASS,
      passed: !hasHighLevel,
      message: hasHighLevel
        ? `包含${level3Items.length}个三级及以上管制药品，需复核`
        : '管制级别校验通过',
      detail,
      affectedItems: level3Items.map((item) => item.id),
    };
  }
}

export class QuantityDeviationRule implements IRule {
  id = 'RISK_003';
  name = '剩余量偏离度校验';
  category = RuleCategory.RISK;

  execute(input: RuleEngineInput): RuleResult {
    const { application, thresholdConfig } = input;
    const { quantityDeviation } = thresholdConfig;

    if (!quantityDeviation.enableDeviationCheck) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: RuleSeverity.PASS,
        passed: true,
        message: '剩余量偏离度校验未启用，跳过',
      };
    }

    const highDeviationItems: string[] = [];
    const detail: Record<string, unknown> = {};

    application.items.forEach((item) => {
      if (item.quantity === 0) return;
      const remainingRatio = item.remainingQuantity / item.quantity;
      const deviation = Math.abs(0.5 - remainingRatio);
      if (deviation > quantityDeviation.maxDeviationRatio) {
        highDeviationItems.push(item.id);
        detail[item.id] = {
          drug: item.drug.name,
          total: item.quantity,
          remaining: item.remainingQuantity,
          remainingRatio: remainingRatio.toFixed(2),
        };
      }
    });

    const passed = highDeviationItems.length === 0;
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      severity: passed ? RuleSeverity.PASS : RuleSeverity.WARNING,
      passed,
      message: passed
        ? '剩余量偏离度校验通过'
        : `${highDeviationItems.length}个药品剩余量偏离度较大，请注意`,
      detail,
      affectedItems: highDeviationItems,
    };
  }
}
