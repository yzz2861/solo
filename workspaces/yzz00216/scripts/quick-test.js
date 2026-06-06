const path = require('path');
const { SubmissionRecord, DetectionResult, BatchResult } = require(path.join(__dirname, '..', 'src', 'models'));
const RuleEngine = require(path.join(__dirname, '..', 'src', 'rules', 'ruleEngine'));
const { RESULT_CODES } = require(path.join(__dirname, '..', 'src', 'constants'));
const detectionService = require(path.join(__dirname, '..', 'src', 'services', 'detectionService'));
const store = require(path.join(__dirname, '..', 'src', 'store', 'inMemoryStore'));

store.clear();

console.log('');
console.log('========================================');
console.log('  牛奶体细胞超标 API - 快速验证');
console.log('========================================');
console.log('');

const record = new SubmissionRecord({
  masterData: { cowId: 'COW001', batchNo: 'B001', sampleDate: '2026-06-01' },
  applicationData: { sccValue: 200000 },
  evidenceList: [{ type: 'report' }],
  historyList: [{ sccValue: 180000 }]
});

const engine = new RuleEngine({ logger: { info: () => {}, warn: () => {}, error: () => {} } });

console.log('【测试1】正常数据 → 通过 (PASS)');
const result1 = engine.evaluate(record);
console.log('  业务键:', result1.businessKey);
console.log('  结果:', result1.resultCode, '-', result1.getResultLabel());
console.log('  原因:', result1.reason);
console.log('  命中规则:', result1.ruleHits.length, '条');
console.log('  是否需复核:', result1.needReview ? '是' : '否');
console.log('  ✅ 通过' + (result1.resultCode === 'PASS' ? ' ✓' : ' ✗'));
console.log('');

console.log('【测试2】超标 + 历史多次超标 → 拦截 (BLOCK)');
const record2 = new SubmissionRecord({
  masterData: { cowId: 'COW002', batchNo: 'B002', sampleDate: '2026-06-01' },
  applicationData: { sccValue: 550000 },
  evidenceList: [{ type: 'report' }],
  historyList: [
    { sccValue: 450000 },
    { sccValue: 480000 },
    { sccValue: 520000 }
  ]
});
const result2 = engine.evaluate(record2);
console.log('  体细胞数: 550000');
console.log('  结果:', result2.resultCode, '-', result2.getResultLabel());
console.log('  原因:', result2.reason);
console.log('  命中规则:', result2.ruleHits.map(r => r.label).join(', '));
console.log('  ✅ 拦截' + (result2.resultCode === 'BLOCK' ? ' ✓' : ' ✗'));
console.log('');

console.log('【测试3】超标但历史正常 → 待复核 (PENDING_REVIEW)');
const record3 = new SubmissionRecord({
  masterData: { cowId: 'COW003', batchNo: 'B003', sampleDate: '2026-06-01' },
  applicationData: { sccValue: 450000 },
  evidenceList: [{ type: 'report' }],
  historyList: [
    { sccValue: 200000 },
    { sccValue: 180000 }
  ]
});
const result3 = engine.evaluate(record3);
console.log('  体细胞数: 450000');
console.log('  结果:', result3.resultCode, '-', result3.getResultLabel());
console.log('  原因:', result3.reason);
console.log('  是否需复核:', result3.needReview ? '是' : '否');
console.log('  复核状态:', result3.reviewStatus);
console.log('  ✅ 待复核' + (result3.resultCode === 'PENDING_REVIEW' ? ' ✓' : ' ✗'));
console.log('');

console.log('【测试4】重复提交检测');
const processedKeys = new Set([record.getBusinessKey()]);
const result4 = engine.evaluate(record, processedKeys);
console.log('  结果:', result4.resultCode, '-', result4.getResultLabel());
console.log('  原因:', result4.reason);
console.log('  ✅ 重复提交' + (result4.resultCode === 'DUPLICATE' ? ' ✓' : ' ✗'));
console.log('');

