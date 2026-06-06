import { AuditLogger, AuditLogAction, AuditLogLevel } from '../../src/domain/records';
import { HandoverState } from '../../src/domain/states';
import {
  getRiskTagInfo,
  getRiskLevel,
  RISK_TAG_DEFINITIONS,
} from '../../src/domain/records/RiskTags';

describe('Records - 记录层', () => {
  describe('AuditLogger', () => {
    let logger: AuditLogger;

    beforeEach(() => {
      logger = new AuditLogger();
    });

    it('应该记录审计日志', () => {
      const entry = logger.log({
        applicationId: 'app-001',
        action: AuditLogAction.SUBMIT,
        level: AuditLogLevel.INFO,
        operatorId: 'user-001',
        operatorName: '张医生',
        message: '提交申请',
        detail: { itemCount: 5 },
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.applicationId).toBe('app-001');
      expect(entry.action).toBe(AuditLogAction.SUBMIT);
    });

    it('应该按申请ID查询日志', () => {
      logger.log({ applicationId: 'app-1', action: AuditLogAction.SUBMIT, level: AuditLogLevel.INFO, message: 'msg1' });
      logger.log({ applicationId: 'app-2', action: AuditLogAction.APPROVE, level: AuditLogLevel.INFO, message: 'msg2' });
      logger.log({ applicationId: 'app-1', action: AuditLogAction.RULE_CHECK, level: AuditLogLevel.INFO, message: 'msg3' });

      const logs = logger.getLogs('app-1');
      expect(logs.length).toBe(2);
      expect(logs.every((l) => l.applicationId === 'app-1')).toBe(true);
    });

    it('应该返回所有日志', () => {
      logger.log({ applicationId: 'app-1', action: AuditLogAction.SUBMIT, level: AuditLogLevel.INFO, message: 'msg1' });
      logger.log({ applicationId: 'app-2', action: AuditLogAction.APPROVE, level: AuditLogLevel.INFO, message: 'msg2' });

      expect(logger.getAllLogs().length).toBe(2);
    });

    it('应该包含状态转换信息', () => {
      const entry = logger.log({
        applicationId: 'app-001',
        action: AuditLogAction.APPROVE,
        level: AuditLogLevel.INFO,
        message: '审核通过',
        fromState: HandoverState.SUBMITTED,
        toState: HandoverState.PASSED,
      });

      expect(entry.fromState).toBe(HandoverState.SUBMITTED);
      expect(entry.toState).toBe(HandoverState.PASSED);
    });

    it('应该支持不同日志级别', () => {
      logger.log({ applicationId: 'app-1', action: AuditLogAction.RULE_CHECK, level: AuditLogLevel.INFO, message: 'info' });
      logger.log({ applicationId: 'app-1', action: AuditLogAction.RULE_CHECK, level: AuditLogLevel.WARNING, message: 'warn' });
      logger.log({ applicationId: 'app-1', action: AuditLogAction.RULE_CHECK, level: AuditLogLevel.ERROR, message: 'error' });
      logger.log({ applicationId: 'app-1', action: AuditLogAction.REVIEW, level: AuditLogLevel.REVIEW, message: 'review' });

      const logs = logger.getLogs('app-1');
      expect(logs.filter((l) => l.level === AuditLogLevel.INFO).length).toBe(1);
      expect(logs.filter((l) => l.level === AuditLogLevel.WARNING).length).toBe(1);
      expect(logs.filter((l) => l.level === AuditLogLevel.ERROR).length).toBe(1);
      expect(logs.filter((l) => l.level === AuditLogLevel.REVIEW).length).toBe(1);
    });
  });

  describe('RiskTags - 风险标签', () => {
    it('应该能获取风险标签信息', () => {
      const tag = getRiskTagInfo('高风险药品');
      expect(tag).toBeDefined();
      expect(tag?.name).toBe('高风险药品');
      expect(tag?.level).toBe('high');
    });

    it('未知标签应返回 undefined', () => {
      const tag = getRiskTagInfo('不存在的标签');
      expect(tag).toBeUndefined();
    });

    it('应该能计算整体风险等级', () => {
      expect(getRiskLevel(['高风险药品'])).toBe('high');
      expect(getRiskLevel(['材料缺失'])).toBe('medium');
      expect(getRiskLevel(['偏离度高'])).toBe('low');
      expect(getRiskLevel([])).toBe('low');
    });

    it('多标签时取最高等级', () => {
      expect(getRiskLevel(['高风险药品', '材料缺失'])).toBe('high');
      expect(getRiskLevel(['材料缺失', '偏离度高'])).toBe('medium');
    });

    it('风险标签定义应该完整', () => {
      expect(RISK_TAG_DEFINITIONS.length).toBeGreaterThanOrEqual(5);
      const codes = RISK_TAG_DEFINITIONS.map((t) => t.code);
      expect(codes).toContain('HIGH_RISK_DRUG');
      expect(codes).toContain('MATERIAL_MISSING');
      expect(codes).toContain('QUANTITY_EXCEEDED');
      expect(codes).toContain('HISTORY_RISK');
    });
  });
});
