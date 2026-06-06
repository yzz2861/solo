import { BaseRule, RuleResult } from './base-rule';
import { AmountAnomalyRule } from './amount-anomaly.rule';
import { FrequencyAnomalyRule } from './frequency-anomaly.rule';
import { LocationAnomalyRule } from './location-anomaly.rule';
import { TimeAnomalyRule } from './time-anomaly.rule';
import { HistoricalAnomalyRule, HistoricalRuleContext } from './historical-anomaly.rule';
import { MaterialCompletenessRule, MaterialRuleContext } from './material-completeness.rule';
import {
  TransactionRecord,
  MasterData,
  ThresholdConfig,
  HistoricalData,
  SupportingMaterial,
  AnomalyApplicationRecord
} from '../models';

export type RiskLevel = 'low' | 'medium' | 'high' | 'uncertain';

export interface RuleEngineResult {
  totalRiskScore: number;
  riskLevel: RiskLevel;
  ruleResults: RuleResult[];
  anomalyExplanation: string;
  calculationBasis: {
    totalScore: number;
    breakdown: Array<{
      ruleType: string;
      ruleName: string;
      score: number;
      triggered: boolean;
    }>;
  };
}

export class RuleEngine {
  private rules: BaseRule[] = [];

  constructor() {
    this.rules = [
      new AmountAnomalyRule(),
      new FrequencyAnomalyRule(),
      new LocationAnomalyRule(),
      new TimeAnomalyRule(),
      new HistoricalAnomalyRule(),
      new MaterialCompletenessRule()
    ];
  }

  evaluate(
    transactions: TransactionRecord[],
    masterData: MasterData,
    thresholdConfig: ThresholdConfig,
    historicalData: HistoricalData,
    materials: SupportingMaterial[],
    application: AnomalyApplicationRecord
  ): RuleEngineResult {
    const historicalContext: HistoricalRuleContext = { historicalData };
    const materialContext: MaterialRuleContext = { materials, application };

    const ruleResults: RuleResult[] = this.rules.map(rule => {
      if (rule.ruleType === 'historical') {
        return (rule as HistoricalAnomalyRule).evaluate(transactions, masterData, thresholdConfig, historicalContext);
      }
      if (rule.ruleType === 'material') {
        return (rule as MaterialCompletenessRule).evaluate(transactions, masterData, thresholdConfig, materialContext);
      }
      return rule.evaluate(transactions, masterData, thresholdConfig);
    });

    const totalRiskScore = ruleResults.reduce((sum, r) => sum + r.riskScore, 0);
    const riskLevel = this.calculateRiskLevel(totalRiskScore, thresholdConfig, ruleResults);

    const triggeredRules = ruleResults.filter(r => r.triggered);
    const anomalyExplanation = triggeredRules.length > 0
      ? triggeredRules.map(r => r.explanation).join('；')
      : '未检测到异常';

    const calculationBasis = {
      totalScore: totalRiskScore,
      breakdown: ruleResults.map(r => ({
        ruleType: r.ruleType,
        ruleName: r.ruleName,
        score: r.riskScore,
        triggered: r.triggered
      }))
    };

    return {
      totalRiskScore,
      riskLevel,
      ruleResults,
      anomalyExplanation,
      calculationBasis
    };
  }

  private calculateRiskLevel(
    totalScore: number,
    thresholdConfig: ThresholdConfig,
    ruleResults: RuleResult[]
  ): RiskLevel {
    const { riskScoreThreshold } = thresholdConfig;

    const materialRule = ruleResults.find(r => r.ruleType === 'material');
    if (materialRule && materialRule.triggered) {
      const missingCritical = materialRule.details?.missingRequiredTypes?.length > 0;
      if (missingCritical && totalScore >= riskScoreThreshold.highRisk) {
        return 'high';
      }
      if (missingCritical) {
        return 'medium';
      }
    }

    if (totalScore >= riskScoreThreshold.highRisk) {
      return 'high';
    }
    if (totalScore >= riskScoreThreshold.mediumRisk) {
      return 'medium';
    }
    if (totalScore >= riskScoreThreshold.lowRisk) {
      return 'low';
    }

    return 'low';
  }
}
