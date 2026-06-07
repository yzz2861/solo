const grayRateLimitService = require('../src/services/grayRateLimitService');
const dataStore = require('../src/models/datastore');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     错误: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `期望 ${expected}，实际 ${actual}`);
  }
}

console.log('========================================');
console.log('API网关灰度限流API - 验收测试');
console.log('========================================\n');

console.log('--- 测试场景 1: 合规样例 (正常通过) ---');

test('正常请求 - 合规通过，返回 processable', () => {
  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-COMPLIANT-001',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  assertEqual(result.code, 200, '状态码应为200');
  assertEqual(result.data.resultType, 'processable', '结果类型应为 processable');
  assert(result.data.traceId, '应返回追踪编号');
  assert(result.data.requestId, '应返回请求编号');
  assert(result.data.businessNo === 'BIZ-COMPLIANT-001', '业务编号应一致');
  assert(typeof result.data.remainingQuota === 'number', '应返回剩余配额');
  assert(result.data.explanation.message, '应有解释消息');
  assert(result.data.explanation.ruleId, '应返回命中的规则ID');
});

test('边界测试 - 阈值临界值（第99次仍可通过）', () => {
  for (let i = 0; i < 99; i++) {
    grayRateLimitService.processRequest({
      businessNo: 'BIZ-BOUNDARY-001',
      objectStatus: 'active',
      ruleVersion: 'v1.0',
      operator: 'user001'
    });
  }

  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-BOUNDARY-001',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  assertEqual(result.code, 200, '第100次（从0开始）应为通过');
  assertEqual(result.data.resultType, 'processable', '应为可办理状态');
  assertEqual(result.data.remainingQuota, 0, '剩余配额应为0');
});

console.log('\n--- 测试场景 2: 超阈值样例 (限流触发) ---');

test('超阈值 - 第101次请求触发限流，返回失败解释', () => {
  for (let i = 0; i < 100; i++) {
    grayRateLimitService.processRequest({
      businessNo: 'BIZ-OVER-LIMIT-001',
      objectStatus: 'active',
      ruleVersion: 'v1.0',
      operator: 'user001'
    });
  }

  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-OVER-LIMIT-001',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  assertEqual(result.code, 429, '状态码应为429');
  assertEqual(result.data.resultType, 'failed', '结果类型应为 failed');
  assertEqual(result.data.explanation.reason, 'rule_hit_threshold', '失败原因应为触发阈值');
  assert(result.data.explanation.message, '应有失败消息');
  assert(result.data.explanation.detail, '应有详细解释');
  assert(result.data.explanation.threshold, '应返回阈值');
  assert(result.data.explanation.currentCount, '应返回当前计数');
  assert(result.data.explanation.windowStart, '应返回窗口开始时间');
  assert(result.data.explanation.windowEnd, '应返回窗口结束时间');
});

test('超阈值样例 - 失败提示包含具体规则信息', () => {
  for (let i = 0; i < 100; i++) {
    grayRateLimitService.processRequest({
      businessNo: 'BIZ-OVER-LIMIT-002',
      objectStatus: 'active',
      ruleVersion: 'v1.0',
      operator: 'user001'
    });
  }

  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-OVER-LIMIT-002',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  assert(result.data.explanation.ruleId, '应包含规则ID');
  assert(result.data.explanation.ruleName, '应包含规则名称');
  assert(result.data.explanation.ruleVersion, '应包含规则版本');
  assert(result.data.explanation.currentCount >= result.data.explanation.threshold,
    '当前计数应达到或超过阈值');
});

console.log('\n--- 测试场景 3: 材料缺失样例 (需补充) ---');

test('材料缺失 - v2.0规则需要材料审核，缺少材料返回 needs_supplement', () => {
  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-MISSING-MAT-001',
    objectStatus: 'active',
    ruleVersion: 'v2.0',
    operator: 'user001',
    providedMaterials: {}
  });

  assertEqual(result.code, 202, '状态码应为202');
  assertEqual(result.data.resultType, 'needs_supplement', '结果类型应为 needs_supplement');
  assertEqual(result.data.explanation.reason, 'missing_materials', '原因应为缺少材料');
  assert(result.data.explanation.missingFields, '应列出缺失字段');
  assert(result.data.explanation.missingFields.length > 0, '缺失字段列表不应为空');
  assert(result.data.requiredActions, '应返回所需操作');
  assert(result.data.requiredActions.some(a => a.type === 'SUPPLY_MATERIALS'),
    '应包含补充材料的操作提示');
});