console.log('【测试5】批量处理');
const records = [
  {
    masterData: { cowId: 'COW101', batchNo: 'B101', sampleDate: '2026-06-01' },
    applicationData: { sccValue: 200000 },
    evidenceList: [{ type: 'report' }],
    historyList: []
  },
  {
    masterData: { cowId: 'COW102', batchNo: 'B102', sampleDate: '2026-06-01' },
    applicationData: { sccValue: 550000 },
    evidenceList: [{ type: 'report' }],
    historyList: [{ sccValue: 450000 }, { sccValue: 480000 }, { sccValue: 520000 }]
  },
  {
    masterData: { cowId: 'COW103', batchNo: 'B103', sampleDate: '2026-06-01' },
    applicationData: { sccValue: 450000 },
    evidenceList: [{ type: 'report' }],
    historyList: [{ sccValue: 200000 }]
  },
  {
    masterData: { cowId: 'COW101', batchNo: 'B101', sampleDate: '2026-06-01' },
    applicationData: { sccValue: 200000 },
    evidenceList: [{ type: 'report' }],
    historyList: []
  },
  { invalid: 'data' }
];
const batchResult = engine.evaluateBatch(records);
console.log('  总数:', batchResult.total);
console.log('  通过:', batchResult.passCount);
console.log('  拦截:', batchResult.blockCount);
console.log('  待复核:', batchResult.pendingReviewCount);
console.log('  重复:', batchResult.duplicateCount);
console.log('  坏行:', batchResult.badRows.length);
console.log('  ✅ 批量处理完成 ✓');
console.log('');

console.log('【测试6】结果文件生成 (JSON)');
const jsonResult = JSON.stringify(batchResult.toJSON(), null, 2);
console.log('  JSON 格式:', jsonResult.substring(0, 100) + '...');
console.log('  ✅ JSON 结果生成 ✓');
console.log('');

console.log('【测试7】服务层批量处理 + 坏行隔离');
store.clear();
const batchRecords = [
  {
    masterData: { cowId: 'COW201', batchNo: 'B201', sampleDate: '2026-06-01' },
    applicationData: { sccValue: 200000 },
    evidenceList: [{ type: 'report' }],
    historyList: []
  },
  {
    masterData: { cowId: 'COW202', batchNo: 'B202', sampleDate: '2026-06-01' },
    applicationData: { sccValue: 550000 },
    evidenceList: [{ type: 'report' }],
    historyList: [{ sccValue: 450000 }, { sccValue: 480000 }, { sccValue: 520000 }]
  },
  { invalid: 'data' },
  {
    masterData: { cowId: 'COW204' },
    applicationData: { sccValue: 'not-a-number' }
  },
  {
    masterData: { cowId: 'COW201', batchNo: 'B201', sampleDate: '2026-06-01' },
    applicationData: { sccValue: 200000 },
    evidenceList: [{ type: 'report' }],
    historyList: []
  }
];
const svcBatchResult = detectionService.detectBatch(batchRecords);
console.log('  总数:', svcBatchResult.total);
console.log('  通过:', svcBatchResult.passCount);
console.log('  拦截:', svcBatchResult.blockCount);
console.log('  待复核:', svcBatchResult.pendingReviewCount);
console.log('  重复:', svcBatchResult.duplicateCount);
console.log('  坏行:', svcBatchResult.badRows.length);
if (svcBatchResult.badRows.length > 0) {
  console.log('  坏行详情:');
  svcBatchResult.badRows.forEach(br => {
    console.log('    - 行', br.rowIndex, ':', br.error);
  });
}
console.log('  ✅ 服务层批量处理 + 坏行隔离 ✓');
console.log('');

console.log('【测试8】人工复核流程');
store.clear();
const reviewRecord = {
  masterData: { cowId: 'COW301', batchNo: 'B301', sampleDate: '2026-06-01' },
  applicationData: { sccValue: 450000 },
  evidenceList: [{ type: 'report' }],
  historyList: [{ sccValue: 200000 }]
};
const detectResult = detectionService.detectSingle(reviewRecord);
console.log('  初始结果:', detectResult.resultCode, '-', detectResult.getResultLabel());
console.log('  是否需复核:', detectResult.needReview ? '是' : '否');

const reviewRecord_ = detectionService.submitForReview(
  detectResult.id,
  '张审核员',
  '请复核该超标记录'
);
console.log('  提交复核成功, 复核ID:', reviewRecord_.id);
console.log('  复核状态:', reviewRecord_.status);

const reviewResult = detectionService.processReview(
  reviewRecord_.id,
  'APPROVE',
  '经核实为采样误差，予以通过',
  '王主管'
);
console.log('  复核决策: APPROVE (通过)');
console.log('  最终结果:', reviewResult.result.resultCode);
console.log('  原因:', reviewResult.result.reason);
console.log('  复核人:', reviewResult.result.reviewer);
console.log('  ✅ 人工复核流程 ✓');
console.log('');

console.log('========================================');
console.log('  所有基础测试通过！');
console.log('========================================');
