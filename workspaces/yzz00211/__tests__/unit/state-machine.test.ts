import {
  HandoverStateMachine,
  StateDecisionEngine,
  HandoverState,
  StateEvent,
  DecisionType,
} from '../../src/domain/states';
import { RuleEngineOutput, RuleSeverity } from '../../src/domain/rules';

describe('StateMachine - 状态机', () => {
  describe('HandoverStateMachine', () => {
    it('初始状态应为 DRAFT', () => {
      const sm = new HandoverStateMachine();
      expect(sm.getCurrentState()).toBe(HandoverState.DRAFT);
    });

    it('可以设置初始状态', () => {
      const sm = new HandoverStateMachine(HandoverState.SUBMITTED);
      expect(sm.getCurrentState()).toBe(HandoverState.SUBMITTED);
    });

    it('DRAFT -> SUBMIT 应变为 SUBMITTED', () => {
      const sm = new HandoverStateMachine();
      const result = sm.transition(StateEvent.SUBMIT);
      expect(result.success).toBe(true);
      expect(result.currentState).toBe(HandoverState.SUBMITTED);
      expect(result.previousState).toBe(HandoverState.DRAFT);
    });

    it('SUBMITTED -> APPROVE 应变为 PASSED', () => {
      const sm = new HandoverStateMachine(HandoverState.SUBMITTED);
      const result = sm.transition(StateEvent.APPROVE);
      expect(result.success).toBe(true);
      expect(result.currentState).toBe(HandoverState.PASSED);
    });

    it('SUBMITTED -> REJECT 应变为 REJECTED', () => {
      const sm = new HandoverStateMachine(HandoverState.SUBMITTED);
      const result = sm.transition(StateEvent.REJECT);
      expect(result.success).toBe(true);
      expect(result.currentState).toBe(HandoverState.REJECTED);
    });

    it('SUBMITTED -> REVIEW 应变为 REVIEW_REQUIRED', () => {
      const sm = new HandoverStateMachine(HandoverState.SUBMITTED);
      const result = sm.transition(StateEvent.REVIEW);
      expect(result.success).toBe(true);
      expect(result.currentState).toBe(HandoverState.REVIEW_REQUIRED);
    });

    it('PASSED 状态不能再转换', () => {
      const sm = new HandoverStateMachine(HandoverState.PASSED);
      const result = sm.transition(StateEvent.APPROVE);
      expect(result.success).toBe(false);
      expect(sm.getCurrentState()).toBe(HandoverState.PASSED);
    });

    it('REJECTED -> RESUBMIT 应变为 SUBMITTED', () => {
      const sm = new HandoverStateMachine(HandoverState.REJECTED);
      const result = sm.transition(StateEvent.RESUBMIT);
      expect(result.success).toBe(true);
      expect(result.currentState).toBe(HandoverState.SUBMITTED);
    });

    it('canTransition 应正确判断是否可转换', () => {
      const sm = new HandoverStateMachine(HandoverState.DRAFT);
      expect(sm.canTransition(StateEvent.SUBMIT)).toBe(true);
      expect(sm.canTransition(StateEvent.APPROVE)).toBe(false);
    });

    it('getAvailableTransitions 应返回所有可用转换', () => {
      const sm = new HandoverStateMachine(HandoverState.SUBMITTED);
      const transitions = sm.getAvailableTransitions();
      expect(transitions.length).toBeGreaterThan(0);
      transitions.forEach((t) => {
        expect(t.from).toBe(HandoverState.SUBMITTED);
      });
    });
  });

  describe('StateDecisionEngine - 决策引擎', () => {
    function buildRuleOutput(overrides: Partial<RuleEngineOutput> = {}): RuleEngineOutput {
      return {
        results: [],
        overallPassed: true,
        requiresReview: false,
        shouldReject: false,
        riskTags: [],
        totalWarnings: 0,
        totalErrors: 0,
        totalReviewRequired: 0,
        ...overrides,
      };
    }

    it('全部通过时应决策为 PASS', () => {
      const engine = new StateDecisionEngine(HandoverState.SUBMITTED);
      const ruleOutput = buildRuleOutput({ overallPassed: true, requiresReview: false });
      const result = engine.evaluate(ruleOutput);

      expect(result.decision).toBe(DecisionType.PASS);
      expect(result.targetState).toBe(HandoverState.PASSED);
      expect(result.riskTags.length).toBe(0);
    });

    it('有错误时应决策为 REJECT', () => {
      const engine = new StateDecisionEngine(HandoverState.SUBMITTED);
      const ruleOutput = buildRuleOutput({
        overallPassed: false,
        shouldReject: true,
        totalErrors: 2,
        results: [
          {
            ruleId: 'TEST_001',
            ruleName: '测试规则',
            category: 'threshold' as any,
            severity: RuleSeverity.ERROR,
            passed: false,
            message: '测试错误',
          },
        ],
      });
      const result = engine.evaluate(ruleOutput);

      expect(result.decision).toBe(DecisionType.REJECT);
      expect(result.targetState).toBe(HandoverState.REJECTED);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('有复核项时应决策为 REVIEW_REQUIRED', () => {
      const engine = new StateDecisionEngine(HandoverState.SUBMITTED);
      const ruleOutput = buildRuleOutput({
        overallPassed: true,
        requiresReview: true,
        shouldReject: false,
        totalReviewRequired: 1,
        riskTags: ['高风险药品'],
        results: [
          {
            ruleId: 'TEST_002',
            ruleName: '测试复核规则',
            category: 'risk' as any,
            severity: RuleSeverity.REVIEW,
            passed: false,
            message: '需人工复核',
          },
        ],
      });
      const result = engine.evaluate(ruleOutput);

      expect(result.decision).toBe(DecisionType.REVIEW_REQUIRED);
      expect(result.targetState).toBe(HandoverState.REVIEW_REQUIRED);
      expect(result.riskTags).toContain('高风险药品');
    });

    it('高风险不能直接通过，必须进入复核', () => {
      const engine = new StateDecisionEngine(HandoverState.SUBMITTED);
      const ruleOutput = buildRuleOutput({
        overallPassed: true,
        requiresReview: true,
        shouldReject: false,
        totalReviewRequired: 1,
        riskTags: ['高风险药品', '三级管制'],
        results: [
          {
            ruleId: 'RISK_001',
            ruleName: '高风险药品校验',
            category: 'risk' as any,
            severity: RuleSeverity.REVIEW,
            passed: false,
            message: '包含高风险药品',
          },
        ],
      });
      const result = engine.evaluate(ruleOutput);

      expect(result.decision).toBe(DecisionType.REVIEW_REQUIRED);
      expect(result.decision).not.toBe(DecisionType.PASS);
    });

    it('材料缺失应进入复核', () => {
      const engine = new StateDecisionEngine(HandoverState.SUBMITTED);
      const ruleOutput = buildRuleOutput({
        overallPassed: true,
        requiresReview: true,
        totalReviewRequired: 1,
        riskTags: ['材料缺失'],
        results: [
          {
            ruleId: 'MATERIAL_001',
            ruleName: '必需材料校验',
            category: 'material' as any,
            severity: RuleSeverity.REVIEW,
            passed: false,
            message: '缺少必需材料',
          },
        ],
      });
      const result = engine.evaluate(ruleOutput);

      expect(result.decision).toBe(DecisionType.REVIEW_REQUIRED);
      expect(result.riskTags).toContain('材料缺失');
    });
  });
});
