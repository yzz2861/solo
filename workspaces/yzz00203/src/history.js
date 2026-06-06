const fs = require('fs');
const path = require('path');
const { generateRecordId, formatDate } = require('./utils');

function loadSnapshot(snapshotPath) {
  if (!snapshotPath || !fs.existsSync(snapshotPath)) {
    return {
      version: '1.0',
      generatedAt: null,
      batches: [],
      records: {}
    };
  }

  try {
    const raw = fs.readFileSync(snapshotPath, 'utf-8');
    const snapshot = JSON.parse(raw);
    return {
      version: snapshot.version || '1.0',
      generatedAt: snapshot.generatedAt || null,
      batches: snapshot.batches || [],
      records: snapshot.records || {}
    };
  } catch (err) {
    throw new Error(`历史快照文件解析失败: ${err.message}`);
  }
}

function buildRecordKey(record, dedupeFields) {
  if (dedupeFields && dedupeFields.length > 0) {
    const values = dedupeFields.map(f => String(record[f] || '')).join('|');
    return `dedupe:${values}`;
  }
  return generateRecordId(record, 'source');
}

function checkDuplicate(recordKey, snapshot) {
  const existing = snapshot.records[recordKey];
  if (!existing) {
    return { isDuplicate: false, history: [] };
  }
  return {
    isDuplicate: true,
    history: existing.batches || []
  };
}

function addToSnapshot(snapshot, batchId, batchInfo, results, dedupeFields) {
  const batchRecord = {
    batchId,
    sourceFile: batchInfo.sourceFile,
    processedAt: formatDate(),
    recordCount: results.length,
    normalCount: results.filter(r => r.status === 'normal').length,
    abnormalCount: results.filter(r => r.status === 'abnormal').length,
    pendingCount: results.filter(r => r.status === 'pending').length
  };

  snapshot.batches.push(batchRecord);

  for (const result of results) {
    const recordKey = buildRecordKey(result.record, dedupeFields);
    if (!snapshot.records[recordKey]) {
      snapshot.records[recordKey] = {
        recordKey,
        recordId: result.recordId,
        firstBatch: batchId,
        firstProcessedAt: formatDate(),
        batches: []
      };
    }
    snapshot.records[recordKey].batches.push({
      batchId,
      status: result.status,
      totalScore: result.scoreResult.totalScore,
      rawTotalScore: result.scoreResult.rawTotalScore,
      reason: result.reason,
      sourceRow: result.sourceRow,
      processedAt: formatDate()
    });
  }

  snapshot.generatedAt = formatDate();
  return snapshot;
}

function saveSnapshot(snapshot, snapshotPath) {
  const dir = path.dirname(snapshotPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

function getRecordHistory(recordKey, snapshot) {
  const record = snapshot.records[recordKey];
  if (!record) return [];
  return record.batches.map(b => ({
    batchId: b.batchId,
    status: b.status,
    totalScore: b.totalScore,
    processedAt: b.processedAt
  }));
}

module.exports = {
  loadSnapshot,
  buildRecordKey,
  checkDuplicate,
  addToSnapshot,
  saveSnapshot,
  getRecordHistory
};