test('材料部分缺失 - 只返回缺失的字段', () => {
  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-PARTIAL-MAT-001',
    objectStatus: 'active',
    ruleVersion: 'v2.0',
    operator: 'user001',
    providedMaterials: {
      businessLicense: 'lic-123',
      idCard: 'id-456'
    }
  });

  assertEqual(result.data.resultType, 'needs_supplement', '应为需补充状态');
  assert(result.data.explanation.missingFields.includes('contract'),
    '应包含缺失的contract字段');
  assert(!result.data.explanation.missingFields.includes('businessLicense'),
    '不应包含已提供的businessLicense');
  assert(!result.data.explanation.missingFields.includes('idCard'),
    '不应包含已提供的idCard');
});

test('材料齐全但需人工复核 - 返回 needs_supplement + 待审核', () => {
  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-FULL-MAT-001',
    objectStatus: 'active',
    ruleVersion: 'v2.0',
    operator: 'user001',
    providedMaterials: {
      businessLicense: 'lic-123',
      idCard: 'id-456',
      contract: 'con-789'
    }
  });

  assertEqual(result.data.resultType, 'needs_supplement', '应为需补充状态');
  assertEqual(result.data.explanation.reason, 'manual_review_required',
    '原因应为需要人工复核');
  assert(result.data.reviewInfo, '应包含审核信息');
  assert(result.data.requiredActions, '应返回所需操作');
  assert(result.data.requiredActions.some(a => a.type === 'WAIT_FOR_REVIEW'),
    '应包含等待审核的操作提示');
});

console.log('\n--- 测试场景 4: 历史回放样例 ---');

test('历史回放 - 使用回放规则正常通过', () => {
  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-PLAYBACK-001',
    objectStatus: 'active',
    ruleVersion: 'v1.5',
    operator: 'admin_user',
    isHistoryPlayback: true,
    requestTime: '2026-01-15T10:00:00.000Z'
  });

  assertEqual(result.code, 200, '状态码应为200');
  assertEqual(result.data.resultType, 'processable', '应为可办理状态');
});

test('历史回放 - 非回放规则版本不允许回放', () => {
  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-PLAYBACK-002',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'admin_user',
    isHistoryPlayback: true
  });

  assertEqual(result.data.resultType, 'failed', '应为失败状态');
  assertEqual(result.data.explanation.reason, 'history_playback_not_allowed',
    '原因应为不允许历史回放');
});

test('历史回放 - 指定时间窗口计算正确', () => {
  const requestTime = '2026-03-20T14:30:00.000Z';
  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-PLAYBACK-003',
    objectStatus: 'frozen',
    ruleVersion: 'v1.5',
    operator: 'admin_user',
    isHistoryPlayback: true,
    requestTime
  });

  assertEqual(result.data.resultType, 'processable', '应为可办理状态');
  assert(result.data.explanation.windowStart, '应返回窗口开始时间');
  assert(result.data.explanation.windowEnd, '应返回窗口结束时间');
});

console.log('\n--- 测试场景 5: 重复提交处理 ---');

test('重复提交 - 相同幂等键返回重复提交错误', () => {
  const idempotencyKey = 'IDEMP-KEY-001-' + Date.now();

  const firstResult = grayRateLimitService.processRequest({
    businessNo: 'BIZ-DUPLICATE-001',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001',
    idempotencyKey
  });

  assertEqual(firstResult.code, 200, '第一次请求应成功');

  const secondResult = grayRateLimitService.processRequest({
    businessNo: 'BIZ-DUPLICATE-001',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001',
    idempotencyKey
  });

  assertEqual(secondResult.code, 409, '重复请求应返回409');
  assertEqual(secondResult.data.resultType, 'failed', '结果类型应为 failed');
  assertEqual(secondResult.data.explanation.reason, 'duplicate_submission',
    '失败原因应为重复提交');
  assert(secondResult.data.explanation.originalRequestId,
    '应返回原始请求ID');
  assert(secondResult.data.explanation.originalRequestTime,
    '应返回原始请求时间');
});

test('重复提交 - 不同业务编号同幂等键不视为重复', () => {
  const idempotencyKey = 'IDEMP-KEY-CROSS-001';

  const result1 = grayRateLimitService.processRequest({
    businessNo: 'BIZ-DUPLICATE-A',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001',
    idempotencyKey
  });

  const result2 = grayRateLimitService.processRequest({
    businessNo: 'BIZ-DUPLICATE-B',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001',
    idempotencyKey
  });

  assertEqual(result1.code, 200, '业务A请求应成功');
  assertEqual(result2.code, 200, '业务B请求应成功（不同业务编号）');
});

