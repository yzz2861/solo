const RuleEngine = require('../rules/ruleEngine');
const store = require('../store/inMemoryStore');
const { RESULT_CODES } = require('../constants');

const ruleEngine = new RuleEngine({
  logger: console
});

function detectSingle(submissionData) {
  const { SubmissionRecord } = require('../models');
  const record = new SubmissionRecord(submissionData);
  const businessKey = record.getBusinessKey();

  if (store.existsByBusinessKey(businessKey)) {
    const existingResult = store.getResultByBusinessKey(businessKey);
    const { DetectionResult } = require('../models');
    const dupResult = new DetectionResult(record, {
      resultCode: RESULT_CODES.DUPLICATE,
      reason: `业务键 ${businessKey} 已存在，为重复提交`,
      ruleHits: [{
        type: 'DUPLICATE_SUBMISSION',
        label: '重复提交',
        detail: `该记录已存在，首次提交ID: ${existingResult.id}`,
        severity: 'info'
      }],
      needReview: false
    });
    store.saveResult(dupResult);
    return dupResult;
  }

  const result = ruleEngine.evaluate(record);
  store.saveResult(result);

  return result;
}

function detectBatch(records) {
  const processedKeys = new Set();
  const { SubmissionRecord, BatchResult } = require('../models');

  const batchResult = new BatchResult(null, records.length);

  records.forEach((recordData, index) => {
    try {
      const record = new SubmissionRecord(recordData);

      const validation = record.validate();
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      const businessKey = record.getBusinessKey();

      if (processedKeys.has(businessKey) || store.existsByBusinessKey(businessKey)) {
        const { DetectionResult } = require('../models');
        const dupResult = new DetectionResult(record, {
          resultCode: RESULT_CODES.DUPLICATE,
          reason: `重复提交：${businessKey}`,
          ruleHits: [{
            type: 'DUPLICATE_SUBMISSION',
            label: '重复提交',
            detail: '该业务键已存在于本批次或历史记录中',
            severity: 'info'
          }],
          needReview: false
        });
        batchResult.addResult(dupResult);
        store.saveResult(dupResult);
        return;
      }

      const result = ruleEngine.evaluate(record, processedKeys);
      batchResult.addResult(result);
      store.saveResult(result);
      processedKeys.add(businessKey);
    } catch (error) {
      console.error(`[批量检测] 第 ${index + 1} 行处理失败:`, error.message);
      batchResult.addBadRow(index, recordData, error);
    }
  });

  store.saveBatch(batchResult);

  console.log(`[批量检测] 完成 - 批次ID: ${batchResult.batchId}`);
  console.log(`  总数: ${batchResult.total}`);
  console.log(`  通过: ${batchResult.passCount}`);
  console.log(`  拦截: ${batchResult.blockCount}`);
  console.log(`  待复核: ${batchResult.pendingReviewCount}`);
  console.log(`  重复: ${batchResult.duplicateCount}`);
  console.log(`  无效: ${batchResult.invalidCount}`);
  console.log(`  坏行: ${batchResult.badRows.length}`);

  return batchResult;
}

function getResult(resultId) {
  return store.getResult(resultId);
}

function getBatch(batchId) {
  return store.getBatch(batchId);
}

function submitForReview(resultId, reviewer, comment) {
  return store.createReview(resultId, reviewer, comment);
}

function processReview(reviewId, decision, decisionReason, reviewer) {
  return store.processReview(reviewId, decision, decisionReason, reviewer);
}

function getReview(reviewId) {
  return store.getReview(reviewId);
}

function listPendingReviews(page, pageSize) {
  return store.listPendingReviews(page, pageSize);
}

function generateResultFile(batchId, format = 'json') {
  const batch = store.getBatch(batchId);
  if (!batch) {
    throw new Error(`批次不存在: ${batchId}`);
  }

  if (format === 'csv') {
    return generateCsvReport(batch);
  }

  return JSON.stringify(batch.toJSON(), null, 2);
}

function generateCsvReport(batch) {
  const headers = [
    '序号', '业务键', '结果编码', '结果标签', '原因',
    '体细胞数', '是否需复核', '复核状态', '命中规则数',
    '牛只ID', '批次号', '采样日期', '处理时间'
  ];

  const rows = [headers.join(',')];

  batch.results.forEach((result, index) => {
    const row = [
      index + 1,
      result.businessKey || '',
      result.resultCode || '',
      result.getResultLabel ? result.getResultLabel() : '',
      (result.reason || '').replace(/,/g, '，'),
      result.sccValue || 0,
      result.needReview ? '是' : '否',
      result.reviewStatus || '',
      (result.ruleHits || []).length,
      (result.masterDataSnapshot && result.masterDataSnapshot.cowId) || '',
      (result.masterDataSnapshot && result.masterDataSnapshot.batchNo) || '',
      (result.masterDataSnapshot && result.masterDataSnapshot.sampleDate) || '',
      result.processedAt || ''
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

function generateBadRowsFile(batchId, format = 'json') {
  const batch = store.getBatch(batchId);
  if (!batch) {
    throw new Error(`批次不存在: ${batchId}`);
  }

  if (format === 'csv') {
    const headers = ['行号', '错误信息', '原始数据'];
    const rows = [headers.join(',')];
    batch.badRows.forEach(br => {
      rows.push([
        br.rowIndex,
        (br.error || '').replace(/,/g, '，'),
        JSON.stringify(br.rowData || '').replace(/,/g, '，')
      ].join(','));
    });
    return rows.join('\n');
  }

  return JSON.stringify(batch.badRows, null, 2);
}

module.exports = {
  detectSingle,
  detectBatch,
  getResult,
  getBatch,
  submitForReview,
  processReview,
  getReview,
  listPendingReviews,
  generateResultFile,
  generateBadRowsFile
};
