const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateBatchNumber,
  validateSourceChannel,
  validateProcessAction,
  validateReviewOpinion,
  validateItems,
  validateRequest
} = require('../src/validators/validator');
const {
  generateAuditId,
  checkDuplicateSubmission,
  recordSubmission,
  clearAllRecords
} = require('../src/services/auditService');
const { calculateItemRisk, calculateBatchRisk } = require('../src/services/riskService');
const { evaluateRules, determineFinalAction, routeByProcessAction } = require('../src/services/ruleEngine');
const RectificationService = require('../src/services/rectificationService');
const {
  SOURCE_CHANNELS,
  PROCESS_ACTIONS,
  RISK_LEVELS,
  BUSINESS_CONCLUSIONS,
  NEXT_ACTIONS
} = require('../src/utils/constants');

test.describe('数据校验层测试', () => {
  test.describe('批次号校验', () => {
    test('正常批次号应该通过校验', () => {
      const errors = validateBatchNumber('WF2025001');
      assert.equal(errors.length, 0);
    });

    test('空批次号应该报错', () => {
      const errors = validateBatchNumber('');
      assert.equal(errors.length, 1);
      assert.equal(errors[0].errorCode, 'BATCH_NUMBER_EMPTY');
    });

    test('null批次号应该报错', () => {
      const errors = validateBatchNumber(null);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].errorCode, 'BATCH_NUMBER_EMPTY');
    });

    test('格式错误的批次号应该报错', () => {
      const errors = validateBatchNumber('12345678');
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.errorCode === 'BATCH_NUMBER_FORMAT_ERROR'));
    });

    test('长度不足的批次号应该报错', () => {
      const errors = validateBatchNumber('WF202');
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.errorCode === 'BATCH_NUMBER_TOO_SHORT'));
    });

    test('过长的批次号应该报错', () => {
      const longBatch = 'WF2025' + 'A'.repeat(20);
      const errors = validateBatchNumber(longBatch);
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.errorCode === 'BATCH_NUMBER_TOO_LONG'));
    });

    test('小写字母的批次号应该报错', () => {
      const errors = validateBatchNumber('wf2025001');
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.errorCode === 'BATCH_NUMBER_FORMAT_ERROR'));
    });
  });

  test.describe('来源渠道校验', () => {
    test('有效来源渠道应该通过', () => {
      const errors = validateSourceChannel(SOURCE_CHANNELS.PROPERTY_INSPECTION);
      assert.equal(errors.length, 0);
    });

    test('空来源渠道应该报错', () => {
      const errors = validateSourceChannel('');
      assert.equal(errors.length, 1);
      assert.equal(errors[0].errorCode, 'SOURCE_CHANNEL_EMPTY');
    });

    test('无效来源渠道应该报错', () => {
      const errors = validateSourceChannel('INVALID_CHANNEL');
      assert.equal(errors.length, 1);
      assert.equal(errors[0].errorCode, 'SOURCE_CHANNEL_INVALID');
    });
  });

  test.describe('处理动作校验', () => {
    test('有效处理动作应该通过', () => {
      const errors = validateProcessAction(PROCESS_ACTIONS.SUBMIT);
      assert.equal(errors.length, 0);
    });

    test('空处理动作应该报错', () => {
      const errors = validateProcessAction(null);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].errorCode, 'PROCESS_ACTION_EMPTY');
    });

    test('无效处理动作应该报错', () => {
      const errors = validateProcessAction('INVALID_ACTION');
      assert.equal(errors.length, 1);
      assert.equal(errors[0].errorCode, 'PROCESS_ACTION_INVALID');
    });
  });

  test.describe('复核意见校验', () => {
    test('REVIEW动作必须提供复核意见', () => {
      const errors = validateReviewOpinion('', PROCESS_ACTIONS.REVIEW);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].errorCode, 'REVIEW_OPINION_REQUIRED');
    });

    test('非REVIEW动作可以没有复核意见', () => {
      const errors = validateReviewOpinion('', PROCESS_ACTIONS.SUBMIT);
      assert.equal(errors.length, 0);
    });

    test('过长的复核意见应该报错', () => {
      const longOpinion = '测'.repeat(600);
      const errors = validateReviewOpinion(longOpinion, PROCESS_ACTIONS.REVIEW);
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.errorCode === 'REVIEW_OPINION_TOO_LONG'));
    });
  });

  test.describe('明细项校验', () => {
    test('空明细项应该报错', () => {
      const errors = validateItems(null);
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.errorCode === 'ITEMS_EMPTY'));
    });

    test('非数组明细项应该报错', () => {
      const errors = validateItems('not_an_array');
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.errorCode === 'ITEMS_TYPE_ERROR'));
    });

    test('空数组明细项应该报错', () => {
      const errors = validateItems([]);
      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.errorCode === 'ITEMS_TOO_FEW'));
    });

    test('有效明细项应该通过', () => {
      const items = [{
        itemId: 'ITEM001',
        category: 'STRUCTURE',
        description: '墙面有裂缝需要修复',
        location: '1号楼3单元501室客厅',
        severity: 'MAJOR'
      }];
      const errors = validateItems(items);
      assert.equal(errors.length, 0);
    });

    test('缺少项目ID应该报错', () => {
      const items = [{
        category: 'STRUCTURE',
        description: '墙面有裂缝需要修复',
        location: '1号楼3单元501室'
      }];
      const errors = validateItems(items);
      assert.ok(errors.some(e => e.errorCode === 'ITEM_ID_EMPTY'));
    });

    test('缺少整改类别应该报错', () => {
      const items = [{
        itemId: 'ITEM001',
        description: '墙面有裂缝需要修复',
        location: '1号楼3单元501室'
      }];
      const errors = validateItems(items);
      assert.ok(errors.some(e => e.errorCode === 'ITEM_CATEGORY_EMPTY'));
    });

    test('无效整改类别应该报错', () => {
      const items = [{
        itemId: 'ITEM001',
        category: 'INVALID_CATEGORY',
        description: '问题描述',
        location: '位置'
      }];
      const errors = validateItems(items);
      assert.ok(errors.some(e => e.errorCode === 'ITEM_CATEGORY_INVALID'));
    });

    test('缺少问题描述应该报错', () => {
      const items = [{
        itemId: 'ITEM001',
        category: 'STRUCTURE',
        location: '位置'
      }];
      const errors = validateItems(items);
      assert.ok(errors.some(e => e.errorCode === 'ITEM_DESCRIPTION_EMPTY'));
    });

    test('问题描述过短应该报错', () => {
      const items = [{
        itemId: 'ITEM001',
        category: 'STRUCTURE',
        description: '短',
        location: '位置'
      }];
      const errors = validateItems(items);
      assert.ok(errors.some(e => e.errorCode === 'ITEM_DESCRIPTION_TOO_SHORT'));
    });

    test('缺少位置信息应该报错', () => {
      const items = [{
        itemId: 'ITEM001',
        category: 'STRUCTURE',
        description: '问题描述足够长'
      }];
      const errors = validateItems(items);
      assert.ok(errors.some(e => e.errorCode === 'ITEM_LOCATION_EMPTY'));
    });

    test('重复的项目ID应该报错', () => {
      const items = [
        {
          itemId: 'ITEM001',
          category: 'STRUCTURE',
          description: '第一个问题描述',
          location: '位置1'
        },
        {
          itemId: 'ITEM001',
          category: 'ELECTRICAL',
          description: '第二个问题描述',
          location: '位置2'
        }
      ];
      const errors = validateItems(items);
      assert.ok(errors.some(e => e.errorCode === 'ITEM_ID_DUPLICATE'));
    });

    test('无效严重程度应该报错', () => {
      const items = [{
        itemId: 'ITEM001',
        category: 'STRUCTURE',
        description: '问题描述足够长',
        location: '位置',
        severity: 'INVALID_SEVERITY'
      }];
      const errors = validateItems(items);
      assert.ok(errors.some(e => e.errorCode === 'ITEM_SEVERITY_INVALID'));
    });
  });
});

