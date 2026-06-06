import {
  IRule,
  RuleEngineInput,
  RuleEngineOutput,
  RuleResult,
  RuleSeverity,
} from './RuleTypes';
import {
  ThresholdRule,
  CategoryThresholdRule,
  QuantityConsistencyRule,
  SummaryConsistencyRule,
} from './ThresholdRules';
import {
  RequiredMaterialRule,
  ItemLevelMaterialRule,
  MaterialValidityRule,
} from './MaterialRules';
import { HighRiskDrugRule, ControlledLevelRule, QuantityDeviationRule } from './RiskRules';
import { HistoryReviewCountRule, HistoryHighRiskRule, CurrentStatusRule } from './HistoryRules';

const RISK_TAGS = {
  HIGH_RISK_DRUG: '高风险药品',
  CONTROLLED_LEVEL_3: '三级管制',
  MATERIAL_MISSING: '材料缺失',
  QUANTITY_EXCEEDED: '超量',
  HISTORY_RISK: '历史风险',
  DEVIATION_HIGH: '偏离度高',
  MULTIPLE_REVIEWS: '多次复核',
};

export class RuleEngine {
  private rules: IRule[];

  constructor(customRules?: IRule[]) {
    this.rules = customRules || [
      new CurrentStatusRule(),
      new QuantityConsistencyRule(),
      new SummaryConsistencyRule(),
      new ThresholdRule(),
      new CategoryThresholdRule(),
      new RequiredMaterialRule(),
      new ItemLevelMaterialRule(),
      new MaterialValidityRule(),
      new HighRiskDrugRule(),
      new ControlledLevelRule(),
      new QuantityDeviationRule(),
      new HistoryReviewCountRule(),
      new HistoryHighRiskRule(),
    ];
  }

  execute(input: RuleEngineInput): RuleEngineOutput {
    const results: RuleResult[] = [];

    for (const rule of this.rules) {
      const result = rule.execute(input);
      results.push(result);
    }

    const totalErrors = results.filter((r) => r.severity === RuleSeverity.ERROR).length;
    const totalWarnings = results.filter((r) => r.severity === RuleSeverity.WARNING).length;
    const totalReviewRequired = results.filter(
      (r) => r.severity === RuleSeverity.REVIEW
    ).length;

    const overallPassed = totalErrors === 0;
    const shouldReject = totalErrors > 0;
    const requiresReview = totalReviewRequired > 0 || totalWarnings > 0;

    const riskTags = this.extractRiskTags(results);

    return {
      results,
      overallPassed,
      requiresReview,
      shouldReject,
      riskTags,
      totalWarnings,
      totalErrors,
      totalReviewRequired,
    };
  }

  private extractRiskTags(results: RuleResult[]): string[] {
    const tags: string[] = [];

    results.forEach((result) => {
      if (result.passed) return;

      switch (result.ruleId) {
        case 'RISK_001':
          tags.push(RISK_TAGS.HIGH_RISK_DRUG);
          break;
        case 'RISK_002':
          tags.push(RISK_TAGS.CONTROLLED_LEVEL_3);
          break;
        case 'MATERIAL_001':
        case 'MATERIAL_002':
          if (!tags.includes(RISK_TAGS.MATERIAL_MISSING)) {
            tags.push(RISK_TAGS.MATERIAL_MISSING);
          }
          break;
        case 'THRESHOLD_001':
        case 'THRESHOLD_002':
          if (!tags.includes(RISK_TAGS.QUANTITY_EXCEEDED)) {
            tags.push(RISK_TAGS.QUANTITY_EXCEEDED);
          }
          break;
        case 'HISTORY_001':
        case 'HISTORY_002':
          if (!tags.includes(RISK_TAGS.HISTORY_RISK)) {
            tags.push(RISK_TAGS.HISTORY_RISK);
          }
          break;
        case 'RISK_003':
          if (!tags.includes(RISK_TAGS.DEVIATION_HIGH)) {
            tags.push(RISK_TAGS.DEVIATION_HIGH);
          }
          break;
      }
    });

    return tags;
  }

  addRule(rule: IRule): void {
    this.rules.push(rule);
  }

  getRules(): IRule[] {
    return [...this.rules];
  }
}
