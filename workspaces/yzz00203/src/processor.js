const path = require('path');
const {
  generateBatchId,
  generateRecordId,
  ensureDir,
  getSourceName,
  formatDate
} = require('./utils');
const {
  loadRules,
  validateRequiredFields,
  calculateScore,
  determineStatus,
  RULE_STATUS
} = require('./rules');
const {
  parseCsvFile,
  writeCsvFile,
  flattenRecord,
  getOutputColumns
} = require('./csv');
const {
  loadSnapshot,
  buildRecordKey,
  checkDuplicate,
  addToSnapshot,
  saveSnapshot
} = require('./history');

function processRecords(options) {
  const {
    inputCsv,
    rulesFile,
    outputDir,
    snapshotFile,
    dedupeFields = []
  } = options;

  ensureDir(outputDir);

  const batchId = generateBatchId();
  const sourceName = getSourceName(inputCsv);
  const rules = loadRules(rulesFile);
  const snapshot = loadSnapshot(snapshotFile);
  const rawRecords = parseCsvFile(inputCsv);

  const results = [];
  const currentBatchKeys = new Set();

  for (const raw of rawRecords) {
    const record = raw.data;
    const sourceRow = raw.sourceRow;
    const recordId = generateRecordId(record, sourceName);
    const recordKey = buildRecordKey(record, dedupeFields);

    const { isDuplicate: isHistoryDuplicate, history } = checkDuplicate(recordKey, snapshot);
    const isCurrentBatchDuplicate = currentBatchKeys.has(recordKey);
    const isDuplicate = isHistoryDuplicate || isCurrentBatchDuplicate;

    const duplicateType = isHistoryDuplicate ? '历史批次' : '当前批次';

    const missingFields = validateRequiredFields(record, rules);
    const scoreResult = calculateScore(record, rules);
    const { status, reason } = determineStatus(scoreResult, missingFields, isDuplicate);

    const finalReason = isDuplicate
      ? `重复记录（${duplicateType}），已处理过`
      : reason;

    results.push({
      batchId,
      sourceFile: sourceName,
      sourceRow,
      recordId,
      recordKey,
      record,
      status,
      reason: finalReason,
      scoreResult,
      isDuplicate,
      duplicateType: isDuplicate ? duplicateType : null,
      history
    });

    currentBatchKeys.add(recordKey);
  }

  const normalRecords = results.filter(r => r.status === RULE_STATUS.NORMAL);
  const abnormalRecords = results.filter(r => r.status === RULE_STATUS.ABNORMAL);
  const pendingRecords = results.filter(r => r.status === RULE_STATUS.PENDING);

  const columns = getOutputColumns(results, rules);

  const normalPath = path.join(outputDir, `${batchId}_normal.csv`);
  const abnormalPath = path.join(outputDir, `${batchId}_abnormal.csv`);
  const pendingPath = path.join(outputDir, `${batchId}_pending.csv`);

  if (normalRecords.length > 0) {
    writeCsvFile(normalPath, normalRecords.map(r => flattenRecord(r, rules)), columns);
  }
  if (abnormalRecords.length > 0) {
    writeCsvFile(abnormalPath, abnormalRecords.map(r => flattenRecord(r, rules)), columns);
  }
  if (pendingRecords.length > 0) {
    writeCsvFile(pendingPath, pendingRecords.map(r => flattenRecord(r, rules)), columns);
  }

  const updatedSnapshot = addToSnapshot(snapshot, batchId, { sourceFile: sourceName }, results, dedupeFields);
  if (snapshotFile) {
    saveSnapshot(updatedSnapshot, snapshotFile);
  }

  const summary = {
    batchId,
    processedAt: formatDate(),
    sourceFile: inputCsv,
    totalCount: results.length,
    normalCount: normalRecords.length,
    abnormalCount: abnormalRecords.length,
    pendingCount: pendingRecords.length,
    outputFiles: {
      normal: normalRecords.length > 0 ? normalPath : null,
      abnormal: abnormalRecords.length > 0 ? abnormalPath : null,
      pending: pendingRecords.length > 0 ? pendingPath : null
    },
    snapshotFile: snapshotFile || null
  };

  return {
    summary,
    results,
    snapshot: updatedSnapshot
  };
}

module.exports = {
  processRecords,
  RULE_STATUS
};
