const fs = require('fs');
const path = require('path');
const { processRecords } = require('../src/processor');
const { loadSnapshot, getRecordHistory, buildRecordKey } = require('../src/history');

const TEST_DIR = path.join(__dirname, '..', 'output', 'e2e_test');
const SNAPSHOT_FILE = path.join(TEST_DIR, 'snapshot.json');

function cleanTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ 断言失败: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function assertContains(str, substr, message) {
  assert(str.includes(substr), `${message} (期望包含 "${substr}")`);
}

console.log('========================================');
console.log('  公厕保洁评分CLI - 端到端测试');
console.log('========================================');
console.log('');

cleanTestDir();

// ========== 第一批处理 ==========
console.log('【第一批处理】');
console.log('');

const batch1Result = processRecords({
  inputCsv: path.join(__dirname, '..', 'examples', 'test_records.csv'),
  rulesFile: path.join(__dirname, '..', 'examples', 'rules.json'),
  outputDir: path.join(TEST_DIR, 'batch1'),
  snapshotFile: SNAPSHOT_FILE,
  dedupeFields: ['toilet_id', 'check_date']
});

const summary1 = batch1Result.summary;
const results1 = batch1Result.results;

// 总记录数
assert(summary1.totalCount === 9, `总记录数为 9 (实际: ${summary1.totalCount})`);
assert(summary1.normalCount === 4, `正常记录 4 条 (实际: ${summary1.normalCount})`);
assert(summary1.abnormalCount === 4, `异常记录 4 条 (实际: ${summary1.abnormalCount})`);
assert(summary1.pendingCount === 1, `待复核记录 1 条 (实际: ${summary1.pendingCount})`);

// 批次号和来源标识
assert(summary1.batchId.startsWith('BATCH-'), '批次号格式正确');
assert(summary1.sourceFile.includes('test_records'), '来源文件标识正确');

// 正常记录验证
const normalRecords = results1.filter(r => r.status === 'normal');
assert(normalRecords.length === 4, '正常记录数量正确');

const t001 = results1.find(r => r.record.toilet_id === 'T001' && r.sourceRow === 2);
assert(t001.status === 'normal', 'T001 (第2行) 状态为 normal');
assert(t001.scoreResult.totalScore === 95, 'T001 总分为 95');
assert(t001.reason === '评分正常', 'T001 原因正确');

const t003 = results1.find(r => r.record.toilet_id === 'T003');
assert(t003.status === 'normal', 'T003 状态为 normal (评分未达标但规则通过)');
assert(t003.reason === '评分未达标', 'T003 原因显示未达标');

// 异常记录验证 - 缺字段
const t004 = results1.find(r => r.record.toilet_id === 'T004');
assert(t004.status === 'abnormal', 'T004 状态为 abnormal (缺 inspector)');
assertContains(t004.reason, '缺少必填字段', 'T004 原因包含"缺少必填字段"');
assertContains(t004.reason, 'inspector', 'T004 原因指明缺少 inspector');

const t008 = results1.find(r => r.record.toilet_id === 'T008');
assert(t008.status === 'abnormal', 'T008 状态为 abnormal (缺 check_date)');
assertContains(t008.reason, '缺少必填字段', 'T008 原因包含"缺少必填字段"');

// 异常记录验证 - 规则校验不通过
const t006 = results1.find(r => r.record.toilet_id === 'T006');
assert(t006.status === 'abnormal', 'T006 状态为 abnormal (枚举值非法)');
assertContains(t006.reason, '规则校验不通过', 'T006 原因包含"规则校验不通过"');
assertContains(t006.reason, '不在可选范围', 'T006 原因说明值不在可选范围');

// 异常记录验证 - 批次内重复
const t001Dup = results1.find(r => r.record.toilet_id === 'T001' && r.sourceRow === 10);
assert(t001Dup.status === 'abnormal', 'T001 (第10行) 状态为 abnormal (批次内重复)');
assertContains(t001Dup.reason, '重复记录', '重复记录原因包含"重复记录"');
assertContains(t001Dup.reason, '当前批次', '重复记录原因指明是当前批次');

// 待复核记录验证 - 规则冲突
const t005 = results1.find(r => r.record.toilet_id === 'T005');
assert(t005.status === 'pending', 'T005 状态为 pending (规则冲突)');
assertContains(t005.reason, '规则冲突', 'T005 原因包含"规则冲突"');
assertContains(t005.reason, '超过上限', 'T005 原因说明超过上限');
assert(t005.scoreResult.rawTotalScore === 110, 'T005 原始总分为 110');

// 来源行验证
assert(t004.sourceRow === 5, 'T004 来源行号正确 (第5行)');
assert(t005.sourceRow === 6, 'T005 来源行号正确 (第6行)');