test.describe('风险评估测试', () => {
  test('结构类项目应为高风险', () => {
    const item = {
      itemId: 'ITEM001',
      category: 'STRUCTURE',
      severity: 'MAJOR'
    };
    const result = calculateItemRisk(item);
    assert.equal(result.riskLevel, RISK_LEVELS.HIGH);
    assert.ok(result.riskTags.includes('STRUCTURAL_SAFETY'));
  });

  test('电气类项目应为高风险', () => {
    const item = {
      itemId: 'ITEM002',
      category: 'ELECTRICAL',
      severity: 'MAJOR'
    };
    const result = calculateItemRisk(item);
    assert.equal(result.riskLevel, RISK_LEVELS.HIGH);
    assert.ok(result.riskTags.includes('ELECTRICAL_HAZARD'));
  });

  test('墙面类项目应为低风险', () => {
    const item = {
      itemId: 'ITEM003',
      category: 'WALLS',
      severity: 'MINOR'
    };
    const result = calculateItemRisk(item);
    assert.equal(result.riskLevel, RISK_LEVELS.LOW);
  });

  test('严重程度为CRITICAL会提升风险等级', () => {
    const item = {
      itemId: 'ITEM004',
      category: 'DOORS_WINDOWS',
      severity: 'CRITICAL'
    };
    const result = calculateItemRisk(item);
    assert.equal(result.riskLevel, RISK_LEVELS.HIGH);
  });

  test('批量风险评估 - 高风险比例高则整体高风险', () => {
    const items = [
      { itemId: '1', category: 'STRUCTURE', severity: 'MAJOR' },
      { itemId: '2', category: 'ELECTRICAL', severity: 'MAJOR' },
      { itemId: '3', category: 'WALLS', severity: 'MINOR' }
    ];
    const result = calculateBatchRisk(items);
    assert.ok([RISK_LEVELS.HIGH, RISK_LEVELS.MEDIUM].includes(result.overallRiskLevel));
    assert.ok(result.allRiskTags.length > 0);
  });
});

