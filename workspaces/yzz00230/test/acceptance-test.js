const { processBatch, validateInput } = require('../src/businessService');
const { clearAll, getAuditRecord, findByBatchNo, generateAuditId } = require('../src/storage');
const SAMPLES = require('./samples');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    results.push({ name, status: 'FAIL', error: e.message });
    console.log(`  ✗ ${name}`);
    console.log(`    错误: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `期望 ${expected}, 实际 ${actual}`);
  }
}

function assertIncludes(str, substr, message) {
  if (!str || !str.includes(substr)) {
    throw new Error(message || `期望字符串包含 "${substr}", 实际为 "${str}"`);
  }
}

console.log('========================================');
console.log('  VPN异地登录API - 验收测试');
console.log('========================================\n');

clearAll();

console.log('1. 合规样例测试');
test('合规登录应返回 compliant 结论', () => {
  const result = processBatch(SAMPLES.compliant.payload);
  assert(result.success, '处理应成功');
  assertEqual(result.results[0].businessConclusion, 'compliant');
  assertEqual(result.results[0].riskLevel, 'none');
  assertEqual(result.results[0].nextAction, 'pass_and_archive');
  assert(result.results[0].riskTags.length === 0, '不应有风险标签');
  assert(result.results[0].auditId, '应有审计编号');
});

test('合规登录应有可追溯的审计编号', () => {
  const result = processBatch(SAMPLES.compliant.payload);
  const auditId = result.results[0].auditId;
  const record = getAuditRecord(auditId);
  assert(record, '应能通过审计编号查询到记录');
  assertEqual(record.batchNo, SAMPLES.compliant.payload.batchNo);
});

console.log('\n2. 超阈值样例测试');
test('高风险登录应返回 risk_high 结论', () => {
  const result = processBatch(SAMPLES.thresholdExceeded.payload);
  assertEqual(result.results[0].businessConclusion, 'risk_high');
  assertEqual(result.results[0].riskLevel, 'high');
  assertEqual(result.results[0].nextAction, 'block_account');
  assert(result.results[0].riskScore >= 80, `风险评分应>=80, 实际 ${result.results[0].riskScore}`);
  assert(result.results[0].hitRules.length > 0, '应命中多条规则');
});

test('高风险登录应有明确的风险标签', () => {
  const result = processBatch(SAMPLES.thresholdExceeded.payload);
  const tags = result.results[0].riskTags;
  assert(tags.includes('suspicious_ip'), '应包含可疑IP标签');
  assert(tags.includes('geo_location_abnormal'), '应包含地理位置异常标签');
  assert(tags.includes('device_fingerprint_mismatch'), '应包含设备指纹不匹配标签');
});

console.log('\n3. 中风险样例测试');
test('中风险登录应返回 risk_medium 结论', () => {
  const result = processBatch(SAMPLES.mediumRisk.payload);
  assertEqual(result.results[0].businessConclusion, 'risk_medium');
  assertEqual(result.results[0].riskLevel, 'medium');
  assertEqual(result.results[0].nextAction, 'escalate_to_security');
});

console.log('\n4. 材料缺失样例测试');
test('材料缺失应明确返回 material_missing', () => {
  const result = processBatch(SAMPLES.materialMissing.payload);
  assertEqual(result.results[0].businessConclusion, 'material_missing');
  assertEqual(result.results[0].nextAction, 'supplement_material');
  assert(result.results[0].failReason, '应有失败原因');
  assertIncludes(result.results[0].failReason, '材料缺失');
});

test('材料缺失应有具体缺失字段列表', () => {
  const result = processBatch(SAMPLES.materialMissing.payload);
  const auditId = result.results[0].auditId;
  const record = getAuditRecord(auditId);
  assert(record.materialCheck, '应有材料检查结果');
  assert(record.materialCheck.missingFields.length > 0, '应有缺失字段列表');
  assert(record.materialCheck.missingFields.includes('userId'), '应缺少userId');
  assert(record.materialCheck.missingFields.includes('loginTime'), '应缺少loginTime');
  assert(record.materialCheck.missingFields.includes('ipAddress'), '应缺少ipAddress');
});

console.log('\n5. 历史回放样例测试');
test('历史回放应使用 recheck 动作', () => {
  const result = processBatch(SAMPLES.historyReplay.payload);
  assert(result.success, '处理应成功');
  const auditId = result.results[0].auditId;
  const record = getAuditRecord(auditId);
  assert(record.isRecheck === true, '应标记为重检');
});

test('历史回放来源渠道应为 history_replay', () => {
  const result = processBatch(SAMPLES.historyReplay.payload);
  const auditId = result.results[0].auditId;
  const record = getAuditRecord(auditId);
  assertEqual(record.sourceChannel, 'history_replay');
});

console.log('\n6. 重复提交样例测试');
test('首次提交应正常处理', () => {
  const result = processBatch(SAMPLES.duplicateSubmission.payload);
  assertEqual(result.results[0].businessConclusion, 'compliant');
  assert(!result.results[0].isDuplicate, '首次提交不应标记为重复');
});

test('重复提交应返回 duplicate_submission 且不笼统失败', () => {
  const result = processBatch(SAMPLES.duplicateSubmission.payload);
  assertEqual(result.results[0].businessConclusion, 'duplicate_submission');
  assert(result.results[0].isDuplicate === true, '应标记为重复提交');
  assertEqual(result.results[0].nextAction, 'no_action');
  assert(result.results[0].failReason, '应有明确的失败原因');
  assertIncludes(result.results[0].failReason, '重复提交');
});

test('重复提交应关联原始审计编号', () => {
  const result = processBatch(SAMPLES.duplicateSubmission.payload);
  const auditId = result.results[0].auditId;
  const record = getAuditRecord(auditId);
  assert(record.originalAuditId, '应关联原始审计编号');
});

console.log('\n7. 人工复核样例测试');
test('先提交一条待复核记录', () => {
  const result = processBatch(SAMPLES.manualReviewApprove.setupPayload);
  assert(result.success, '提交应成功');
});

test('复核通过应返回 closed 结论和 approved 结果', () => {
  const result = processBatch(SAMPLES.manualReviewApprove.reviewPayload);
  assertEqual(result.results[0].reviewResult, 'approved');
  assertEqual(result.results[0].businessConclusion, 'closed');
  assertEqual(result.results[0].nextAction, 'pass_and_archive');
  assertEqual(result.results[0].status, 'closed');
});

test('复核通过应包含复核意见和复核人', () => {
  const result = processBatch(SAMPLES.manualReviewApprove.reviewPayload);
  const auditId = result.results[0].auditId;
  const record = getAuditRecord(auditId);
  assert(record.reviewOpinion, '应有复核意见');
  assert(record.reviewer, '应有复核人');
  assert(record.originalAuditId, '应关联原始记录');
});

test('复核驳回应返回 risk_high 结论和 rejected 结果', () => {
  const setup = {
    ...SAMPLES.manualReviewApprove.setupPayload,
    batchNo: 'BATCH-REVIEW-REJECT-001',
    items: [{ ...SAMPLES.manualReviewApprove.setupPayload.items[0], itemId: 'ITEM-REVIEW-002' }]
  };
  processBatch(setup);

  const result = processBatch({
    ...SAMPLES.manualReviewReject.reviewPayload,
    batchNo: 'BATCH-REVIEW-REJECT-001',
    items: [{ itemId: 'ITEM-REVIEW-002', userId: 'U60006' }]
  });
  assertEqual(result.results[0].reviewResult, 'rejected');
  assertEqual(result.results[0].businessConclusion, 'risk_high');
  assertEqual(result.results[0].nextAction, 'block_account');
});

console.log('\n8. 边界条件测试');
test('空批次号应返回校验错误', () => {
  const result = processBatch(SAMPLES.boundaryEmptyBatch.payload);
  assert(!result.success, '应失败');
  assertEqual(result.code, 'INVALID_INPUT');
  assert(result.errors.length > 0, '应有错误详情');
});

test('空明细列表应返回校验错误', () => {
  const result = processBatch(SAMPLES.boundaryEmptyItems.payload);
  assert(!result.success, '应失败');
  assertEqual(result.code, 'INVALID_INPUT');
});

test('无效处理动作应返回校验错误', () => {
  const result = processBatch(SAMPLES.boundaryInvalidAction.payload);
  assert(!result.success, '应失败');
  assertEqual(result.code, 'INVALID_INPUT');
  assert(result.errors.some(e => e.includes('处理动作')), '错误信息应提及处理动作');
});

test('无效来源渠道应返回校验错误', () => {
  const payload = {
    batchNo: 'TEST-001',
    sourceChannel: 'invalid_channel',
    action: 'submit',
    items: [{ itemId: 'x', userId: 'u1', loginTime: '2026-01-01T00:00:00Z', ipAddress: '1.1.1.1' }]
  };
  const result = processBatch(payload);
  assert(!result.success, '应失败');
  assertEqual(result.code, 'INVALID_INPUT');
  assert(result.errors.some(e => e.includes('来源渠道')), '错误信息应提及来源渠道');
});

console.log('\n9. 可追溯性测试');
test('审计编号应具有统一格式', () => {
  const id1 = generateAuditId();
  const id2 = generateAuditId();
  assert(id1.startsWith('AUD-'), '审计编号应以 AUD- 开头');
  assert(id1 !== id2, '审计编号应唯一');
  assert(id1.length > 15, '审计编号应具有足够长度');
});

test('通过批次号可追溯所有相关记录', () => {
  const batchNo = 'BATCH-TRACE-TEST-001';
  const payload = {
    batchNo,
    sourceChannel: 'auto_monitor',
    action: 'submit',
    items: [
      { itemId: 'TRACE-001', userId: 'U001', loginTime: '2026-06-06T10:00:00Z', ipAddress: '1.1.1.1' },
      { itemId: 'TRACE-002', userId: 'U002', loginTime: '2026-06-06T10:00:00Z', ipAddress: '2.2.2.2' }
    ]
  };
  processBatch(payload);
  const records = findByBatchNo(batchNo);
  assertEqual(records.length, 2, '批次记录数应匹配');
});

test('每条记录都有创建时间戳', () => {
  const result = processBatch(SAMPLES.compliant.payload);
  const record = getAuditRecord(result.results[0].auditId);
  assert(record.createdAt, '应有创建时间');
  const date = new Date(record.createdAt);
  assert(!isNaN(date.getTime()), '创建时间应为有效日期');
});

console.log('\n10. 关闭记录测试');
test('关闭动作应将记录状态设为 closed', () => {
  const result = processBatch(SAMPLES.closeRecord.payload);
  assertEqual(result.results[0].businessConclusion, 'closed');
  assertEqual(result.results[0].status, 'closed');
  assertEqual(result.results[0].nextAction, 'no_action');
});

console.log('\n11. 第三方渠道测试');
test('第三方渠道数据应正常处理', () => {
  const result = processBatch(SAMPLES.thirdPartySource.payload);
  assert(result.success, '处理应成功');
  assert(result.results[0].riskTags.includes('suspicious_ip'), '可疑IP应被正确识别');
  const record = getAuditRecord(result.results[0].auditId);
  assertEqual(record.sourceChannel, 'third_party');
});

console.log('\n12. 多明细批次测试');
let batchMultiResult;
test('多明细批次应返回正确的统计信息', () => {
  batchMultiResult = processBatch({
    ...SAMPLES.batchMultipleItems.payload,
    batchNo: 'BATCH-MULTI-TEST-UNIQUE-001'
  });
  assertEqual(batchMultiResult.totalCount, 3);
  assertEqual(batchMultiResult.successCount, 2);
  assertEqual(batchMultiResult.failCount, 1);
  assert(batchMultiResult.results.length === 3, '应返回3条结果');
});

test('多明细批次中各明细独立处理，互不影响', () => {
  const conclusions = batchMultiResult.results.map(r => r.businessConclusion);
  assert(conclusions.includes('compliant'), '应包含合规结论');
  assert(conclusions.includes('risk_high'), '应包含高风险结论');
  assert(conclusions.includes('material_missing'), '应包含材料缺失结论');
});

test('多明细批次应有明确的部分失败标识', () => {
  assertEqual(batchMultiResult.code, 'PARTIAL_FAILURE');
  assert(!batchMultiResult.success, '部分失败时 success 应为 false');
});

console.log('\n13. 失败提示明确性测试');
test('不同失败场景应有不同的失败原因', () => {
  const duplicateResult = processBatch(SAMPLES.duplicateSubmission.payload);
  const missingResult = processBatch(SAMPLES.materialMissing.payload);

  assert(duplicateResult.results[0].failReason !== missingResult.results[0].failReason,
    '不同失败原因不应相同');
  assertIncludes(duplicateResult.results[0].failReason, '重复');
  assertIncludes(missingResult.results[0].failReason, '材料缺失');
});

console.log('\n========================================');
console.log(`  测试结果: ${passed} 通过, ${failed} 失败`);
console.log('========================================\n');

if (failed > 0) {
  console.log('失败的测试:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('所有测试通过!');
  process.exit(0);
}
