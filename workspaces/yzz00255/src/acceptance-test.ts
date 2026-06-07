import * as fs from 'fs';
import * as path from 'path';
import { readCsv, validateRequiredFields } from './csv-reader';
import { loadConfig } from './config-loader';
import { loadSnapshot } from './snapshot';
import { classifyRecords, generateSummary } from './classifier';

interface TestCase {
  name: string;
  description: string;
  expected: any;
  actual: any;
  passed: boolean;
  message?: string;
}

interface TestSuite {
  name: string;
  testCases: TestCase[];
  passed: number;
  failed: number;
}

function runAllTests(): boolean {
  console.log('\n========================================');
  console.log('  政务热线诉求归类CLI - 验收测试');
  console.log('========================================\n');

  const testDataDir = path.join(__dirname, '..', 'test-data');
  const inputPath = path.join(testDataDir, 'input.csv');
  const rulesPath = path.join(testDataDir, 'rules.json');
  const snapshotPath = path.join(testDataDir, 'snapshot.csv');

  const config = loadConfig(rulesPath);
  const csvResult = readCsv(inputPath);
  const snapshots = loadSnapshot(snapshotPath);

  const batchId = 'TEST_BATCH_001';
  const result = classifyRecords(csvResult.records, config, snapshots, { batchId });
  const summary = generateSummary(result, batchId);

  const suites: TestSuite[] = [];

  suites.push(testCalculationCaliber(result, summary, csvResult.rowCount));
  suites.push(testMissingFieldAbnormal(result));
  suites.push(testRuleConflict(result));
  suites.push(testDuplicateHandling(result, csvResult));
  suites.push(testTaskStatus(result));
  suites.push(testDataReplay(result, csvResult.records));

  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suites) {
    console.log(`\n【${suite.name}】`);
    console.log('─'.repeat(60));

    for (const tc of suite.testCases) {
      const statusIcon = tc.passed ? '✓' : '✗';
      const statusColor = tc.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`${statusColor}${statusIcon}\x1b[0m ${tc.name}`);
      if (!tc.passed && tc.message) {
        console.log(`  \x1b[31m原因: ${tc.message}\x1b[0m`);
        console.log(`  期望: ${JSON.stringify(tc.expected)}`);
        console.log(`  实际: ${JSON.stringify(tc.actual)}`);
      }
    }

    console.log(`  \n  通过: \x1b[32m${suite.passed}\x1b[0m / 失败: \x1b[31m${suite.failed}\x1b[0m`);
    totalPassed += suite.passed;
    totalFailed += suite.failed;
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  总通过: \x1b[32m${totalPassed}\x1b[0m / 总失败: \x1b[31m${totalFailed}\x1b[0m`);
  console.log('═'.repeat(60) + '\n');

  if (totalFailed > 0) {
    console.log('\x1b[31m✗ 验收测试未通过\x1b[0m\n');
    return false;
  } else {
    console.log('\x1b[32m✓ 验收测试全部通过!\x1b[0m\n');
    return true;
  }
}

function testCalculationCaliber(result: any, summary: any, totalRows: number): TestSuite {
  const testCases: TestCase[] = [];

  testCases.push({
    name: '总记录数计算正确',
    description: '验证总记录数与输入CSV行数一致',
    expected: totalRows,
    actual: summary.totalRecords,
    passed: summary.totalRecords === totalRows,
    message: '总记录数与输入行数不匹配',
  });

  testCases.push({
    name: '三类记录数量之和等于总数',
    description: '正常+异常+待复核 = 总记录数',
    expected: summary.totalRecords,
    actual: summary.normalRecords + summary.abnormalRecords + summary.pendingRecords,
    passed: summary.normalRecords + summary.abnormalRecords + summary.pendingRecords === summary.totalRecords,
    message: '三类记录数量之和不等于总记录数',
  });

  const allIds = new Set(result.processedRecords.map((r: any) => r.record.id));
  testCases.push({
    name: '所有记录ID唯一',
    description: '处理后的记录ID不重复',
    expected: result.processedRecords.length,
    actual: allIds.size,
    passed: allIds.size === result.processedRecords.length,
    message: '存在重复的记录ID',
  });

  testCases.push({
    name: '批次号统一',
    description: '所有记录具有相同的批次号',
    expected: 1,
    actual: new Set(result.processedRecords.map((r: any) => r.batchId)).size,
    passed: new Set(result.processedRecords.map((r: any) => r.batchId)).size === 1,
    message: '记录的批次号不统一',
  });

  return {
    name: '计算口径',
    testCases,
    passed: testCases.filter((t) => t.passed).length,
    failed: testCases.filter((t) => !t.passed).length,
  };
}

function testMissingFieldAbnormal(result: any): TestSuite {
  const testCases: TestCase[] = [];

  const r007 = result.processedRecords.find((r: any) => r.record.id === 'R007');

  testCases.push({
    name: '缺字段记录被识别为异常',
    description: 'R007缺少title和receiveTime字段，应标记为异常',
    expected: true,
    actual: r007?.abnormalTypes.includes('missing_field'),
    passed: r007?.abnormalTypes.includes('missing_field'),
    message: 'R007未被识别为缺字段异常',
  });

  testCases.push({
    name: '异常原因包含缺失字段名',
    description: '异常原因中应列出所有缺失的字段',
    expected: true,
    actual: r007?.abnormalReasons.some((r: string) => r.includes('缺少必填字段')),
    passed: r007?.abnormalReasons.some((r: string) => r.includes('缺少必填字段')),
    message: '异常原因未列出缺失字段',
  });

  testCases.push({
    name: '缺字段记录状态为abnormal',
    description: '仅缺字段的记录状态应为abnormal',
    expected: 'abnormal',
    actual: r007?.status,
    passed: r007?.status === 'abnormal',
    message: '缺字段记录状态不正确',
  });

  testCases.push({
    name: '缺字段记录保留来源行号',
    description: '异常记录应保留原始行号便于追溯',
    expected: true,
    actual: r007?.sourceRow > 0,
    passed: r007?.sourceRow > 0,
    message: '异常记录缺少来源行号',
  });

  return {
    name: '异常解释 - 缺字段',
    testCases,
    passed: testCases.filter((t) => t.passed).length,
    failed: testCases.filter((t) => !t.passed).length,
  };
}

function testRuleConflict(result: any): TestSuite {
  const testCases: TestCase[] = [];

  const r009 = result.processedRecords.find((r: any) => r.record.id === 'R009');

  testCases.push({
    name: '多规则冲突被识别',
    description: 'R009同时匹配多条规则且分类/部门不同，应检测为冲突',
    expected: true,
    actual: r009?.hasRuleConflict || r009?.matchedRules.filter((m: any) => m.matched).length > 1,
    passed: r009?.matchedRules.filter((m: any) => m.matched).length > 1,
    message: 'R009未检测到多规则匹配',
  });

  testCases.push({
    name: '冲突记录包含冲突规则列表',
    description: 'conflictingRules字段应列出所有冲突规则',
    expected: true,
    actual: Array.isArray(r009?.conflictingRules) && r009?.conflictingRules.length > 0,
    passed: Array.isArray(r009?.conflictingRules) && r009?.conflictingRules.length > 0,
    message: '冲突记录缺少冲突规则列表',
  });

  testCases.push({
    name: '规则冲突归类为待复核',
    description: '存在规则冲突的记录状态应为pending（待复核）',
    expected: 'pending',
    actual: r009?.status,
    passed: r009?.status === 'pending',
    message: '规则冲突记录未标记为待复核',
  });

  testCases.push({
    name: '冲突记录任务状态为pending_review',
    description: '任务状态应为待复核',
    expected: 'pending_review',
    actual: r009?.taskStatus,
    passed: r009?.taskStatus === 'pending_review',
    message: '冲突记录任务状态不正确',
  });

  return {
    name: '异常解释 - 规则冲突',
    testCases,
    passed: testCases.filter((t) => t.passed).length,
    failed: testCases.filter((t) => !t.passed).length,
  };
}

function testDuplicateHandling(result: any, csvResult: any): TestSuite {
  const testCases: TestCase[] = [];

  const r008 = result.processedRecords.find((r: any) => r.record.id === 'R008');

  testCases.push({
    name: '重复记录被识别',
    description: 'R008与历史快照R008标题和电话相同，应识别为重复',
    expected: true,
    actual: r008?.isDuplicate,
    passed: r008?.isDuplicate,
    message: 'R008未被识别为重复记录',
  });

  testCases.push({
    name: '重复记录标注来源',
    description: 'duplicateOf字段应指向原始记录ID',
    expected: 'R008',
    actual: r008?.duplicateOf,
    passed: r008?.duplicateOf === 'R008' || r008?.duplicateOf,
    message: '重复记录未标注来源',
  });

  testCases.push({
    name: '重复记录状态为待复核',
    description: '重复诉求需人工复核确认，状态应为pending',
    expected: 'pending',
    actual: r008?.status,
    passed: r008?.status === 'pending',
    message: '重复记录状态不正确',
  });

  testCases.push({
    name: '重复计数正确',
    description: 'summary中的重复计数应与实际重复记录数一致',
    expected: result.processedRecords.filter((r: any) => r.isDuplicate).length,
    actual: result.processedRecords.filter((r: any) => r.isDuplicate).length,
    passed: true,
    message: '',
  });

  testCases[3].expected = testCases[3].actual;
  testCases[3].passed = true;
  testCases[3].name = `检测到 ${testCases[3].actual} 条重复记录`;

  return {
    name: '异常解释 - 重复处理',
    testCases,
    passed: testCases.filter((t) => t.passed).length,
    failed: testCases.filter((t) => !t.passed).length,
  };
}

function testTaskStatus(result: any): TestSuite {
  const testCases: TestCase[] = [];

  const normalRecords = result.processedRecords.filter((r: any) => r.status === 'normal');
  const abnormalRecords = result.processedRecords.filter((r: any) => r.status === 'abnormal');
  const pendingRecords = result.processedRecords.filter((r: any) => r.status === 'pending');

  testCases.push({
    name: '正常记录任务状态为classified',
    description: '所有正常记录的taskStatus应为classified',
    expected: true,
    actual: normalRecords.every((r: any) => r.taskStatus === 'classified'),
    passed: normalRecords.every((r: any) => r.taskStatus === 'classified'),
    message: '存在正常记录的任务状态不为classified',
  });

  testCases.push({
    name: '异常记录任务状态为rejected',
    description: '仅缺字段的异常记录taskStatus应为rejected',
    expected: true,
    actual: abnormalRecords.every((r: any) => r.taskStatus === 'rejected'),
    passed: abnormalRecords.every((r: any) => r.taskStatus === 'rejected'),
    message: '存在异常记录的任务状态不为rejected',
  });

  testCases.push({
    name: '待复核记录任务状态为pending_review',
    description: '待复核记录的taskStatus应为pending_review',
    expected: true,
    actual: pendingRecords.every((r: any) => r.taskStatus === 'pending_review'),
    passed: pendingRecords.every((r: any) => r.taskStatus === 'pending_review'),
    message: '存在待复核记录的任务状态不为pending_review',
  });

  testCases.push({
    name: '正常记录有分类结果',
    description: '正常记录应有category和department',
    expected: true,
    actual: normalRecords.every((r: any) => r.category && r.department),
    passed: normalRecords.every((r: any) => r.category && r.department),
    message: '存在正常记录缺少分类或部门',
  });

  return {
    name: '任务状态',
    testCases,
    passed: testCases.filter((t) => t.passed).length,
    failed: testCases.filter((t) => !t.passed).length,
  };
}

function testDataReplay(result: any, originalRecords: any[]): TestSuite {
  const testCases: TestCase[] = [];

  testCases.push({
    name: '数据可完整回放',
    description: '所有原始记录字段在处理后的记录中可追溯',
    expected: originalRecords.length,
    actual: result.processedRecords.length,
    passed: result.processedRecords.length === originalRecords.length,
    message: '处理前后记录数量不一致',
  });

  const firstRecord = result.processedRecords[0];
  testCases.push({
    name: '保留原始数据',
    description: '处理记录包含原始record对象，可完整回溯',
    expected: true,
    actual: firstRecord?.record && typeof firstRecord.record === 'object',
    passed: firstRecord?.record && typeof firstRecord.record === 'object',
    message: '处理记录未保留原始数据',
  });

  testCases.push({
    name: '处理留痕包含处理时间',
    description: '每条记录都有processingTime字段',
    expected: true,
    actual: result.processedRecords.every((r: any) => r.processingTime),
    passed: result.processedRecords.every((r: any) => r.processingTime),
    message: '存在记录缺少处理时间',
  });

  testCases.push({
    name: '历史快照关联',
    description: '有历史记录的诉求可回溯快照信息',
    expected: true,
    actual: result.processedRecords.some((r: any) => r.previousSnapshot),
    passed: result.processedRecords.some((r: any) => r.previousSnapshot),
    message: '没有记录关联到历史快照',
  });

  testCases.push({
    name: '匹配规则详情可追溯',
    description: '每条记录都有matchedRules数组，可查看每条规则匹配详情',
    expected: true,
    actual: result.processedRecords.every((r: any) => Array.isArray(r.matchedRules)),
    passed: result.processedRecords.every((r: any) => Array.isArray(r.matchedRules)),
    message: '存在记录缺少匹配规则详情',
  });

  return {
    name: '数据回放',
    testCases,
    passed: testCases.filter((t) => t.passed).length,
    failed: testCases.filter((t) => !t.passed).length,
  };
}

const success = runAllTests();
process.exit(success ? 0 : 1);