test.describe('审计服务测试', () => {
  test.beforeEach(() => {
    clearAllRecords();
  });

  test('生成审计编号格式正确', () => {
    const auditId = generateAuditId('RECT');
    assert.ok(auditId.startsWith('RECT-'));
    assert.ok(auditId.length > 10);
  });

  test('首次提交不应该是重复提交', () => {
    const items = [{ itemId: 'ITEM001' }, { itemId: 'ITEM002' }];
    const result = checkDuplicateSubmission('WF2025001', items);
    assert.equal(result.isDuplicate, false);
  });

  test('重复提交应该被检测到', () => {
    const items = [{ itemId: 'ITEM001' }, { itemId: 'ITEM002' }];
    recordSubmission('WF2025001', items, 'AUDIT-001', 'SUCCESS');

    const result = checkDuplicateSubmission('WF2025001', items);
    assert.equal(result.isDuplicate, true);
    assert.equal(result.duplicateInfo.originalAuditId, 'AUDIT-001');
  });
});

test.describe('规则引擎测试', () => {
  test('高风险项目触发规则001', () => {
    const context = {
      payload: { sourceChannel: SOURCE_CHANNELS.PROPERTY_INSPECTION },
      riskResult: { overallRiskLevel: RISK_LEVELS.HIGH }
    };
    const hitRules = evaluateRules(context);
    assert.ok(hitRules.some(r => r.ruleId === 'RULE_001'));
  });

  test('政府来源触发规则002', () => {
    const context = {
      payload: { sourceChannel: SOURCE_CHANNELS.GOVERNMENT },
      riskResult: { overallRiskLevel: RISK_LEVELS.LOW }
    };
    const hitRules = evaluateRules(context);
    assert.ok(hitRules.some(r => r.ruleId === 'RULE_002'));
  });

  test('业主举报触发规则008', () => {
    const context = {
      payload: { sourceChannel: SOURCE_CHANNELS.OWNER_REPORT },
      riskResult: { overallRiskLevel: RISK_LEVELS.LOW }
    };
    const hitRules = evaluateRules(context);
    assert.ok(hitRules.some(r => r.ruleId === 'RULE_008'));
  });

  test('状态流转 - SUBMIT从NEW状态有效', () => {
    const result = routeByProcessAction(PROCESS_ACTIONS.SUBMIT, 'NEW');
    assert.equal(result.isValid, true);
    assert.equal(result.targetStatus, 'SUBMITTED');
  });

  test('状态流转 - CLOSE不能从REJECTED状态执行', () => {
    const result = routeByProcessAction(PROCESS_ACTIONS.CLOSE, 'REJECTED');
    assert.equal(result.isValid, false);
    assert.equal(result.errorCode, 'STATUS_TRANSITION_INVALID');
  });
});