console.log('\n--- 测试场景 6: 边界条件测试 ---');

test('边界条件 - 缺少必填参数返回参数错误', () => {
  const result = grayRateLimitService.processRequest({
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  assertEqual(result.code, 400, '状态码应为400');
  assertEqual(result.data.resultType, 'failed', '结果类型应为 failed');
  assertEqual(result.data.explanation.reason, 'invalid_params',
    '原因应为无效参数');
  assert(result.data.explanation.detail, '应列出缺失的字段');
});

test('边界条件 - 对象状态不符合规则要求', () => {
  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-STATUS-001',
    objectStatus: 'cancelled',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  assertEqual(result.data.resultType, 'failed', '结果类型应为 failed');
  assertEqual(result.data.explanation.reason, 'invalid_object_status',
    '原因应为无效对象状态');
});

test('边界条件 - 规则版本不存在', () => {
  const result = grayRateLimitService.processRequest({
    businessNo: 'BIZ-RULE-VER-001',
    objectStatus: 'active',
    ruleVersion: 'v99.99',
    operator: 'user001'
  });

  assertEqual(result.data.resultType, 'failed', '结果类型应为 failed');
  assertEqual(result.data.explanation.reason, 'rule_not_found',
    '原因应为规则不存在');
});

test('边界条件 - 空字符串参数处理', () => {
  const result = grayRateLimitService.processRequest({
    businessNo: '',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  assertEqual(result.code, 400, '空业务编号应返回400');
});

console.log('\n--- 测试场景 7: 可追溯编号 (traceId) 验证 ---');

test('可追溯 - 每次请求返回唯一 traceId', () => {
  const result1 = grayRateLimitService.processRequest({
    businessNo: 'BIZ-TRACE-001',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  const result2 = grayRateLimitService.processRequest({
    businessNo: 'BIZ-TRACE-001',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  assert(result1.data.traceId !== result2.data.traceId,
    '两次请求的 traceId 应不同');
  assert(result1.data.traceId.startsWith('TRACE-'),
    'traceId 应以 TRACE- 开头');
});

test('可追溯 - 通过 traceId 查询完整留痕', () => {
  const checkResult = grayRateLimitService.processRequest({
    businessNo: 'BIZ-TRACE-QUERY-001',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user_trace_001'
  });

  const traceId = checkResult.data.traceId;
  const traceResult = grayRateLimitService.getTrace(traceId);

  assertEqual(traceResult.code, 200, '查询状态码应为200');
  assert(traceResult.data.found === true, '应找到记录');
  assert(traceResult.data.records.length > 0, '应至少有一条记录');
  assert(traceResult.data.records[0].businessNo === 'BIZ-TRACE-QUERY-001',
    '记录业务编号应匹配');
  assert(traceResult.data.records[0].operator === 'user_trace_001',
    '记录操作人应匹配');
});

test('可追溯 - 审计日志查询', () => {
  const businessNo = 'BIZ-AUDIT-001';
  for (let i = 0; i < 5; i++) {
    grayRateLimitService.processRequest({
      businessNo,
      objectStatus: 'active',
      ruleVersion: 'v1.0',
      operator: 'user_audit'
    });
  }

  const auditResult = grayRateLimitService.getAuditLogs(businessNo, 10);
  assert(auditResult.data.total >= 5, '应至少有5条日志');
  assert(auditResult.data.logs[0].action, '日志应有操作类型');
  assert(auditResult.data.logs[0].status, '日志应有状态');
  assert(auditResult.data.logs[0].timestamp, '日志应有时间戳');
});

test('可追溯 - 不存在的 traceId 返回 404', () => {
  const traceResult = grayRateLimitService.getTrace('TRACE-NONEXISTENT-XXXX');
  assertEqual(traceResult.code, 404, '应返回404');
  assert(traceResult.data.found === false, 'found 应为 false');
});

console.log('\n--- 测试场景 8: 锁定状态处理 ---');

test('已锁定 - 锁定后请求返回 locked 状态', () => {
  const businessNo = 'BIZ-LOCKED-001';

  grayRateLimitService.lockBusiness({
    businessNo,
    reason: '风险管控',
    operator: 'admin'
  });

  const result = grayRateLimitService.processRequest({
    businessNo,
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });

  assertEqual(result.code, 423, '状态码应为423');
  assertEqual(result.data.resultType, 'locked', '结果类型应为 locked');
  assertEqual(result.data.explanation.reason, 'business_locked',
    '原因应为业务已锁定');
  assert(result.data.explanation.lockTime, '应返回锁定时间');
  assert(result.data.explanation.lockedBy, '应返回锁定人');
  assert(result.data.explanation.detail === '风险管控',
    '应返回锁定原因');
});

test('解锁 - 解锁后恢复正常', () => {
  const businessNo = 'BIZ-UNLOCK-001';

  grayRateLimitService.lockBusiness({
    businessNo,
    reason: '临时锁定',
    operator: 'admin'
  });

  let result = grayRateLimitService.processRequest({
    businessNo,
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });
  assertEqual(result.data.resultType, 'locked', '锁定中应为 locked');

  grayRateLimitService.unlockBusiness({
    businessNo,
    reason: '核查通过',
    operator: 'admin'
  });

  result = grayRateLimitService.processRequest({
    businessNo,
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });
  assertEqual(result.data.resultType, 'processable', '解锁后应为 processable');
});

console.log('\n--- 测试场景 9: 人工复核流程 ---');

test('人工复核 - 审核通过后可正常办理', () => {
  const businessNo = 'BIZ-REVIEW-PASS-001';

  const checkResult = grayRateLimitService.processRequest({
    businessNo,
    objectStatus: 'active',
    ruleVersion: 'v2.0',
    operator: 'user001',
    providedMaterials: {
      businessLicense: 'lic-001',
      idCard: 'id-001',
      contract: 'con-001'
    }
  });

  assertEqual(checkResult.data.resultType, 'needs_supplement',
    '初始应为待审核状态');
  assertEqual(checkResult.data.explanation.reason, 'manual_review_required',
    '原因应为需要人工复核');

  const reviewResult = grayRateLimitService.reviewDecision({
    businessNo,
    decision: 'APPROVED',
    reviewComment: '材料齐全，审核通过',
    operator: 'reviewer001',
    ruleVersion: 'v2.0'
  });

  assertEqual(reviewResult.code, 200, '审核操作应成功');
  assertEqual(reviewResult.data.reviewResult, 'APPROVED', '审核结果应为通过');
});

test('人工复核 - 审核拒绝', () => {
  const businessNo = 'BIZ-REVIEW-REJECT-001';

  grayRateLimitService.processRequest({
    businessNo,
    objectStatus: 'active',
    ruleVersion: 'v2.0',
    operator: 'user001',
    providedMaterials: {
      businessLicense: 'lic-002',
      idCard: 'id-002',
      contract: 'con-002'
    }
  });

  const reviewResult = grayRateLimitService.reviewDecision({
    businessNo,
    decision: 'REJECTED',
    reviewComment: '合同无效，审核拒绝',
    operator: 'reviewer002',
    ruleVersion: 'v2.0'
  });

  assertEqual(reviewResult.data.reviewResult, 'REJECTED', '审核结果应为拒绝');
  assert(reviewResult.data.reviewComment, '应有审核意见');
  assert(reviewResult.data.reviewedBy === 'reviewer002', '应记录审核人');
});

console.log('\n--- 测试场景 10: 失败提示与原因细分 ---');

test('失败原因细分 - 规则命中 vs 重复提交 vs 状态无效 各不相同', () => {
  const reasons = new Set();

  for (let i = 0; i < 100; i++) {
    grayRateLimitService.processRequest({
      businessNo: 'BIZ-REASON-A',
      objectStatus: 'active',
      ruleVersion: 'v1.0',
      operator: 'user001'
    });
  }
  const r1 = grayRateLimitService.processRequest({
    businessNo: 'BIZ-REASON-A',
    objectStatus: 'active',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });
  reasons.add(r1.data.explanation.reason);

  const r2 = grayRateLimitService.processRequest({
    businessNo: 'BIZ-REASON-B',
    objectStatus: 'expired',
    ruleVersion: 'v1.0',
    operator: 'user001'
  });
  reasons.add(r2.data.explanation.reason);

  const r3 = grayRateLimitService.processRequest({
    businessNo: 'BIZ-REASON-C',
    objectStatus: 'active',
    ruleVersion: 'v0.0',
    operator: 'user001'
  });
  reasons.add(r3.data.explanation.reason);

  assert(reasons.size >= 3, `至少应有3种不同的失败原因，实际有 ${reasons.size} 种: ${[...reasons].join(', ')}`);
  assert(reasons.has('rule_hit_threshold'), '应包含规则命中原因');
  assert(reasons.has('invalid_object_status'), '应包含状态无效原因');
  assert(reasons.has('rule_not_found'), '应包含规则不存在原因');
});

console.log('\n========================================');
console.log(`测试结果: 通过 ${passed} 项，失败 ${failed} 项`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