console.log('');
console.log('【导出结果验证】');
console.log('');

// 验证输出文件存在
assert(fs.existsSync(summary1.outputFiles.normal), '正常记录CSV文件存在');
assert(fs.existsSync(summary1.outputFiles.abnormal), '异常记录CSV文件存在');
assert(fs.existsSync(summary1.outputFiles.pending), '待复核记录CSV文件存在');

// 验证输出文件包含批次号和来源标识
const normalContent = fs.readFileSync(summary1.outputFiles.normal, 'utf-8');
assertContains(normalContent, 'batch_id', '输出文件包含 batch_id 列');
assertContains(normalContent, 'source_file', '输出文件包含 source_file 列');
assertContains(normalContent, 'source_row', '输出文件包含 source_row 列');
assertContains(normalContent, 'record_id', '输出文件包含 record_id 列');
assertContains(normalContent, 'reason', '输出文件包含 reason 列');
assertContains(normalContent, 'raw_total_score', '输出文件包含 raw_total_score 列');

console.log('');
console.log('【历史快照验证 - 第一批后】');
console.log('');

// 验证快照文件
const snapshot1 = loadSnapshot(SNAPSHOT_FILE);
assert(snapshot1.batches.length === 1, '快照中有 1 个批次记录');
assert(snapshot1.batches[0].batchId === summary1.batchId, '批次号匹配');
assert(snapshot1.batches[0].recordCount === 9, '批次记录数正确');

// 验证记录历史
const t001Key = buildRecordKey({ toilet_id: 'T001', check_date: '2026-06-01' }, ['toilet_id', 'check_date']);
const t001History = getRecordHistory(t001Key, snapshot1);
assert(t001History.length === 2, 'T001 历史记录有 2 条 (同批次两条记录)');
assert(t001History[0].status === 'normal', '第一条历史记录状态为 normal');
assert(t001History[1].status === 'abnormal', '第二条历史记录状态为 abnormal (重复)');

// ========== 第二批处理 ==========
console.log('');
console.log('【第二批处理 - 跨批次去重验证】');
console.log('');

const batch2Result = processRecords({
  inputCsv: path.join(__dirname, '..', 'examples', 'test_records_batch2.csv'),
  rulesFile: path.join(__dirname, '..', 'examples', 'rules.json'),
  outputDir: path.join(TEST_DIR, 'batch2'),
  snapshotFile: SNAPSHOT_FILE,
  dedupeFields: ['toilet_id', 'check_date']
});

const summary2 = batch2Result.summary;
const results2 = batch2Result.results;

assert(summary2.totalCount === 3, '第二批总记录数为 3');
assert(summary2.normalCount === 1, '第二批正常记录 1 条 (T009)');
assert(summary2.abnormalCount === 2, '第二批异常记录 2 条 (T001, T002 重复)');

const t009 = results2.find(r => r.record.toilet_id === 'T009');
assert(t009.status === 'normal', 'T009 状态为 normal (新记录)');

const t001Batch2 = results2.find(r => r.record.toilet_id === 'T001');
assert(t001Batch2.status === 'abnormal', 'T001 在第二批中状态为 abnormal (历史重复)');
assertContains(t001Batch2.reason, '历史批次', '重复原因指明是历史批次');

const t002Batch2 = results2.find(r => r.record.toilet_id === 'T002');
assert(t002Batch2.status === 'abnormal', 'T002 在第二批中状态为 abnormal (历史重复)');

console.log('');
console.log('【历史轨迹验证 - 第二批后】');
console.log('');

const snapshot2 = loadSnapshot(SNAPSHOT_FILE);
assert(snapshot2.batches.length === 2, '快照中有 2 个批次记录');

const t001History2 = getRecordHistory(t001Key, snapshot2);
assert(t001History2.length === 3, 'T001 历史记录共 3 条 (第一批2条 + 第二批1条)');
assert(t001History2[2].batchId === summary2.batchId, '第三条记录来自第二批');
assert(t001History2[2].status === 'abnormal', '第三批记录状态为 abnormal (重复)');

// 验证第一条记录始终是首次处理
const firstRecord = snapshot2.records[t001Key];
assert(firstRecord.firstBatch === summary1.batchId, '首次处理批次号正确');
assert(firstRecord.batches[0].batchId === summary1.batchId, '历史轨迹按时间排序');

console.log('');
console.log('========================================');
console.log('  ✅ 所有测试通过！');
console.log('========================================');
console.log('');
console.log('测试目录:', TEST_DIR);
console.log('快照文件:', SNAPSHOT_FILE);
console.log('');