test.describe('整改服务集成测试', () => {
  let service;

  test.beforeEach(() => {
    clearAllRecords();
    service = new RectificationService({
      acceptancePrepTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      validBatchPrefixes: ['WF', 'WY', 'XM', 'GC'],
      rectificationDeadlineDays: 30,
      reviewDepartments: ['工程部', '品质部', '客服部'],
      strictMode: false
    });
  });

  test('正常提交 - 低风险自动处理', () => {
    const payload = {
      batchNumber: 'WF2025001',
      sourceChannel: SOURCE_CHANNELS.THIRD_PARTY,
      processAction: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM001',
          category: 'WALLS',
          description: '墙面有轻微划痕需要修复处理',
          location: '1号楼3单元501室客厅东墙',
          severity: 'MINOR'
        }
      ]
    };

    const result = service.processRectification(payload);
    assert.ok(result.auditId);
    assert.equal(result.businessConclusion, BUSINESS_CONCLUSIONS.SUCCESS);
    assert.equal(result.nextAction, NEXT_ACTIONS.AUTO_PROCESS);
    assert.ok(Array.isArray(result.riskTags));
  });

  test('高风险项目需要人工复核', () => {
    const payload = {
      batchNumber: 'WF2025002',
      sourceChannel: SOURCE_CHANNELS.THIRD_PARTY,
      processAction: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM001',
          category: 'STRUCTURE',
          description: '承重墙有明显裂缝需要专业检测',
          location: '1号楼3单元501室客厅北墙',
          severity: 'CRITICAL'
        }
      ]
    };

    const result = service.processRectification(payload);
    assert.equal(result.isManualReviewRequired, true);
    assert.equal(result.businessConclusion, BUSINESS_CONCLUSIONS.MANUAL_REVIEW_REQUIRED);
    assert.equal(result.nextAction, NEXT_ACTIONS.MANUAL_REVIEW);
    assert.ok(result.riskTags.includes('STRUCTURAL_SAFETY'));
  });

  test('政府来源必须人工复核', () => {
    const payload = {
      batchNumber: 'WF2025003',
      sourceChannel: SOURCE_CHANNELS.GOVERNMENT,
      processAction: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM001',
          category: 'WALLS',
          description: '墙面有轻微划痕需要处理',
          location: '1号楼1单元101室',
          severity: 'MINOR'
        }
      ]
    };

    const result = service.processRectification(payload);
    assert.equal(result.isManualReviewRequired, true);
    assert.equal(result.businessConclusion, BUSINESS_CONCLUSIONS.MANUAL_REVIEW_REQUIRED);
  });

  test('重复提交应该单独处理并给出明确原因', () => {
    const payload = {
      batchNumber: 'WF2025004',
      sourceChannel: SOURCE_CHANNELS.THIRD_PARTY,
      processAction: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM001',
          category: 'WALLS',
          description: '墙面有轻微划痕需要处理',
          location: '位置信息',
          severity: 'MINOR'
        }
      ]
    };

    const firstResult = service.processRectification(payload);
    assert.equal(firstResult.success, true);

    const secondResult = service.processRectification(payload);
    assert.equal(secondResult.success, false);
    assert.equal(secondResult.businessConclusion, BUSINESS_CONCLUSIONS.DUPLICATE_SUBMISSION);
    assert.equal(secondResult.nextAction, NEXT_ACTIONS.REJECT_AND_NOTIFY);
    assert.ok(secondResult.duplicateInfo);
    assert.equal(secondResult.errors[0].errorCode, 'DUPLICATE_SUBMISSION');
    assert.equal(secondResult.errors[0].message, '该批次存在重复提交记录');
  });

  test('批次号错误应该给出明确错误', () => {
    const payload = {
      batchNumber: 'XX9999001',
      sourceChannel: SOURCE_CHANNELS.THIRD_PARTY,
      processAction: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM001',
          category: 'WALLS',
          description: '墙面有轻微划痕需要处理',
          location: '位置信息',
          severity: 'MINOR'
        }
      ]
    };

    const result = service.processRectification(payload);
    assert.equal(result.success, false);
    assert.equal(result.businessConclusion, BUSINESS_CONCLUSIONS.BATCH_NUMBER_ERROR);
    assert.equal(result.nextAction, NEXT_ACTIONS.VERIFY_BATCH);
  });

  test('数据校验失败不能用笼统失败替代', () => {
    const payload = {
      batchNumber: '',
      sourceChannel: '',
      processAction: '',
      items: []
    };

    const result = service.processRectification(payload);
    assert.equal(result.success, false);
    assert.equal(result.businessConclusion, BUSINESS_CONCLUSIONS.VALIDATION_FAILED);
    assert.equal(result.nextAction, NEXT_ACTIONS.CORRECT_AND_RESUBMIT);
    assert.ok(result.errors.length > 1);
    assert.ok(result.errors.some(e => e.errorCode === 'BATCH_NUMBER_EMPTY'));
    assert.ok(result.errors.some(e => e.errorCode === 'SOURCE_CHANNEL_EMPTY'));
    assert.ok(result.errors.some(e => e.errorCode === 'PROCESS_ACTION_EMPTY'));
    assert.ok(result.errors.some(e => e.errorCode === 'ITEMS_TOO_FEW'));
    assert.equal(result.errorCount, result.errors.length);
  });

  test('配置缺失应该有明确提示', () => {
    const serviceWithMissingConfig = new RectificationService({
      missingConfigs: [
        { key: 'reviewDepartments', name: '复核部门配置' }
      ]
    });

    const payload = {
      batchNumber: 'WF2025005',
      sourceChannel: SOURCE_CHANNELS.THIRD_PARTY,
      processAction: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM001',
          category: 'WALLS',
          description: '墙面有轻微划痕需要处理',
          location: '位置信息',
          severity: 'MINOR'
        }
      ]
    };

    const result = serviceWithMissingConfig.processRectification(payload);
    assert.equal(result.businessConclusion, BUSINESS_CONCLUSIONS.CONFIG_MISSING);
    assert.equal(result.nextAction, NEXT_ACTIONS.CHECK_CONFIGURATION);
    assert.ok(result.errors.some(e => e.errorCode === 'CONFIG_MISSING'));
  });

  test('规则命中应该返回命中的规则信息', () => {
    const payload = {
      batchNumber: 'WF2025006',
      sourceChannel: SOURCE_CHANNELS.GOVERNMENT,
      processAction: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM001',
          category: 'STRUCTURE',
          description: '结构有问题需要检查',
          location: '位置信息',
          severity: 'MAJOR'
        }
      ]
    };

    const result = service.processRectification(payload);
    assert.ok(result.hitRules.length > 0);
    assert.ok(result.primaryRuleHit);
    assert.equal(result.isRuleHit, true);
  });

  test('每个响应都应该包含可追溯的审计编号', () => {
    const payload = {
      batchNumber: 'WF2025007',
      sourceChannel: SOURCE_CHANNELS.PROPERTY_INSPECTION,
      processAction: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM001',
          category: 'WALLS',
          description: '墙面有轻微划痕需要处理',
          location: '位置信息',
          severity: 'MINOR'
        }
      ]
    };

    const result = service.processRectification(payload);
    assert.ok(result.auditId);
    assert.ok(result.auditId.startsWith('RECT-'));
    assert.ok(result.timestamp);
  });

  test('物业验收场景缺少必查类别应该报错', () => {
    const payload = {
      batchNumber: 'WF2025008',
      sourceChannel: SOURCE_CHANNELS.PROPERTY_INSPECTION,
      processAction: PROCESS_ACTIONS.SUBMIT,
      items: [
        {
          itemId: 'ITEM001',
          category: 'WALLS',
          description: '墙面有轻微划痕需要处理',
          location: '位置信息',
          severity: 'MINOR'
        }
      ]
    };

    const result = service.processRectification(payload);
    assert.equal(result.success, false);
    assert.equal(result.businessConclusion, BUSINESS_CONCLUSIONS.VALIDATION_FAILED);
    assert.ok(result.errors.some(e => e.errorCode === 'ACCEPTANCE_DATA_INCOMPLETE'));
  });
});
