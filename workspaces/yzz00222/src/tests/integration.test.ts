import {
  MaterialType,
  RiskLevel,
  SourceChannel,
  DispatchStatus,
  ProcessAction,
  DispatchResult
} from '../objects/types';
import { PilotEntity } from '../objects/entities';
import { DispatchService } from '../services/dispatchService';
import { ExportService } from '../records/exportService';

describe('港口引航员资质派单API - 集成测试', () => {
  let dispatchService: DispatchService;

  beforeEach(() => {
    dispatchService = new DispatchService();
  });

  describe('完整批处理流程', () => {
    it('低风险场景：材料齐全 + 低风险船舶 = 可办理', () => {
      const pilot = new PilotEntity({
        id: 'pilot-low-risk',
        name: '张引航',
        idNumber: '310101198501011234',
        qualificationLevel: '一级',
        serviceYears: 12,
        portScope: ['上海港', '宁波港'],
        licenseNumber: 'PILOT-LOW-001',
        licenseExpireDate: '2030-12-31'
      });
      dispatchService.registerPilot(pilot);

      const result = dispatchService.processBatch({
        batchNo: 'BATCH-LOW-001',
        sourceChannel: SourceChannel.ONLINE,
        items: [
          {
            itemId: 'item-low-001',
            pilotId: 'pilot-low-risk',
            pilotName: '张引航',
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
          }
        ],
        action: ProcessAction.SUBMIT
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      expect(data.batchNo).toBe('BATCH-LOW-001');
      expect(data.sourceChannel).toBe(SourceChannel.ONLINE);
      expect(data.totalCount).toBe(1);
      expect(data.approvableCount).toBe(1);
      expect(data.items[0].status).toBe(DispatchStatus.APPROVABLE);
      expect(data.items[0].riskLevel).toBe(RiskLevel.LOW);
      expect(data.items[0].canDirectApprove).toBe(true);
      expect(data.items[0].reviewRequired).toBe(false);
    });

    it('中风险场景：中型集装箱船 + 材料齐全 = 可办理（中风险但可直接通过）', () => {
      const pilot = new PilotEntity({
        id: 'pilot-med-risk',
        name: '李引航',
        idNumber: '310101199001015678',
        qualificationLevel: '一级',
        serviceYears: 8,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-MED-001',
        licenseExpireDate: '2030-12-31'
      });
      dispatchService.registerPilot(pilot);

      const result = dispatchService.processBatch({
        batchNo: 'BATCH-MED-001',
        sourceChannel: SourceChannel.PORTAL,
        items: [
          {
            itemId: 'item-med-001',
            pilotId: 'pilot-med-risk',
            pilotName: '李引航',
            shipName: '中海集运号',
            shipType: '集装箱船',
            shipGrossTonnage: 60000,
            portOfCall: '上海港',
            pilotageTime: '2024-01-15T14:00:00Z',
            materials: [
              { type: MaterialType.ID_CARD, name: '身份证', provided: true },
              { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
              { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
              { type: MaterialType.PHOTO, name: '照片', provided: true }
            ]
          }
        ],
        action: ProcessAction.SUBMIT
      });

      expect(result.success).toBe(true);
      const data = result.data!;
      expect(data.batchNo).toBe('BATCH-MED-001');
      expect(data.items[0].status).toBe(DispatchStatus.APPROVABLE);
      expect(data.items[0].riskLevel).toBe(RiskLevel.MEDIUM);
      expect(data.items[0].reviewRequired).toBe(false);
      expect(data.items[0].canDirectApprove).toBe(true);
      expect(data.items[0].reasons.length).toBeGreaterThan(0);
      expect(data.items[0].reasons).toContainEqual(expect.stringContaining('中风险船舶'));
    });

    it('高风险场景：超大型油轮 = 必须复核，不能直接通过', () => {
      const pilot = new PilotEntity({
        id: 'pilot-high-risk',
        name: '王引航',
        idNumber: '310101199501019012',
        qualificationLevel: '二级',
        serviceYears: 3,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-HIGH-001',
        licenseExpireDate: '2030-12-31'
      });
      dispatchService.registerPilot(pilot);

      const result = dispatchService.processBatch({
        batchNo: 'BATCH-HIGH-001',
        sourceChannel: SourceChannel.THIRD_PARTY,
        items: [
          {
            itemId: 'item-high-001',
            pilotId: 'pilot-high-risk',
            pilotName: '王引航',
            shipName: '巨无霸油轮',
            shipType: '油轮',
            shipGrossTonnage: 150000,
            portOfCall: '上海港',
            pilotageTime: '2024-01-15T16:00:00Z',
            materials: [
              { type: MaterialType.ID_CARD, name: '身份证', provided: true },
              { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
              { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
              { type: MaterialType.PHOTO, name: '照片', provided: true }
            ]
          }
        ],
        action: ProcessAction.SUBMIT
      });

      expect(result.success).toBe(true);
      const data = result.data!;
      expect(data.items[0].status).toBe(DispatchStatus.UNDER_REVIEW);
      expect(data.items[0].riskLevel).toBe(RiskLevel.HIGH);
      expect(data.items[0].reviewRequired).toBe(true);
      expect(data.items[0].canDirectApprove).toBe(false);
      expect(data.items[0].reasons).toContainEqual(expect.stringContaining('高风险申请'));
    });

    it('无法判定场景：未知引航员 + 缺少材料 = 需补充并复核', () => {
      const result = dispatchService.processBatch({
        batchNo: 'BATCH-UNDETERMINED-001',
        sourceChannel: SourceChannel.OFFLINE,
        items: [
          {
            itemId: 'item-undetermined-001',
            pilotId: 'unknown-pilot-999',
            pilotName: '未知引航员',
            shipName: '神秘号',
            shipType: '散货船',
            shipGrossTonnage: 30000,
            portOfCall: '上海港',
            pilotageTime: '2024-01-15T18:00:00Z',
            materials: [
              { type: MaterialType.ID_CARD, name: '身份证', provided: false },
              { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: false },
              { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
              { type: MaterialType.PHOTO, name: '照片', provided: true }
            ]
          }
        ],
        action: ProcessAction.SUBMIT
      });

      expect(result.success).toBe(true);
      const data = result.data!;
      expect(data.items[0].status).toBe(DispatchStatus.SUPPLEMENT_REQUIRED);
      expect(data.items[0].riskLevel).toBe(RiskLevel.UNDETERMINED);
      expect(data.items[0].reviewRequired).toBe(true);
      expect(data.items[0].canDirectApprove).toBe(false);
      expect(data.items[0].reasons).toContainEqual(expect.stringContaining('无法准确判定'));
      expect(data.items[0].reasons).toContainEqual(expect.stringContaining('缺少'));
    });
  });

  describe('混合批次处理', () => {
    it('混合批次应正确分类各类状态', () => {
      const pilot1 = new PilotEntity({
        id: 'pilot-mix-1',
        name: '张一',
        idNumber: '310101198001010001',
        qualificationLevel: '一级',
        serviceYears: 20,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-MIX-001',
        licenseExpireDate: '2030-12-31'
      });
      const pilot2 = new PilotEntity({
        id: 'pilot-mix-2',
        name: '张二',
        idNumber: '310101198001010002',
        qualificationLevel: '一级',
        serviceYears: 15,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-MIX-002',
        licenseExpireDate: '2030-12-31'
      });
      dispatchService.registerPilot(pilot1);
      dispatchService.registerPilot(pilot2);

      const result = dispatchService.processBatch({
        batchNo: 'BATCH-MIX-001',
        sourceChannel: SourceChannel.ONLINE,
        items: [
          {
            itemId: 'mix-low-001',
            pilotId: 'pilot-mix-1',
            pilotName: '张一',
            shipName: '低风险船',
            shipType: '散货船',
            shipGrossTonnage: 5000,
            portOfCall: '上海港',
            pilotageTime: '2024-01-15T08:00:00Z',
            materials: [
              { type: MaterialType.ID_CARD, name: '身份证', provided: true },
              { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
              { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
              { type: MaterialType.PHOTO, name: '照片', provided: true }
            ]
          },
          {
            itemId: 'mix-high-001',
            pilotId: 'pilot-mix-2',
            pilotName: '张二',
            shipName: '高风险油轮',
            shipType: '油轮',
            shipGrossTonnage: 120000,
            portOfCall: '上海港',
            pilotageTime: '2024-01-15T10:00:00Z',
            materials: [
              { type: MaterialType.ID_CARD, name: '身份证', provided: true },
              { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
              { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
              { type: MaterialType.PHOTO, name: '照片', provided: true }
            ]
          },
          {
            itemId: 'mix-supplement-001',
            pilotId: 'pilot-mix-1',
            pilotName: '张一',
            shipName: '缺材料船',
            shipType: '散货船',
            shipGrossTonnage: 8000,
            portOfCall: '上海港',
            pilotageTime: '2024-01-15T12:00:00Z',
            materials: [
              { type: MaterialType.ID_CARD, name: '身份证', provided: false },
              { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
              { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: false },
              { type: MaterialType.PHOTO, name: '照片', provided: true }
            ]
          }
        ],
        action: ProcessAction.SUBMIT
      });

      expect(result.success).toBe(true);
      const data = result.data!;
      expect(data.totalCount).toBe(3);
      expect(data.approvableCount).toBe(1);
      expect(data.supplementRequiredCount).toBe(1);
      expect(data.items.filter(i => i.status === DispatchStatus.UNDER_REVIEW).length).toBe(1);

      const lowItem = data.items.find(i => i.itemId === 'mix-low-001')!;
      expect(lowItem.status).toBe(DispatchStatus.APPROVABLE);
      expect(lowItem.riskLevel).toBe(RiskLevel.LOW);

      const highItem = data.items.find(i => i.itemId === 'mix-high-001')!;
      expect(highItem.status).toBe(DispatchStatus.UNDER_REVIEW);
      expect(highItem.riskLevel).toBe(RiskLevel.HIGH);
      expect(highItem.canDirectApprove).toBe(false);

      const suppItem = data.items.find(i => i.itemId === 'mix-supplement-001')!;
      expect(suppItem.status).toBe(DispatchStatus.SUPPLEMENT_REQUIRED);
      expect(suppItem.reviewRequired).toBe(true);
    });
  });

  describe('历史轨迹和导出', () => {
    it('应保留处理批次和来源标识，可查询历史轨迹', () => {
      const pilot = new PilotEntity({
        id: 'pilot-history',
        name: '历史引航员',
        idNumber: '310101198501017777',
        qualificationLevel: '一级',
        serviceYears: 10,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-HIST-001',
        licenseExpireDate: '2030-12-31'
      });
      dispatchService.registerPilot(pilot);

      const batchNo = 'BATCH-HISTORY-001';
      const sourceChannel = SourceChannel.PORTAL;

      const result = dispatchService.processBatch({
        batchNo,
        sourceChannel,
        items: [
          {
            itemId: 'hist-item-001',
            pilotId: 'pilot-history',
            pilotName: '历史引航员',
            shipName: '历史测试船',
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
          }
        ],
        action: ProcessAction.SUBMIT
      });

      expect(result.success).toBe(true);

      const itemHistory = dispatchService.getItemHistory('hist-item-001');
      expect(itemHistory.length).toBeGreaterThan(0);
      expect(itemHistory[0].batchNo).toBe(batchNo);
      expect(itemHistory[0].sourceChannel).toBe(sourceChannel);

      const batchHistory = dispatchService.getBatchHistory(batchNo);
      expect(batchHistory).toBeDefined();
      expect(batchHistory!.batchNo).toBe(batchNo);
      expect(batchHistory!.sourceChannel).toBe(sourceChannel);
      expect(batchHistory!.totalItems).toBe(1);
    });

    it('导出结果应包含批次号和来源渠道，便于业务复盘', () => {
      const pilot = new PilotEntity({
        id: 'pilot-export',
        name: '导出引航员',
        idNumber: '310101198501018888',
        qualificationLevel: '一级',
        serviceYears: 10,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-EXP-001',
        licenseExpireDate: '2030-12-31'
      });
      dispatchService.registerPilot(pilot);

      const batchNo = 'BATCH-EXPORT-TEST-001';
      const result = dispatchService.processBatch({
        batchNo,
        sourceChannel: SourceChannel.THIRD_PARTY,
        items: [
          {
            itemId: 'exp-item-001',
            pilotId: 'pilot-export',
            pilotName: '导出引航员',
            shipName: '导出测试船',
            shipType: '集装箱船',
            shipGrossTonnage: 50000,
            portOfCall: '上海港',
            pilotageTime: '2024-01-15T10:00:00Z',
            materials: [
              { type: MaterialType.ID_CARD, name: '身份证', provided: true },
              { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
              { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
              { type: MaterialType.PHOTO, name: '照片', provided: true }
            ]
          }
        ],
        action: ProcessAction.SUBMIT
      });

      expect(result.success).toBe(true);
      const data = result.data!;

      const records = ExportService.toRecordList(data);
      expect(records.length).toBe(1);
      expect(records[0].批次号).toBe(batchNo);
      expect(records[0].来源渠道).toBe('第三方渠道');

      const summary = ExportService.getSummary(data);
      expect(summary.batchNo).toBe(batchNo);
      expect(summary.sourceChannel).toBe(SourceChannel.THIRD_PARTY);

      const csv = ExportService.toCSV(data);
      expect(csv).toContain(batchNo);
      expect(csv).toContain('第三方渠道');
    });
  });

  describe('状态流转测试', () => {
    it('需补充状态补充材料后进入复核，复核通过后可办理', () => {
      const pilot = new PilotEntity({
        id: 'pilot-flow',
        name: '流程引航员',
        idNumber: '310101198501019999',
        qualificationLevel: '一级',
        serviceYears: 10,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-FLOW-001',
        licenseExpireDate: '2030-12-31'
      });
      dispatchService.registerPilot(pilot);

      const result = dispatchService.processBatch({
        batchNo: 'BATCH-FLOW-001',
        sourceChannel: SourceChannel.ONLINE,
        items: [
          {
            itemId: 'flow-item-001',
            pilotId: 'pilot-flow',
            pilotName: '流程引航员',
            shipName: '流程测试船',
            shipType: '散货船',
            shipGrossTonnage: 8000,
            portOfCall: '上海港',
            pilotageTime: '2024-01-15T10:00:00Z',
            materials: [
              { type: MaterialType.ID_CARD, name: '身份证', provided: false },
              { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
              { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
              { type: MaterialType.PHOTO, name: '照片', provided: true }
            ]
          }
        ],
        action: ProcessAction.SUBMIT
      });

      expect(result.success).toBe(true);
      expect(result.data!.items[0].status).toBe(DispatchStatus.SUPPLEMENT_REQUIRED);

      const supplementResult = dispatchService.performAction(
        'flow-item-001',
        ProcessAction.SUPPLEMENT,
        'applicant',
        '补充了身份证材料'
      );
      expect(supplementResult.success).toBe(true);
      expect(supplementResult.newStatus).toBe(DispatchStatus.UNDER_REVIEW);

      const approveResult = dispatchService.performAction(
        'flow-item-001',
        ProcessAction.APPROVE,
        'reviewer',
        '复核通过'
      );
      expect(approveResult.success).toBe(true);
      expect(approveResult.newStatus).toBe(DispatchStatus.APPROVABLE);

      const history = dispatchService.getItemHistory('flow-item-001');
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('高风险申请不允许直接通过，必须经过复核', () => {
      const pilot = new PilotEntity({
        id: 'pilot-high-flow',
        name: '高风险引航员',
        idNumber: '310101199501011111',
        qualificationLevel: '二级',
        serviceYears: 2,
        portScope: ['上海港'],
        licenseNumber: 'PILOT-HIGHFLOW-001',
        licenseExpireDate: '2030-12-31'
      });
      dispatchService.registerPilot(pilot);

      const result = dispatchService.processBatch({
        batchNo: 'BATCH-HIGHFLOW-001',
        sourceChannel: SourceChannel.OFFLINE,
        items: [
          {
            itemId: 'high-flow-item-001',
            pilotId: 'pilot-high-flow',
            pilotName: '高风险引航员',
            shipName: '超级油轮',
            shipType: '油轮',
            shipGrossTonnage: 200000,
            portOfCall: '上海港',
            pilotageTime: '2024-01-15T10:00:00Z',
            materials: [
              { type: MaterialType.ID_CARD, name: '身份证', provided: true },
              { type: MaterialType.QUALIFICATION_CERT, name: '资质证书', provided: true },
              { type: MaterialType.HEALTH_CERT, name: '健康证明', provided: true },
              { type: MaterialType.PHOTO, name: '照片', provided: true }
            ]
          }
        ],
        action: ProcessAction.SUBMIT
      });

      expect(result.success).toBe(true);
      expect(result.data!.items[0].riskLevel).toBe(RiskLevel.HIGH);
      expect(result.data!.items[0].canDirectApprove).toBe(false);

      const stateMachine = dispatchService.getStateMachine('high-flow-item-001');
      expect(stateMachine).toBeDefined();
      if (stateMachine) {
        expect(stateMachine.getRiskLevel()).toBe(RiskLevel.HIGH);
      }
    });
  });
});
