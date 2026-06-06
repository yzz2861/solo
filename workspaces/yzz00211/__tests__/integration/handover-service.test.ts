import { HandoverService } from '../../src/domain/services';
import { DecisionType, HandoverState } from '../../src/domain';
import {
  createCompliantScenario,
  createOverThresholdScenario,
  createMaterialMissingScenario,
  createHighRiskScenario,
  createHistoryReplayScenario,
  createQuantityInconsistentScenario,
} from '../fixtures/test-fixtures';

describe('HandoverService - 集成服务', () => {
  let service: HandoverService;

  beforeEach(() => {
    service = new HandoverService();
  });

  describe('合规样例', () => {
    it('合规申请应直接通过', () => {
      const scenario = createCompliantScenario();
      const result = service.processHandover(scenario);

      expect(result.success).toBe(true);
      expect(result.decision).toBe(DecisionType.PASS);
      expect(result.finalState).toBe(HandoverState.PASSED);
      expect(result.riskTags.length).toBe(0);
      expect(result.riskLevel).toBe('low');
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('汇总数量应该正确', () => {
      const scenario = createCompliantScenario();
      const result = service.processHandover(scenario);

      const items = scenario.application.items;
      const expectedTotal = items.reduce((sum, i) => sum + i.quantity, 0);
      const expectedValue = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

      expect(result.summary.totalQuantity).toBe(expectedTotal);
      expect(result.summary.totalValue).toBeCloseTo(expectedValue, 5);
      expect(result.summary.totalItemCount).toBe(items.length);
    });

    it('明细合计应该与汇总一致', () => {
      const scenario = createCompliantScenario();
      const result = service.processHandover(scenario);

      const calcRemaining = scenario.application.items.reduce((sum, i) => sum + i.remainingQuantity, 0);
      const calcUsed = scenario.application.items.reduce((sum, i) => sum + i.usedQuantity, 0);

      expect(result.summary.totalRemainingQuantity).toBe(calcRemaining);
      expect(result.summary.totalUsedQuantity).toBe(calcUsed);
    });

    it('应该生成交接记录', () => {
      const scenario = createCompliantScenario();
      const result = service.processHandover(scenario);

      expect(result.recordId).toBeDefined();
      expect(result.recordNo).toBeDefined();
      expect(result.recordNo).toMatch(/^HJ-/);
    });

    it('应该生成审计日志', () => {
      const scenario = createCompliantScenario();
      const result = service.processHandover(scenario);

      expect(result.logCount).toBeGreaterThan(0);

      const logs = service.getAuditLogger().getLogs(result.applicationId);
      expect(logs.length).toBe(result.logCount);
      expect(logs.some((l) => l.action === 'rule_check')).toBe(true);
      expect(logs.some((l) => l.action === 'approve')).toBe(true);
    });
  });

  describe('超阈值样例', () => {
    it('超阈值应被拦截', () => {
      const scenario = createOverThresholdScenario();
      const result = service.processHandover(scenario);

      expect(result.success).toBe(true);
      expect(result.decision).toBe(DecisionType.REJECT);
      expect(result.finalState).toBe(HandoverState.REJECTED);
    });

    it('超阈值应该有超量风险标签', () => {
      const scenario = createOverThresholdScenario();
      const result = service.processHandover(scenario);

      expect(result.riskTags).toContain('超量');
      expect(result.riskLevel).toBe('high');
    });

    it('应该有明确的拦截原因', () => {
      const scenario = createOverThresholdScenario();
      const result = service.processHandover(scenario);

      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.some((r) => r.includes('超过阈值'))).toBe(true);
    });

    it('汇总数量应该正确反映超阈值情况', () => {
      const scenario = createOverThresholdScenario();
      const result = service.processHandover(scenario);

      expect(result.summary.totalItemCount).toBe(12);
      expect(result.summary.totalQuantity).toBe(12 * 15);
      expect(result.summary.totalValue).toBe(12 * 15 * 100);
    });

    it('日志中应该包含错误级别记录', () => {
      const scenario = createOverThresholdScenario();
      const result = service.processHandover(scenario);

      const logs = service.getAuditLogger().getLogs(result.applicationId);
      const errorLogs = logs.filter((l) => l.level === 'error');
      expect(errorLogs.length).toBeGreaterThan(0);
    });
  });

  describe('材料缺失样例', () => {
    it('材料缺失应进入复核，不允许直接通过', () => {
      const scenario = createMaterialMissingScenario();
      const result = service.processHandover(scenario);

      expect(result.decision).toBe(DecisionType.REVIEW_REQUIRED);
      expect(result.decision).not.toBe(DecisionType.PASS);
      expect(result.finalState).toBe(HandoverState.REVIEW_REQUIRED);
    });

    it('应该有材料缺失风险标签', () => {
      const scenario = createMaterialMissingScenario();
      const result = service.processHandover(scenario);

      expect(result.riskTags).toContain('材料缺失');
      expect(result.riskLevel).toBe('medium');
    });

    it('复核原因应该包含材料缺失', () => {
      const scenario = createMaterialMissingScenario();
      const result = service.processHandover(scenario);

      expect(result.reasons.some((r) => r.includes('缺少必需材料'))).toBe(true);
    });

    it('日志中应该有复核级别记录', () => {
      const scenario = createMaterialMissingScenario();
      const result = service.processHandover(scenario);

      const logs = service.getAuditLogger().getLogs(result.applicationId);
      const reviewLogs = logs.filter((l) => l.level === 'review');
      expect(reviewLogs.length).toBeGreaterThan(0);
    });
  });

  describe('高风险样例', () => {
    it('高风险药品应进入复核，不允许直接通过', () => {
      const scenario = createHighRiskScenario();
      const result = service.processHandover(scenario);

      expect(result.decision).toBe(DecisionType.REVIEW_REQUIRED);
      expect(result.decision).not.toBe(DecisionType.PASS);
    });

    it('应该有高风险和三级管制风险标签', () => {
      const scenario = createHighRiskScenario();
      const result = service.processHandover(scenario);

      expect(result.riskTags).toContain('高风险药品');
      expect(result.riskTags).toContain('三级管制');
      expect(result.riskLevel).toBe('high');
    });

    it('高风险药品数量统计应正确', () => {
      const scenario = createHighRiskScenario();
      const result = service.processHandover(scenario);

      expect(result.summary.highRiskItemCount).toBe(1);
    });
  });

  describe('历史回放样例', () => {
    it('有历史风险的应进入复核', () => {
      const scenario = createHistoryReplayScenario();
      const result = service.processHandover(scenario);

      expect(result.riskTags).toContain('历史风险');
    });

    it('应该正确识别历史驳回次数', () => {
      const scenario = createHistoryReplayScenario();
      const result = service.processHandover(scenario);

      const historyRule = result.ruleResults.results.find((r) => r.ruleId === 'HISTORY_001');
      expect(historyRule).toBeDefined();
      expect(historyRule?.detail?.rejectCount).toBe(1);
    });

    it('历史驳回次数超过阈值时应拦截', () => {
      const scenario = createHistoryReplayScenario();
      scenario.history.rejectCount = 5;
      const result = service.processHandover(scenario);

      expect(result.decision).toBe(DecisionType.REJECT);
    });

    it('日志中应包含历史风险相关记录', () => {
      const scenario = createHistoryReplayScenario();
      const result = service.processHandover(scenario);

      const logs = service.getAuditLogger().getLogs(result.applicationId);
      const hasHistoryLog = logs.some((l) => l.message?.includes('历史') || l.detail?.ruleId === 'HISTORY_002');
      expect(hasHistoryLog).toBe(true);
    });
  });

  describe('数量不一致样例', () => {
    it('数量不一致应被拦截', () => {
      const scenario = createQuantityInconsistentScenario();
      const result = service.processHandover(scenario);

      expect(result.decision).toBe(DecisionType.REJECT);
    });

    it('应该指明哪些明细不一致', () => {
      const scenario = createQuantityInconsistentScenario();
      const result = service.processHandover(scenario);

      const quantityRule = result.ruleResults.results.find((r) => r.ruleId === 'QUANTITY_001');
      expect(quantityRule).toBeDefined();
      expect(quantityRule?.affectedItems).toContain('item-bad');
      expect(quantityRule?.affectedItems).not.toContain('item-good');
    });
  });

  describe('交接记录查询', () => {
    it('应该可以通过记录ID查询', () => {
      const scenario = createCompliantScenario();
      const result = service.processHandover(scenario);

      const record = service.getRecord(result.recordId);
      expect(record).toBeDefined();
      expect(record?.id).toBe(result.recordId);
      expect(record?.applicationId).toBe(result.applicationId);
    });

    it('应该可以按申请ID查询所有记录', () => {
      const scenario1 = createCompliantScenario();
      const scenario2 = createCompliantScenario();
      scenario2.application.id = scenario1.application.id;

      service.processHandover(scenario1);
      service.processHandover(scenario2);

      const records = service.getRecordsByApplication(scenario1.application.id);
      expect(records.length).toBe(2);
    });
  });
});
