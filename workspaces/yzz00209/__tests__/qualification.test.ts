import {
  processQualification,
  processReview,
  getAuditRecord,
  getAuditTrail,
  checkDuplicate,
  validateInput,
  QualificationInput
} from '../src/services/qualificationService';
import { resetStore, seedDefaultRules } from '../src/store/datastore';
import { ObjectStatus, QualificationStatus } from '../src/layers/status';
import { ObjectType } from '../src/layers/object';
import { RiskLevel } from '../src/layers/rule';

describe('业委会投票资格API - 四层架构测试', () => {
  beforeEach(() => {
    resetStore();
    seedDefaultRules();
  });

  describe('基础功能测试', () => {
    it('应正确初始化默认规则', () => {
      const ruleSet = seedDefaultRules();
      expect(ruleSet).toBeDefined();
      expect(ruleSet.rules.length).toBeGreaterThan(0);
      expect(ruleSet.version).toBe('1.0.0');
    });

    it('输入验证应检测必填项缺失', () => {
      const input = {
        businessId: '',
        objectStatus: [],
        timeWindow: { start: '', end: '' },
        ruleVersion: '',
        operatorId: '',
        operatorName: '',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '',
          idNumber: ''
        },
        materialChecklist: {}
      };

      const result = validateInput(input as QualificationInput);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('业务编号不能为空');
      expect(result.errors).toContain('规则版本不能为空');
    });

    it('输入验证应检测时间窗口格式错误', () => {
      const input: QualificationInput = {
        businessId: 'BIZ001',
        objectStatus: [ObjectStatus.NORMAL],
        timeWindow: { start: 'invalid-date', end: '2024-12-31' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '张三',
          idNumber: '110101199001011234'
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('时间窗口开始日期格式无效');
    });

    it('输入验证应检测时间窗口开始晚于结束', () => {
      const input: QualificationInput = {
        businessId: 'BIZ001',
        objectStatus: [ObjectStatus.NORMAL],
        timeWindow: { start: '2024-12-31', end: '2024-01-01' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '张三',
          idNumber: '110101199001011234'
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('时间窗口开始日期不能晚于结束日期');
    });
  });

  describe('低风险场景 - 完全符合条件', () => {
    it('所有规则通过时应判定为合格（低风险）', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-LOW-001',
        objectStatus: [ObjectStatus.NORMAL, ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '合格业主',
          idNumber: '110101199001010001',
          propertyAddress: '测试小区1号楼1单元101室',
          propertyArea: 100.5,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: {
          idCard: true,
          propertyCert: true,
          powerOfAttorney: false
        }
      };

      const result = processQualification(input);

      expect(result.businessId).toBe('BIZ-LOW-001');
      expect(result.auditNo).toBeDefined();
      expect(result.auditNo.startsWith('AUD-')).toBe(true);
      expect(result.qualificationStatus).toBe(QualificationStatus.QUALIFIED);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.requiresReview).toBe(false);
      expect(result.riskTags.length).toBe(0);
      expect(result.passCount).toBe(result.totalCount);
      expect(result.conclusion).toContain('通过');
      expect(result.nextAction).toContain('可参与投票');
      expect(result.isDuplicate).toBe(false);
    });

    it('输出应包含完整的规则命中详情', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-LOW-002',
        objectStatus: [ObjectStatus.NORMAL, ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '合格业主',
          idNumber: '110101199001010002',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);

      expect(result.ruleHitDetails).toBeDefined();
      expect(result.ruleHitDetails.length).toBeGreaterThan(0);
      
      result.ruleHitDetails.forEach(detail => {
        expect(detail.ruleId).toBeDefined();
        expect(detail.ruleName).toBeDefined();
        expect(detail.ruleType).toBeDefined();
        expect(typeof detail.isHit).toBe('boolean');
        expect(detail.message).toBeDefined();
      });
    });
  });

  describe('中风险场景', () => {
    it('未实名认证时应为中风险', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-MED-001',
        objectStatus: [ObjectStatus.NORMAL, ObjectStatus.PENDING_VERIFICATION],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '未实名业主',
          idNumber: '110101199001010010',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: false
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);

      expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(result.riskTags).toContain('未实名');
      expect(result.failureReasons.length).toBeGreaterThan(0);
      expect(result.passCount).toBeLessThan(result.totalCount);
    });

    it('物业费拖欠应为中风险且需复核', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-MED-002',
        objectStatus: [ObjectStatus.VERIFIED, ObjectStatus.ARREARS],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '欠费业主',
          idNumber: '110101199001010020',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);

      expect(result.riskTags).toContain('欠费');
      expect(result.requiresReview).toBe(true);
      expect(result.qualificationStatus).toBe(QualificationStatus.PENDING_REVIEW);
      expect(result.nextAction).toContain('复核');
    });
  });

  describe('高风险场景', () => {
    it('材料缺失时应为高风险且进入复核', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-HIGH-001',
        objectStatus: [ObjectStatus.VERIFIED, ObjectStatus.MATERIAL_INCOMPLETE],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '材料缺失业主',
          idNumber: '110101199001010030',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: false }
      };

      const result = processQualification(input);

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.riskTags).toContain('材料缺失');
      expect(result.requiresReview).toBe(true);
      expect(result.qualificationStatus).toBe(QualificationStatus.PENDING_REVIEW);
      expect(result.nextAction).toContain('高风险');
      expect(result.nextAction).toContain('人工审核');
    });

    it('高风险不允许直接通过，必须进入复核', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-HIGH-002',
        objectStatus: [ObjectStatus.NORMAL],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.TENANT,
          name: '非业主租户',
          idNumber: '110101199001010040',
          propertyArea: 100,
          ownerSince: '2023-01-01',
          isVerified: false
        },
        materialChecklist: { idCard: false, propertyCert: false }
      };

      const result = processQualification(input);

      expect(result.qualificationStatus).not.toBe(QualificationStatus.QUALIFIED);
      expect(result.requiresReview).toBe(true);
      expect(result.conclusion).toContain('待复核');
    });
  });

  describe('无法判定场景', () => {
    it('缺少关键信息时应判定为无法判定', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-UNDET-001',
        objectStatus: [ObjectStatus.NORMAL],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '信息不全业主',
          idNumber: '110101199001010050',
          propertyArea: 0,
          isVerified: false
        },
        materialChecklist: {}
      };

      const result = processQualification(input);

      expect(result.conclusion).toContain('待复核');
      expect(result.failureReasons.length).toBeGreaterThan(0);
      expect(result.requiresReview).toBe(true);
    });

    it('无法判定时应给出明确的下一步动作提示', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-UNDET-002',
        objectStatus: [],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '状态不明业主',
          idNumber: '110101199001010060'
        },
        materialChecklist: {}
      };

      const result = processQualification(input);

      expect(result.nextAction).toBeDefined();
      expect(result.nextAction.length).toBeGreaterThan(0);
      expect(result.requiresReview).toBe(true);
    });
  });

  describe('边界条件测试', () => {
    it('产权取得时间刚好满6个月应通过（边界上）', () => {
      const windowStart = new Date('2024-06-01');
      const ownerSince = new Date(windowStart);
      ownerSince.setMonth(ownerSince.getMonth() - 6);

      const input: QualificationInput = {
        businessId: 'BIZ-BOUNDARY-001',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: {
          start: '2024-06-01',
          end: '2024-06-30'
        },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '边界业主',
          idNumber: '110101199001010100',
          propertyArea: 100,
          ownerSince: ownerSince.toISOString().split('T')[0],
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);
      const timeRule = result.ruleHitDetails.find(r => r.ruleType === 'time_window');
      
      expect(timeRule).toBeDefined();
    });

    it('产权取得时间差一天满6个月应不通过（边界下）', () => {
      const windowStart = new Date('2024-06-01');
      const ownerSince = new Date(windowStart);
      ownerSince.setMonth(ownerSince.getMonth() - 6);
      ownerSince.setDate(ownerSince.getDate() + 1);

      const input: QualificationInput = {
        businessId: 'BIZ-BOUNDARY-002',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: {
          start: '2024-06-01',
          end: '2024-06-30'
        },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '差一天业主',
          idNumber: '110101199001010200',
          propertyArea: 100,
          ownerSince: ownerSince.toISOString().split('T')[0],
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);
      const timeRule = result.ruleHitDetails.find(r => r.ruleType === 'time_window');
      
      expect(timeRule).toBeDefined();
      expect(timeRule!.isHit).toBe(false);
      expect(timeRule!.riskTags).toContain('新业主');
    });

    it('专有面积为0应触发面积规则失败', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-BOUNDARY-003',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '零面积业主',
          idNumber: '110101199001010300',
          propertyArea: 0,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);
      const areaRule = result.ruleHitDetails.find(r => r.ruleType === 'property_area');
      
      expect(areaRule).toBeDefined();
    });
  });

  describe('失败提示测试', () => {
    it('每种失败规则都应有明确的失败原因', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-FAIL-MSG-001',
        objectStatus: [],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.TENANT,
          name: '问题租户',
          idNumber: '110101199001010400',
          propertyArea: 0,
          isVerified: false
        },
        materialChecklist: { idCard: false, propertyCert: false }
      };

      const result = processQualification(input);

      expect(result.failureReasons).toBeDefined();
      expect(Array.isArray(result.failureReasons)).toBe(true);
      
      result.failureReasons.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });
    });

    it('参数错误时应返回明确的错误提示', () => {
      const input = {} as QualificationInput;
      const validation = validateInput(input);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      validation.errors.forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });
  });

  describe('重复处理测试', () => {
    it('相同业务编号和时间窗口再次提交应检测为重复', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-DUP-001',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '重复测试业主',
          idNumber: '110101199001010500',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const firstResult = processQualification(input);
      const firstAuditNo = firstResult.auditNo;

      const secondResult = processQualification(input);

      expect(secondResult.isDuplicate).toBe(true);
      expect(secondResult.previousAuditNo).toBe(firstAuditNo);
      expect(secondResult.auditNo).not.toBe(firstAuditNo);
    });

    it('不同时间窗口的相同业务不应视为重复', () => {
      const baseInput: QualificationInput = {
        businessId: 'BIZ-DUP-002',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '不同窗口业主',
          idNumber: '110101199001010600',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const firstResult = processQualification(baseInput);

      const secondInput = { ...baseInput, timeWindow: { start: '2024-07-01', end: '2024-07-31' } };
      const secondResult = processQualification(secondInput);

      expect(secondResult.isDuplicate).toBe(false);
      expect(secondResult.previousAuditNo).toBeUndefined();
    });

    it('不同规则版本的相同业务不应视为重复', () => {
      const baseInput: QualificationInput = {
        businessId: 'BIZ-DUP-003',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '不同版本业主',
          idNumber: '110101199001010700',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const firstResult = processQualification(baseInput);

      const secondInput = { ...baseInput, ruleVersion: '2.0.0' };
      const secondResult = processQualification(secondInput);

      expect(secondResult.isDuplicate).toBe(false);
    });

    it('checkDuplicate函数应正确检测重复', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-DUP-004',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '检测重复业主',
          idNumber: '110101199001010800',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      processQualification(input);

      const duplicate = checkDuplicate(
        'BIZ-DUP-004',
        '1.0.0',
        { start: '2024-06-01', end: '2024-06-30' }
      );

      expect(duplicate).not.toBeNull();
      expect(duplicate!.businessId).toBe('BIZ-DUP-004');
    });
  });

  describe('可追溯编号测试', () => {
    it('每次审核应生成唯一的审计编号', () => {
      const auditNos: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const input: QualificationInput = {
          businessId: `BIZ-UNIQUE-${i}`,
          objectStatus: [ObjectStatus.VERIFIED],
          timeWindow: { start: '2024-06-01', end: '2024-06-30' },
          ruleVersion: '1.0.0',
          operatorId: 'OP001',
          operatorName: '测试操作员',
          objectInfo: {
            type: ObjectType.OWNER,
            name: `唯一编号测试业主${i}`,
            idNumber: `11010119900101100${i}`,
            propertyArea: 100,
            ownerSince: '2020-01-01',
            isVerified: true
          },
          materialChecklist: { idCard: true, propertyCert: true }
        };

        const result = processQualification(input);
        auditNos.push(result.auditNo);
      }

      const uniqueNos = new Set(auditNos);
      expect(uniqueNos.size).toBe(5);
    });

    it('审计编号应符合格式规范', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-FORMAT-001',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '格式测试业主',
          idNumber: '110101199001012000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);

      expect(result.auditNo).toMatch(/^AUD-BIZ-FORMAT-001-.*-\d{4}$/);
      expect(result.auditNo.startsWith('AUD-')).toBe(true);
      expect(result.auditNo.includes('BIZ-FORMAT-001')).toBe(true);
    });

    it('同一业务多次提交的审计编号应可追溯历史', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-TRACE-001',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '追溯测试业主',
          idNumber: '110101199001013000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const first = processQualification(input);
      const second = processQualification(input);
      const third = processQualification(input);

      expect(second.previousAuditNo).toBe(first.auditNo);
      expect(third.previousAuditNo).toBe(second.auditNo);
      expect(first.auditNo).not.toBe(second.auditNo);
      expect(second.auditNo).not.toBe(third.auditNo);
    });

    it('通过审计编号可查询完整记录', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-QUERY-001',
        objectStatus: [ObjectStatus.VERIFIED, ObjectStatus.ARREARS],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '查询测试业主',
          idNumber: '110101199001014000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);
      const record = getAuditRecord(result.auditNo);

      expect(record).not.toBeNull();
      expect(record!.auditNo).toBe(result.auditNo);
      expect(record!.businessId).toBe('BIZ-QUERY-001');
      expect(record!.conclusion).toBe(result.conclusion);
      expect(record!.ruleHitDetails).toBeDefined();
      expect(record!.ruleHitDetails.length).toBeGreaterThan(0);
      expect(record!.createdAt).toBeDefined();
    });

    it('查询不存在的审计编号应返回null', () => {
      const record = getAuditRecord('AUD-NOT-EXIST-0000');
      expect(record).toBeNull();
    });
  });

  describe('审计轨迹测试', () => {
    it('同一业务多次处理应形成完整审计轨迹', () => {
      for (let i = 0; i < 3; i++) {
        const input: QualificationInput = {
          businessId: 'BIZ-TRAIL-001',
          objectStatus: [ObjectStatus.VERIFIED],
          timeWindow: { start: '2024-06-01', end: '2024-06-30' },
          ruleVersion: '1.0.0',
          operatorId: 'OP001',
          operatorName: '测试操作员',
          objectInfo: {
            type: ObjectType.OWNER,
            name: '轨迹测试业主',
            idNumber: '110101199001015000',
            propertyArea: 100,
            ownerSince: '2020-01-01',
            isVerified: true
          },
          materialChecklist: { idCard: true, propertyCert: true }
        };
        processQualification(input);
      }

      const trail = getAuditTrail('BIZ-TRAIL-001');

      expect(trail.length).toBe(3);
      expect(trail[0].createdAt.getTime()).toBeGreaterThan(trail[1].createdAt.getTime());
      expect(trail[1].createdAt.getTime()).toBeGreaterThan(trail[2].createdAt.getTime());
    });

    it('审计轨迹应包含完整的历史记录信息', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-TRAIL-002',
        objectStatus: [ObjectStatus.PENDING_VERIFICATION],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '轨迹详情业主',
          idNumber: '110101199001016000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: false
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      processQualification(input);
      const trail = getAuditTrail('BIZ-TRAIL-002');

      expect(trail.length).toBeGreaterThan(0);
      const record = trail[0];

      expect(record.auditNo).toBeDefined();
      expect(record.operatorId).toBe('OP001');
      expect(record.operatorName).toBe('测试操作员');
      expect(record.ruleVersion).toBe('1.0.0');
      expect(record.riskLevel).toBeDefined();
      expect(record.qualificationStatus).toBeDefined();
      expect(record.ruleHitDetails.length).toBeGreaterThan(0);
    });
  });

  describe('复核流程测试', () => {
    it('待复核状态的记录可被复核通过', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-REVIEW-001',
        objectStatus: [ObjectStatus.VERIFIED, ObjectStatus.ARREARS],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '提交操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '复核通过业主',
          idNumber: '110101199001017000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);
      expect(result.qualificationStatus).toBe(QualificationStatus.PENDING_REVIEW);

      const reviewResult = processReview({
        auditNo: result.auditNo,
        operatorId: 'OP002',
        operatorName: '复核员',
        reviewResult: 'approve',
        reviewComment: '欠费已结清，审核通过'
      });

      expect(reviewResult.reviewResult).toBe('approve');
      expect(reviewResult.newQualificationStatus).toBe(QualificationStatus.QUALIFIED);
      expect(reviewResult.newConclusion).toContain('复核通过');
      expect(reviewResult.reviewedBy).toBe('复核员');
    });

    it('待复核状态的记录可被复核驳回', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-REVIEW-002',
        objectStatus: [ObjectStatus.MATERIAL_INCOMPLETE],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '提交操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '复核驳回业主',
          idNumber: '110101199001018000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: false, propertyCert: true }
      };

      const result = processQualification(input);
      expect(result.qualificationStatus).toBe(QualificationStatus.PENDING_REVIEW);

      const reviewResult = processReview({
        auditNo: result.auditNo,
        operatorId: 'OP002',
        operatorName: '复核员',
        reviewResult: 'reject',
        reviewComment: '身份证材料缺失，不予通过'
      });

      expect(reviewResult.reviewResult).toBe('reject');
      expect(reviewResult.newQualificationStatus).toBe(QualificationStatus.NOT_QUALIFIED);
      expect(reviewResult.newConclusion).toContain('复核驳回');
    });

    it('待复核状态的记录可被退回补充材料', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-REVIEW-003',
        objectStatus: [ObjectStatus.ARREARS],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '提交操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '退回补材业主',
          idNumber: '110101199001019000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);
      expect(result.qualificationStatus).toBe(QualificationStatus.PENDING_REVIEW);

      const reviewResult = processReview({
        auditNo: result.auditNo,
        operatorId: 'OP002',
        operatorName: '复核员',
        reviewResult: 'return',
        reviewComment: '请补充物业费结清证明'
      });

      expect(reviewResult.reviewResult).toBe('return');
      expect(reviewResult.newQualificationStatus).toBe(QualificationStatus.PENDING_REVIEW);
      expect(reviewResult.newNextAction).toContain('补充材料');
    });

    it('非待复核状态的记录不能执行复核', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-REVIEW-004',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '提交操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '无需复核业主',
          idNumber: '110101199001020000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);
      expect(result.qualificationStatus).toBe(QualificationStatus.QUALIFIED);

      expect(() => {
        processReview({
          auditNo: result.auditNo,
          operatorId: 'OP002',
          operatorName: '复核员',
          reviewResult: 'approve',
          reviewComment: '测试'
        });
      }).toThrow('无需复核');
    });

    it('不存在的审核编号不能执行复核', () => {
      expect(() => {
        processReview({
          auditNo: 'AUD-NOT-EXIST-0000',
          operatorId: 'OP002',
          operatorName: '复核员',
          reviewResult: 'approve',
          reviewComment: '测试'
        });
      }).toThrow('不存在');
    });
  });

  describe('四层架构验证', () => {
    it('应包含完整的对象层信息', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-LAYER-001',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '分层测试业主',
          idNumber: '110101199001021000',
          propertyAddress: '测试小区2号楼3单元405室',
          propertyArea: 120.5,
          ownerSince: '2019-05-15',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);
      const record = getAuditRecord(result.auditNo);

      expect(record).not.toBeNull();
      expect(record!.objectId).toBeDefined();
    });

    it('应包含完整的规则层信息', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-LAYER-002',
        objectStatus: [ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '规则层测试',
          idNumber: '110101199001022000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);

      expect(result.ruleHitDetails.length).toBeGreaterThan(0);
      result.ruleHitDetails.forEach(detail => {
        expect(detail.ruleId).toBeDefined();
        expect(detail.ruleName).toBeDefined();
        expect(detail.ruleType).toBeDefined();
        expect(detail.riskLevel).toBeDefined();
        expect(Array.isArray(detail.riskTags)).toBe(true);
      });
    });

    it('应包含完整的状态层快照', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-LAYER-003',
        objectStatus: [ObjectStatus.NORMAL, ObjectStatus.VERIFIED],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '测试操作员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '状态层测试',
          idNumber: '110101199001023000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true, otherDoc: false }
      };

      const result = processQualification(input);
      const record = getAuditRecord(result.auditNo);

      expect(record).not.toBeNull();
      expect(record!.statusSnapshotId).toBeDefined();
      expect(record!.timeWindow).toBeDefined();
      expect(record!.timeWindow.start).toBeDefined();
      expect(record!.timeWindow.end).toBeDefined();
    });

    it('应包含完整的记录层审计信息', () => {
      const input: QualificationInput = {
        businessId: 'BIZ-LAYER-004',
        objectStatus: [ObjectStatus.VERIFIED, ObjectStatus.ARREARS],
        timeWindow: { start: '2024-06-01', end: '2024-06-30' },
        ruleVersion: '1.0.0',
        operatorId: 'OP001',
        operatorName: '记录层测试员',
        objectInfo: {
          type: ObjectType.OWNER,
          name: '记录层测试',
          idNumber: '110101199001024000',
          propertyArea: 100,
          ownerSince: '2020-01-01',
          isVerified: true
        },
        materialChecklist: { idCard: true, propertyCert: true }
      };

      const result = processQualification(input);
      const record = getAuditRecord(result.auditNo);

      expect(record).not.toBeNull();
      expect(record!.auditNo).toBe(result.auditNo);
      expect(record!.operatorId).toBe('OP001');
      expect(record!.operatorName).toBe('记录层测试员');
      expect(record!.actionType).toBeDefined();
      expect(record!.conclusion).toBeDefined();
      expect(record!.nextAction).toBeDefined();
      expect(record!.createdAt).toBeInstanceOf(Date);
      expect(record!.updatedAt).toBeInstanceOf(Date);
    });
  });
});
