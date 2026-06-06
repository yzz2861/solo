const { v4: uuidv4 } = require('uuid');
const { RULE_VERSION } = require('../config/constants');

const batchStore = new Map();
const auditLogs = [];
const itemStore = new Map();

function generateTraceId(prefix = 'FP') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().substring(0, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function checkBatchExists(batchNo) {
  return batchStore.has(batchNo);
}

function getBatchResult(batchNo) {
  const batch = batchStore.get(batchNo);
  if (!batch) return null;

  return {
    batchNo: batch.batchNo,
    ruleVersion: batch.ruleVersion,
    operator: batch.operator,
    sourceChannel: batch.sourceChannel,
    action: batch.action,
    reviewOpinion: batch.reviewOpinion,
    processTime: batch.processTime,
    traceId: batch.traceId,
    items: batch.items,
    isDuplicate: true,
    duplicateHint: `批次 ${batchNo} 已存在，返回首次处理结果`
  };
}

function saveBatchResult(batchNo, operator, sourceChannel, action, reviewOpinion, itemResults) {
  const traceId = generateTraceId('BATCH');
  const processTime = new Date().toISOString();

  const enrichedItems = itemResults.map(item => {
    const itemTraceId = generateTraceId('ITEM');
    const enriched = {
      ...item,
      traceId: itemTraceId,
      processTime: processTime
    };

    itemStore.set(item.itemId, {
      ...enriched,
      batchNo: batchNo,
      history: []
    });

    return enriched;
  });

  const batchRecord = {
    batchNo,
    ruleVersion: RULE_VERSION,
    operator,
    sourceChannel,
    action,
    reviewOpinion,
    processTime,
    traceId,
    items: enrichedItems,
    itemCount: enrichedItems.length
  };

  batchStore.set(batchNo, batchRecord);

  addAuditLog({
    operationType: 'BATCH_PROCESS',
    batchNo,
    operator,
    sourceChannel,
    action,
    traceId,
    itemCount: enrichedItems.length,
    ruleVersion: RULE_VERSION,
    timestamp: processTime
  });

  return {
    batchNo,
    ruleVersion: RULE_VERSION,
    operator,
    sourceChannel,
    action,
    reviewOpinion: reviewOpinion || null,
    processTime,
    traceId,
    itemCount: enrichedItems.length,
    items: enrichedItems,
    isDuplicate: false
  };
}

function addAuditLog(logEntry) {
  const auditId = generateTraceId('AUDIT');
  const fullEntry = {
    auditId,
    ...logEntry,
    timestamp: logEntry.timestamp || new Date().toISOString()
  };
  auditLogs.push(fullEntry);
  return fullEntry;
}

function getItemRecord(itemId) {
  return itemStore.get(itemId) || null;
}

function updateItemStatus(itemId, newStatus, operator, reason) {
  const item = itemStore.get(itemId);
  if (!item) return null;

  const historyEntry = {
    oldStatus: item.status,
    newStatus,
    operator,
    reason,
    timestamp: new Date().toISOString()
  };

  item.history.push(historyEntry);
  item.status = newStatus;
  item.lastUpdateTime = new Date().toISOString();

  addAuditLog({
    operationType: 'ITEM_STATUS_UPDATE',
    itemId,
    oldStatus: historyEntry.oldStatus,
    newStatus: historyEntry.newStatus,
    operator,
    reason,
    traceId: item.traceId,
    ruleVersion: item.ruleVersion || RULE_VERSION,
    timestamp: historyEntry.timestamp
  });

  return item;
}

function getAuditLogs(filter = {}) {
  let results = [...auditLogs];

  if (filter.batchNo) {
    results = results.filter(log => log.batchNo === filter.batchNo);
  }
  if (filter.operator) {
    results = results.filter(log => log.operator === filter.operator);
  }
  if (filter.operationType) {
    results = results.filter(log => log.operationType === filter.operationType);
  }

  return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getBatchCount() {
  return batchStore.size;
}

function getItemCount() {
  return itemStore.size;
}

function getAuditCount() {
  return auditLogs.length;
}

module.exports = {
  generateTraceId,
  checkBatchExists,
  getBatchResult,
  saveBatchResult,
  addAuditLog,
  getItemRecord,
  updateItemStatus,
  getAuditLogs,
  getBatchCount,
  getItemCount,
  getAuditCount
};
