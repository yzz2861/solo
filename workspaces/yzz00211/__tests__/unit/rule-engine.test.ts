import {
  RuleEngine,
  ThresholdRule,
  CategoryThresholdRule,
  QuantityConsistencyRule,
  SummaryConsistencyRule,
  RequiredMaterialRule,
  HighRiskDrugRule,
  HistoryReviewCountRule,
  calculateSummary,
} from '../../src/domain/rules';
import {
  createCompliantScenario,
  createOverThresholdScenario,
  createMaterialMissingScenario,
  createHighRiskScenario,
  createHistoryReplayScenario,
  createQuantityInconsistentScenario,
} from '../fixtures/test-fixtures';

function buildRuleInput(scenario: ReturnType<typeof createCompliantScenario>) {
  const summary = calculateSummary(scenario.application);
  return {
    application: scenario.application,
    materials: scenario.materials,
    history: scenario.history,
    thresholdConfig: scenario.thresholdConfig,
    summary,
  };
}

describe('RuleEngine - 规则引擎', () => {
  describe('ThresholdRule - 总量阈值校验', () => {
    it('合规场景应通过', () => {
      const scenario = createCompliantScenario();
      const input = buildRuleInput(scenario);
      const rule = new ThresholdRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('pass');
    });

    it('超总量时应不通过', () => {
      const scenario = createOverThresholdScenario();
      const input = buildRuleInput(scenario);
      const rule = new ThresholdRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.message).toContain('超过阈值');
    });
  });

  describe('CategoryThresholdRule - 分类阈值校验', () => {
    it('合规场景应通过', () => {
      const scenario = createCompliantScenario();
      const input = buildRuleInput(scenario);
      const rule = new CategoryThresholdRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(true);
    });

    it('超分类阈值时应返回错误', () => {
      const scenario = createOverThresholdScenario();
      const input = buildRuleInput(scenario);
      const rule = new CategoryThresholdRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('error');
    });
  });

  describe('QuantityConsistencyRule - 数量一致性校验', () => {
    it('数量一致时通过', () => {
      const scenario = createCompliantScenario();
      const input = buildRuleInput(scenario);
      const rule = new QuantityConsistencyRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(true);
    });

    it('数量不一致时不通过', () => {
      const scenario = createQuantityInconsistentScenario();
      const input = buildRuleInput(scenario);
      const rule = new QuantityConsistencyRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.affectedItems).toContain('item-bad');
    });
  });

  describe('SummaryConsistencyRule - 汇总与明细一致性校验', () => {
    it('汇总与明细一致时通过', () => {
      const scenario = createCompliantScenario();
      const input = buildRuleInput(scenario);
      const rule = new SummaryConsistencyRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(true);
    });

    it('汇总与明细不一致时不通过', () => {
      const scenario = createCompliantScenario();
      const input = buildRuleInput(scenario);
      input.summary.totalQuantity = input.summary.totalQuantity + 100;
      const rule = new SummaryConsistencyRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('error');
    });
  });

  describe('RequiredMaterialRule - 必需材料校验', () => {
    it('材料齐全时通过', () => {
      const scenario = createCompliantScenario();
      const input = buildRuleInput(scenario);
      const rule = new RequiredMaterialRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(true);
    });

    it('材料缺失时标记为需复核', () => {
      const scenario = createMaterialMissingScenario();
      const input = buildRuleInput(scenario);
      const rule = new RequiredMaterialRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('review');
      expect(result.message).toContain('缺少必需材料');
    });
  });

  describe('HighRiskDrugRule - 高风险药品校验', () => {
    it('无高风险药品时通过', () => {
      const scenario = createCompliantScenario();
      const input = buildRuleInput(scenario);
      const rule = new HighRiskDrugRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(true);
    });

    it('有高风险药品时标记为需复核', () => {
      const scenario = createHighRiskScenario();
      const input = buildRuleInput(scenario);
      const rule = new HighRiskDrugRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('review');
      expect(result.message).toContain('高风险');
    });

    it('关闭高风险复核时跳过校验', () => {
      const scenario = createHighRiskScenario();
      scenario.thresholdConfig.highRisk.enableHighRiskReview = false;
      const input = buildRuleInput(scenario);
      const rule = new HighRiskDrugRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('未启用');
    });
  });

  describe('HistoryReviewCountRule - 历史复核次数校验', () => {
    it('无历史风险时通过', () => {
      const scenario = createCompliantScenario();
      const input = buildRuleInput(scenario);
      const rule = new HistoryReviewCountRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(true);
    });

    it('历史多次驳回时应拦截', () => {
      const scenario = createHistoryReplayScenario();
      scenario.history.rejectCount = 5;
      const input = buildRuleInput(scenario);
      const rule = new HistoryReviewCountRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('error');
    });

    it('关闭历史校验时跳过', () => {
      const scenario = createHistoryReplayScenario();
      scenario.thresholdConfig.history.enableHistoryCheck = false;
      const input = buildRuleInput(scenario);
      const rule = new HistoryReviewCountRule();
      const result = rule.execute(input);

      expect(result.passed).toBe(true);
    });
  });

  describe('RuleEngine - 整合执行', () => {
    it('合规场景应全部通过', () => {
      const scenario = createCompliantScenario();
      const input = buildRuleInput(scenario);
      const engine = new RuleEngine();
      const output = engine.execute(input);

      expect(output.overallPassed).toBe(true);
      expect(output.shouldReject).toBe(false);
      expect(output.requiresReview).toBe(false);
      expect(output.totalErrors).toBe(0);
      expect(output.riskTags.length).toBe(0);
    });

    it('超阈值场景应被拦截', () => {
      const scenario = createOverThresholdScenario();
      const input = buildRuleInput(scenario);
      const engine = new RuleEngine();
      const output = engine.execute(input);

      expect(output.overallPassed).toBe(false);
      expect(output.shouldReject).toBe(true);
      expect(output.totalErrors).toBeGreaterThan(0);
      expect(output.riskTags).toContain('超量');
    });

    it('材料缺失场景应进入复核', () => {
      const scenario = createMaterialMissingScenario();
      const input = buildRuleInput(scenario);
      const engine = new RuleEngine();
      const output = engine.execute(input);

      expect(output.requiresReview).toBe(true);
      expect(output.shouldReject).toBe(false);
      expect(output.riskTags).toContain('材料缺失');
      expect(output.totalReviewRequired).toBeGreaterThan(0);
    });

    it('高风险场景应进入复核，不允许直接通过', () => {
      const scenario = createHighRiskScenario();
      const input = buildRuleInput(scenario);
      const engine = new RuleEngine();
      const output = engine.execute(input);

      expect(output.requiresReview).toBe(true);
      expect(output.shouldReject).toBe(false);
      expect(output.riskTags).toContain('高风险药品');
      expect(output.riskTags).toContain('三级管制');
    });

    it('历史回放场景应检测历史风险', () => {
      const scenario = createHistoryReplayScenario();
      const input = buildRuleInput(scenario);
      const engine = new RuleEngine();
      const output = engine.execute(input);

      expect(output.riskTags).toContain('历史风险');
      expect(output.totalReviewRequired).toBeGreaterThanOrEqual(1);
    });

    it('数量不一致场景应被拦截', () => {
      const scenario = createQuantityInconsistentScenario();
      const input = buildRuleInput(scenario);
      const engine = new RuleEngine();
      const output = engine.execute(input);

      expect(output.overallPassed).toBe(false);
      expect(output.shouldReject).toBe(true);
    });
  });
});
