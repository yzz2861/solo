import { createApp } from '../../src/api/app';
import { Application } from 'express';
import {
  DrugCategory,
  DrugUnit,
  ApplicationType,
  MaterialType,
  HistoricalStatusType,
  HandoverState,
  DecisionType,
} from '../../src/domain';
import { HandoverController } from '../../src/api/controllers/handover.controller';
import { mapRequestToDomain } from '../../src/api/mappers/dto.mapper';
import {
  createCompliantScenario,
  createOverThresholdScenario,
  createMaterialMissingScenario,
  createHighRiskScenario,
  createHistoryReplayScenario,
} from '../fixtures/test-fixtures';
import { DECISION_TEXT_MAP } from '../../src/api/dto/response.dto';

describe('API Layer - API层测试', () => {
  let app: Application;

  beforeEach(() => {
    app = createApp();
  });

  describe('Express App', () => {
    it('应该成功创建 Express 应用', () => {
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
      expect(typeof app.listen).toBe('function');
    });

    it('应该有路由配置', () => {
      const routes = app._router?.stack?.filter(
        (layer: any) => layer.route
      );
      expect(routes).toBeDefined();
    });
  });

  describe('HandoverController', () => {
    let controller: HandoverController;

    beforeEach(() => {
      controller = new HandoverController();
    });

    it('应该能创建控制器实例', () => {
      expect(controller).toBeDefined();
      expect(controller.getService()).toBeDefined();
    });

    it('服务应能正确处理合规请求', () => {
      const scenario = createCompliantScenario();
      const service = controller.getService();
      const result = service.processHandover(scenario);

      expect(result.success).toBe(true);
      expect(result.decision).toBe(DecisionType.PASS);
      expect(result.finalState).toBe(HandoverState.PASSED);
    });

    it('服务应能正确处理超阈值请求', () => {
      const scenario = createOverThresholdScenario();
      const service = controller.getService();
      const result = service.processHandover(scenario);

      expect(result.decision).toBe(DecisionType.REJECT);
      expect(result.finalState).toBe(HandoverState.REJECTED);
    });

    it('服务应能正确处理材料缺失请求', () => {
      const scenario = createMaterialMissingScenario();
      const service = controller.getService();
      const result = service.processHandover(scenario);

      expect(result.decision).toBe(DecisionType.REVIEW_REQUIRED);
      expect(result.finalState).toBe(HandoverState.REVIEW_REQUIRED);
    });

    it('服务应能正确处理高风险请求', () => {
      const scenario = createHighRiskScenario();
      const service = controller.getService();
      const result = service.processHandover(scenario);

      expect(result.decision).toBe(DecisionType.REVIEW_REQUIRED);
      expect(result.riskTags).toContain('高风险药品');
    });

    it('服务应能正确处理历史回放请求', () => {
      const scenario = createHistoryReplayScenario();
      const service = controller.getService();
      const result = service.processHandover(scenario);

      expect(result.riskTags).toContain('历史风险');
    });
  });

  describe('DTO Mapper - DTO映射', () => {
    it('应该正确映射合规场景请求', () => {
      const scenario = createCompliantScenario();

      const requestDTO = {
        application: {
          id: scenario.application.id,
          applicationNo: scenario.application.applicationNo,
          type: scenario.application.type,
          applicantId: scenario.application.applicantId,
          applicantName: scenario.application.applicantName,
          fromDepartment: scenario.application.fromDepartment,
          toDepartment: scenario.application.toDepartment,
          items: scenario.application.items.map((item) => ({
            id: item.id,
            drug: {
              id: item.drug.id,
              code: item.drug.code,
              name: item.drug.name,
              genericName: item.drug.genericName,
              category: item.drug.category,
              specification: item.drug.specification,
              unit: item.drug.unit,
              dosagePerUnit: item.drug.dosagePerUnit,
              isHighRisk: item.drug.isHighRisk,
              controlledLevel: item.drug.controlledLevel,
            },
            batchNumber: item.batchNumber,
            productionDate: item.productionDate,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            remainingQuantity: item.remainingQuantity,
            usedQuantity: item.usedQuantity,
          })),
          submitTime: scenario.application.submitTime,
          remark: scenario.application.remark,
        },
        materials: scenario.materials.map((m) => ({
          id: m.id,
          type: m.type,
          name: m.name,
          url: m.url,
          uploadTime: m.uploadTime,
          uploaderId: m.uploaderId,
        })),
        history: {
          applicationId: scenario.history.applicationId,
          currentStatus: scenario.history.currentStatus,
          records: scenario.history.records.map((r) => ({
            id: r.id,
            status: r.status,
            operatorId: r.operatorId,
            operatorName: r.operatorName,
            operateTime: r.operateTime,
            remark: r.remark,
            riskTags: r.riskTags,
          })),
        },
        thresholdConfig: {
          id: scenario.thresholdConfig.id,
          name: scenario.thresholdConfig.name,
          version: scenario.thresholdConfig.version,
          effectiveTime: scenario.thresholdConfig.effectiveTime,
          categoryThresholds: scenario.thresholdConfig.categoryThresholds.map((ct) => ({
            category: ct.category,
            maxQuantityPerHandover: ct.maxQuantityPerHandover,
            maxValuePerHandover: ct.maxValuePerHandover,
            maxItemsPerHandover: ct.maxItemsPerHandover,
          })),
          generalThreshold: scenario.thresholdConfig.generalThreshold,
          highRisk: scenario.thresholdConfig.highRisk,
          material: {
            requiredMaterialTypes: scenario.thresholdConfig.material.requiredMaterialTypes,
            requireItemLevelMaterials: scenario.thresholdConfig.material.requireItemLevelMaterials,
            minMaterialCount: scenario.thresholdConfig.material.minMaterialCount,
          },
          history: scenario.thresholdConfig.history,
          quantityDeviation: scenario.thresholdConfig.quantityDeviation,
        },
        operatorId: 'user-001',
        operatorName: '测试用户',
      };

      const domain = mapRequestToDomain(requestDTO);

      expect(domain.application.id).toBe('app-compliant-001');
      expect(domain.application.items.length).toBe(2);
      expect(domain.materials.length).toBe(2);
      expect(domain.history.applicationId).toBe('app-compliant-001');
      expect(domain.thresholdConfig.generalThreshold.maxTotalQuantity).toBe(100);
    });
  });

  describe('枚举值验证', () => {
    it('应该正确映射药品分类枚举', () => {
      expect(DrugCategory.NARCOTIC).toBe('narcotic');
      expect(DrugCategory.PSYCHOTROPIC_FIRST).toBe('psychotropic_first');
      expect(DrugCategory.PSYCHOTROPIC_SECOND).toBe('psychotropic_second');
    });

    it('应该正确映射材料类型枚举', () => {
      expect(MaterialType.PRESCRIPTION).toBe('prescription');
      expect(MaterialType.USAGE_LOG).toBe('usage_log');
      expect(MaterialType.WASTE_DISPOSAL_RECORD).toBe('waste_disposal_record');
    });

    it('应该正确映射历史状态枚举', () => {
      expect(HistoricalStatusType.SUBMITTED).toBe('submitted');
      expect(HistoricalStatusType.PASSED).toBe('passed');
      expect(HistoricalStatusType.REJECTED).toBe('rejected');
      expect(HistoricalStatusType.REVIEW_REQUIRED).toBe('review_required');
    });

    it('应该正确映射申请类型枚举', () => {
      expect(ApplicationType.SHIFT_HANDOVER).toBe('shift_handover');
      expect(ApplicationType.DEPARTMENT_TRANSFER).toBe('department_transfer');
    });

    it('应该正确映射药品单位枚举', () => {
      expect(DrugUnit.MG).toBe('mg');
      expect(DrugUnit.ML).toBe('ml');
      expect(DrugUnit.AMPOULE).toBe('ampoule');
    });

    it('决策文本映射应该正确', () => {
      expect(DECISION_TEXT_MAP[DecisionType.PASS]).toBe('通过');
      expect(DECISION_TEXT_MAP[DecisionType.REJECT]).toBe('拦截');
      expect(DECISION_TEXT_MAP[DecisionType.REVIEW_REQUIRED]).toBe('待复核');
    });
  });

  describe('响应结构', () => {
    it('响应应包含必要字段', () => {
      const scenario = createCompliantScenario();
      const controller = new HandoverController();
      const service = controller.getService();
      const result = service.processHandover(scenario);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('applicationId');
      expect(result).toHaveProperty('finalState');
      expect(result).toHaveProperty('decision');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('riskTags');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('ruleResults');
      expect(result).toHaveProperty('recordId');
      expect(result).toHaveProperty('recordNo');
      expect(result).toHaveProperty('logCount');
    });

    it('汇总结构应包含统计字段', () => {
      const scenario = createCompliantScenario();
      const controller = new HandoverController();
      const service = controller.getService();
      const result = service.processHandover(scenario);

      expect(result.summary).toHaveProperty('totalItemCount');
      expect(result.summary).toHaveProperty('totalQuantity');
      expect(result.summary).toHaveProperty('totalValue');
      expect(result.summary).toHaveProperty('totalRemainingQuantity');
      expect(result.summary).toHaveProperty('totalUsedQuantity');
      expect(result.summary).toHaveProperty('highRiskItemCount');
      expect(result.summary).toHaveProperty('drugCategoryCount');
    });
  });
});
