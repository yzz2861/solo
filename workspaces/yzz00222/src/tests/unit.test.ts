import { MaterialType, RiskLevel, SourceChannel, DispatchStatus, ProcessAction } from '../objects/types';
import { PilotEntity } from '../objects/entities';
import { DispatchService } from '../services/dispatchService';
import { MaterialRule } from '../rules/materialRule';
import { RiskAssessmentRule } from '../rules/riskAssessmentRule';
import { ReviewRule } from '../rules/reviewRule';
import { ExportService } from '../records/exportService';
import { processRecorder } from '../records/processRecorder';

describe('港口引航员资质派单API - 单元测试', () => {
  let dispatchService: DispatchService;

  beforeEach(() => {
    dispatchService = new DispatchService();
  });

  describe('对象层 - 引航员实体', () => {
    it('应该正确创建引航员实体', () => {
      const pilot = new PilotEntity({
        name: '张三',
        idNumber: '310101199001011234',
        qualificationLevel: '一级',
        serviceYears: 10,
        portScope: ['上海港', '宁波港'],
        licenseNumber: 'PILOT-2024-001',
        licenseExpireDate: '2030-12-31'
      });

      expect(pilot.name).toBe('张三');
      expect(pilot.qualificationLevel).toBe('一级');
      expect(pilot.serviceYears).toBe(10);
      expect(pilot.isLicenseValid()).toBe(true);
      expect(pilot.isValidAtPort('上海港')).toBe(true);
      expect(pilot.isValidAtPort('深圳港')).toBe(false);
    });
  });

  describe('规则层 - 材料校验', () => {
    it('材料齐全时应返回 complete=true', () => {
      const item = {
        itemId: 'test-001',
        pilotId: 'pilot-001',
        shipName: '远洋一号',
        shipType: '散货船',
        shipGrossTonnage: 50000,
        portOfCall: '上海港',
        pilotageTime: '2024-01-15T10:00:00Z',
        materials: [
          { type: MaterialType.ID_CARD, name: '身份证', provided: true },
          { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
          { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
          { type: MaterialType.PHOTO, name: '照片', provided: true }
        ]
      };

      const result = MaterialRule.checkMaterials(item as any);
      expect(result.complete).toBe(true);
      expect(result.missingMaterials.length).toBe(0);
      expect(result.reasons.length).toBe(0);
    });

    it('缺少身份证和资质证书时应返回 complete=false 及对应原因', () => {
      const item = {
        itemId: 'test-002',
        pilotId: 'pilot-002',
        shipName: '测试船',
        shipType: '散货船',
        shipGrossTonnage: 10000,
        portOfCall: '上海港',
        pilotageTime: '2024-01-15T10:00:00Z',
        materials: [
          { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
          { type: MaterialType.PHOTO, name: '照片', provided: true }
        ]
      };

      const result = MaterialRule.checkMaterials(item as any);
      expect(result.complete).toBe(false);
      expect(result.missingMaterials.length).toBe(2);
      expect(result.reasons).toContain('缺少身份证');
      expect(result.reasons).toContain('缺少资质证书');
    });
  });

  describe('规则层 - 风险评估', () => {
    it('低风险场景：小型普通货船 + 材料齐全 + 经验丰富引航员', () => {
      const pilot = new PilotEntity({
        id: 'pilot-low',
        name: '李四',
        idNumber: '310101198501015678',
        qualificationLevel: '一级',
        serviceYears: 15,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-LOW-001',
        licenseExpireDate: '2030-12-31'
      });

      const item = {
        itemId: 'risk-low-001',
        pilotId: 'pilot-low',
        shipName: '顺风号',
        shipType: '散货船',
        shipGrossTonnage: 8000,
        portOfCall: '上海港',
        pilotageTime: '2024-01-15T10:00:00Z',
        materials: [
          { type: MaterialType.ID_CARD, name: '身份证', provided: true },
          { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
          { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
          { type: MaterialType.PHOTO, name: '照片', provided: true }
        ]
      };

      const result = RiskAssessmentRule.assess(item as any, pilot);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.riskScore).toBeLessThan(25);
    });

    it('中风险场景：中型集装箱船 + 材料齐全', () => {
      const pilot = new PilotEntity({
        id: 'pilot-med',
        name: '王五',
        idNumber: '310101199001019012',
        qualificationLevel: '一级',
        serviceYears: 8,
        portScope: ['上海港', '宁波港'],
        licenseNumber: 'PILOT-MED-001',
        licenseExpireDate: '2030-12-31'
      });

      const item = {
        itemId: 'risk-med-001',
        pilotId: 'pilot-med',
        shipName: '中海集运号',
        shipType: '集装箱船',
        shipGrossTonnage: 60000,
        portOfCall: '上海港',
        pilotageTime: '2024-01-15T10:00:00Z',
        materials: [
          { type: MaterialType.ID_CARD, name: '身份证', provided: true },
          { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
          { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
          { type: MaterialType.PHOTO, name: '照片', provided: true }
        ]
      };

      const result = RiskAssessmentRule.assess(item as any, pilot);
      expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(result.riskReasons.length).toBeGreaterThan(0);
    });

    it('高风险场景：超大型油轮 + 新手引航员', () => {
      const pilot = new PilotEntity({
        id: 'pilot-high',
        name: '赵六',
        idNumber: '310101199801013456',
        qualificationLevel: '三级',
        serviceYears: 1,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-HIGH-001',
        licenseExpireDate: '2030-12-31'
      });

      const item = {
        itemId: 'risk-high-001',
        pilotId: 'pilot-high',
        shipName: '巨无霸油轮',
        shipType: '油轮',
        shipGrossTonnage: 150000,
        portOfCall: '上海港',
        pilotageTime: '2024-01-15T10:00:00Z',
        materials: [
          { type: MaterialType.ID_CARD, name: '身份证', provided: true },
          { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
          { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
          { type: MaterialType.PHOTO, name: '照片', provided: true }
        ]
      };

      const result = RiskAssessmentRule.assess(item as any, pilot);
      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.riskScore).toBeGreaterThanOrEqual(50);
      expect(result.riskReasons).toContainEqual(expect.stringContaining('高风险船舶'));
      expect(result.riskReasons).toContainEqual(expect.stringContaining('超大型船舶'));
    });

    it('无法判定场景：未获取引航员信息 + 缺少材料', () => {
      const item = {
        itemId: 'risk-undetermined-001',
        pilotId: 'unknown-pilot',
        shipName: '神秘号',
        shipType: '散货船',
        shipGrossTonnage: 30000,
        portOfCall: '上海港',
        pilotageTime: '2024-01-15T10:00:00Z',
        materials: [
          { type: MaterialType.ID_CARD, name: '身份证', provided: false },
          { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: false }
        ]
      };

      const result = RiskAssessmentRule.assess(item as any, undefined);
      expect(result.riskLevel).toBe(RiskLevel.UNDETERMINED);
      expect(result.riskReasons).toContainEqual(expect.stringContaining('未获取引航员信息'));
    });
  });

  describe('规则层 - 复核规则', () => {
    it('高风险时必须进入复核，不允许直接通过', () => {
      const riskResult = {
        riskLevel: RiskLevel.HIGH,
        riskReasons: ['高风险船舶'],
        riskScore: 60
      };
      const materialResult = {
        complete: true,
        missingMaterials: [],
        invalidMaterials: [],
        reasons: []
      };

      const result = ReviewRule.evaluate(riskResult as any, materialResult as any);
      expect(result.reviewRequired).toBe(true);
      expect(result.canDirectApprove).toBe(false);
      expect(result.reasons).toContainEqual(expect.stringContaining('必须进入复核流程'));
    });

    it('材料不齐全时必须进入复核，不允许直接通过', () => {
      const riskResult = {
        riskLevel: RiskLevel.LOW,
        riskReasons: [],
        riskScore: 5
      };
      const materialResult = {
        complete: false,
        missingMaterials: [{ type: 'ID_CARD', name: '身份证', provided: false }],
        invalidMaterials: [],
        reasons: ['缺少身份证']
      };

      const result = ReviewRule.evaluate(riskResult as any, materialResult as any);
      expect(result.reviewRequired).toBe(true);
      expect(result.canDirectApprove).toBe(false);
      expect(result.suggestedStatus).toBe(DispatchStatus.SUPPLEMENT_REQUIRED);
    });

    it('低风险且材料齐全时可直接办理', () => {
      const riskResult = {
        riskLevel: RiskLevel.LOW,
        riskReasons: [],
        riskScore: 5
      };
      const materialResult = {
        complete: true,
        missingMaterials: [],
        invalidMaterials: [],
        reasons: []
      };

      const result = ReviewRule.evaluate(riskResult as any, materialResult as any);
      expect(result.reviewRequired).toBe(false);
      expect(result.canDirectApprove).toBe(true);
      expect(result.suggestedStatus).toBe(DispatchStatus.APPROVABLE);
    });

    it('无法判定风险时必须进入复核', () => {
      const riskResult = {
        riskLevel: RiskLevel.UNDETERMINED,
        riskReasons: ['未获取引航员信息'],
        riskScore: 30
      };
      const materialResult = {
        complete: true,
        missingMaterials: [],
        invalidMaterials: [],
        reasons: []
      };

      const result = ReviewRule.evaluate(riskResult as any, materialResult as any);
      expect(result.reviewRequired).toBe(true);
      expect(result.canDirectApprove).toBe(false);
    });
  });

  describe('状态层 - 状态机', () => {
    it('从PENDING状态SUBMIT后应进入UNDER_REVIEW', () => {
      const { DispatchStateMachine } = require('../states/dispatchStateMachine');
      const sm = new DispatchStateMachine('item-001', DispatchStatus.PENDING, RiskLevel.LOW);

      expect(sm.getCurrentStatus()).toBe(DispatchStatus.PENDING);
      const result = sm.transition(ProcessAction.SUBMIT, 'system', '提交申请');
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(DispatchStatus.UNDER_REVIEW);
      expect(sm.getHistory().length).toBe(1);
    });

    it('高风险申请不允许直接从UNDER_REVIEW APPROVE到APPROVABLE', () => {
      const { DispatchStateMachine } = require('../states/dispatchStateMachine');
      const sm = new DispatchStateMachine('item-002', DispatchStatus.UNDER_REVIEW, RiskLevel.HIGH);

      const result = sm.transition(ProcessAction.APPROVE, 'reviewer', '尝试直接通过高风险申请');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('高风险申请不允许直接通过');
    });

    it('SUPPLEMENT_REQUIRED状态可以补充材料后回到UNDER_REVIEW', () => {
      const { DispatchStateMachine } = require('../states/dispatchStateMachine');
      const sm = new DispatchStateMachine('item-003', DispatchStatus.SUPPLEMENT_REQUIRED, RiskLevel.MEDIUM);

      const result = sm.transition(ProcessAction.SUPPLEMENT, 'applicant', '补充了缺失材料');
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(DispatchStatus.UNDER_REVIEW);
    });
  });

  describe('记录层 - 处理轨迹', () => {
    it('应记录处理轨迹并保留批次号和来源渠道', () => {
      const { DispatchStateMachine } = require('../states/dispatchStateMachine');
      const sm = new DispatchStateMachine('record-test-001', DispatchStatus.PENDING, RiskLevel.LOW);
      sm.transition(ProcessAction.SUBMIT, 'system');

      const history = sm.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].from).toBe(DispatchStatus.PENDING);
      expect(history[0].to).toBe(DispatchStatus.UNDER_REVIEW);
      expect(history[0].action).toBe(ProcessAction.SUBMIT);
    });
  });

  describe('导出服务', () => {
    it('应正确生成CSV导出内容，包含批次号和来源渠道', () => {
      const mockResult = {
        batchNo: 'BATCH-EXPORT-001',
        sourceChannel: SourceChannel.ONLINE,
        totalCount: 1,
        approvableCount: 1,
        supplementRequiredCount: 0,
        lockedCount: 0,
        failedCount: 0,
        items: [
          {
            itemId: 'export-001',
            pilotId: 'pilot-001',
            pilotName: '张三',
            shipName: '测试船',
            status: DispatchStatus.APPROVABLE,
            reasons: ['材料齐全', '低风险'],
            riskLevel: RiskLevel.LOW,
            reviewRequired: false,
            canDirectApprove: true
          }
        ],
        processedAt: '2024-01-15T10:00:00Z'
      };

      const csv = ExportService.toCSV(mockResult as any);
      expect(csv).toContain('批次号');
      expect(csv).toContain('BATCH-EXPORT-001');
      expect(csv).toContain('来源渠道');
      expect(csv).toContain('线上渠道');
      expect(csv).toContain('可办理');
    });

    it('应生成包含批次信息的摘要', () => {
      const mockResult = {
        batchNo: 'BATCH-SUMMARY-001',
        sourceChannel: SourceChannel.PORTAL,
        totalCount: 10,
        approvableCount: 6,
        supplementRequiredCount: 2,
        lockedCount: 1,
        failedCount: 1,
        items: [],
        processedAt: '2024-01-15T10:00:00Z'
      };

      const summary = ExportService.getSummary(mockResult as any);
      expect(summary.batchNo).toBe('BATCH-SUMMARY-001');
      expect(summary.sourceChannel).toBe(SourceChannel.PORTAL);
      expect(summary.totalCount).toBe(10);
      expect(summary.approvableCount).toBe(6);
      expect(summary.supplementRequiredCount).toBe(2);
      expect(summary.lockedCount).toBe(1);
      expect(summary.failedCount).toBe(1);
    });
  });
});
